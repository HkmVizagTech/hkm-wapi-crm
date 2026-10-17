export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { connectDB }    from "@/lib/mongodb";
import Message          from "@/models/Message";
import Contact          from "@/models/Contact";
import Conversation     from "@/models/Conversation";
import Campaign         from "@/models/Campaign";
import { processWithGemini } from "@/lib/gemini";
import { executeAction }     from "@/lib/ai-actions";
import { sendGupshupText }   from "@/lib/gupshup";
import { BUILD_VERSION }     from "@/lib/version";
import { isAiReplyOn }       from "@/lib/ai-switch";
import { persistInboundMedia } from "@/lib/inbound-media";

export async function GET() {
  return NextResponse.json({ status:"Gupshup webhook active", queues:queueStats() });
}

/* ───────────────────────────────────────────────────────────────────────────
   Gupshup is answered IMMEDIATELY; the database work runs in the background in
   small bounded queues. Before this, every status event (3–4 per campaign message)
   held a DB connection while Gupshup waited. When the database slowed down, those
   piled up by the thousand in front of the campaign sender, sending stalled, and
   Gupshup kept re-sending the same events because we answered too slowly.
   ─────────────────────────────────────────────────────────────────────────── */
function makeQueue(name, concurrency, maxSize) {
  const q = []; let running = 0, dropped = 0;
  const pump = () => {
    while (running < concurrency && q.length) {
      const job = q.shift(); running++;
      Promise.resolve().then(job)
        .catch(e => console.error(`${name} error:`, e.message))
        .finally(() => { running--; pump(); });
    }
  };
  return {
    push(job) {
      if (q.length >= maxSize) {
        if (dropped++ % 500 === 0) console.warn(`⚠️ ${name} queue full (${maxSize}) — dropped ${dropped} so far`);
        return false;
      }
      q.push(job); pump(); return true;
    },
    stats: () => ({ waiting:q.length, running, dropped }),
  };
}
const g = globalThis;
g.__gsInboundQ ||= makeQueue("inbound-message", 4, 5000);
g.__gsSeen     ||= new Set();
g.__gsStatus   ||= { pending:[], busy:false, dropped:0, applied:0,
                     tally:{ delivered:0, read:0, failed:0, codes:{} } };
const inboundQ = g.__gsInboundQ, seen = g.__gsSeen, ST = g.__gsStatus;
const queueStats = () => ({ status:{ waiting:ST.pending.length, applied:ST.applied, dropped:ST.dropped },
                            inbound:inboundQ.stats() });

export async function POST(req) {
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ ok:true }); }
  const type    = body?.type;              // "message" | "message-event"
  const payload = body?.payload;
  if (!payload) return NextResponse.json({ ok:true });

  if (type === "message-event") {
    const ids    = [payload.id, payload.gsId].filter(Boolean);
    const status = { sent:"sent", delivered:"delivered", read:"read", failed:"failed" }[payload.type];
    if (status && ids.length) {
      // Gupshup re-delivers the same event when we were slow — handle each one once
      const key = `${ids[0]}:${status}`;
      if (status !== "sent" && !seen.has(key)) {   // "sent" changes nothing we track
        if (seen.size > 200000) seen.clear();
        seen.add(key);
        if (!queueStatus(payload, ids, status)) seen.delete(key);
      }
    }
    return NextResponse.json({ ok:true });
  }

  if (type === "message") {
    inboundQ.push(() => handleInbound(payload));
    return NextResponse.json({ ok:true });
  }

  return NextResponse.json({ ok:true });
}

/* ── Incoming message ── */
async function handleInbound(payload) {
  const dbg = {};
  await connectDB();
  const phone       = payload.source;                    // sender number
  const contactName = payload.sender?.name || phone;
  const wamid       = payload.id;
  const msgType     = payload.type;                      // text|image|file etc

  let bodyText="", mediaUrl="", mimeType="";
  switch(msgType) {
    case "text":
      bodyText = payload.payload?.text || "";
      break;
    case "image":
      mediaUrl = payload.payload?.url || "";
      bodyText = payload.payload?.caption || "📷 Photo";
      mimeType = "image/jpeg";
      break;
    case "file":
    case "document":
      mediaUrl = payload.payload?.url || "";
      bodyText = payload.payload?.name || "📄 Document";
      break;
    case "audio":
    case "voice":
      mediaUrl = payload.payload?.url || "";
      bodyText = "🎵 Voice message";
      break;
    case "video":
      mediaUrl = payload.payload?.url || "";
      bodyText = payload.payload?.caption || "🎥 Video";
      break;
    case "sticker":
      mediaUrl = payload.payload?.url || "";
      bodyText = "🎉 Sticker";
      mimeType = "image/webp";
      break;
    case "reaction": {
      const p = payload.payload || {};
      const emoji = p.emoji || p.reaction?.emoji || p.text || "";
      bodyText = emoji ? `${emoji} Reacted to a message` : "Removed a reaction";
      break;
    }
    case "location":
      bodyText = `📍 Location: ${payload.payload?.latitude}, ${payload.payload?.longitude}`;
      break;
    default:
      bodyText = `[${msgType}]`;
  }

  await Message.findOneAndUpdate(
    { wamid },
    { $setOnInsert:{
      contactPhone: phone, contactName,
      direction:"inbound", type:msgType, body:bodyText,
      mediaUrl, mimeType, status:"received", wamid,
      provider:"gupshup", sentAt:new Date(),
    }},
    { upsert:true }
  );
  dbg.stored = true;

  // The provider's media link expires within ~1-2 days — copy the file to permanent storage
  // in the background and swap the URL on the message once it's saved.
  if (mediaUrl) {
    persistInboundMedia({ url:mediaUrl, mimeType, provider:"gupshup",
                          filename: msgType==="file"||msgType==="document" ? bodyText : "" })
      .then(u => u && Message.updateOne({ wamid }, { $set:{ mediaUrl:u } }))
      .catch(() => {});
  }

  const contact = await Contact.findOneAndUpdate(
    { phone },
    { $set:{ lastMessageAt:new Date(), name:contactName },
      $setOnInsert:{ phone, addedAt:new Date() } },
    { upsert:true, new:true }
  );
  dbg.contact = true;

  // Sync Conversation
  await Conversation.findOneAndUpdate(
    { phone },
    { $set:{ name:contactName, lastMessageAt:new Date(),
        lastMessageText:bodyText.slice(0,100), lastMessageDir:"inbound",
        status:"open", provider:"gupshup" },
      $inc:{ unreadCount:1 },
      $setOnInsert:{ phone, createdAt:new Date(), aiMode:"auto" } },
    { upsert:true }
  );
  dbg.conversation = true;

  // AI auto-reply / draft
  const aiMode = contact?.aiMode || "auto";
  // isAiReplyOn() = AI_ENABLED + GEMINI_API_KEY in env AND not paused from the dashboard
  const aiActive = msgType==="text" && !contact?.doNotContact && await isAiReplyOn();
  await Message.updateOne(
    { wamid },
    { $set:{ meta:{
      aiMode, aiActive,
      env:{ geminiKey:!!process.env.GEMINI_API_KEY, aiEnabled:process.env.AI_ENABLED, model:process.env.GEMINI_MODEL },
      msgType, doNotContact:!!contact?.doNotContact,
      build:BUILD_VERSION,
    }}}
  );
  dbg.meta = true;
  dbg.aiMode = aiMode;
  dbg.aiActive = aiActive;
  dbg.env = { geminiKey:!!process.env.GEMINI_API_KEY, aiEnabled:process.env.AI_ENABLED, model:process.env.GEMINI_MODEL };
  dbg.build = BUILD_VERSION;
  if (aiActive && (aiMode==="auto" || aiMode==="draft")) {
    try {
      // Idempotency guard: claim the AI slot atomically so webhook
      // re-deliveries (retries from the provider while we're doing the slow
      // Gemini→Groq pipeline) don't run the AI twice and send duplicate replies.
      const claim = await Message.findOneAndUpdate(
        { wamid, aiRepliedAt: { $exists:false } },
        { $set:{ aiRepliedAt:new Date() } },
        { new:true }
      );
      if (!claim) return;

      const history = await Message.find({ contactPhone:phone }).sort({ sentAt:-1 }).limit(6).lean();
      history.reverse();
      const { reply, action } = await processWithGemini(phone, contactName, bodyText, history);
      if (action) await executeAction(action, { phone, contactName, message:bodyText, provider:"gupshup" });
      let finalReply = reply;
      if (action === "register_interest") {
        if (!finalReply) finalReply = `Hare Krishna 🙏 You can donate here: https://harekrishnavizag.org/donate`;
        else if (!finalReply.includes("harekrishnavizag.org/donate")) finalReply += `\n\nDonate here: https://harekrishnavizag.org/donate`;
      }
      if (finalReply) {
        if (aiMode === "auto") {
          const sent = await sendGupshupText(phone, finalReply);
          await Message.create({
            contactPhone:phone, contactName, direction:"outbound",
            type:"text", body:finalReply, status: sent.ok ? "sent" : "failed",
            sentAt:new Date(), isAiGenerated:true, provider:"gupshup",
            wamid:sent.wamid||"",
          });
        } else {
          // Draft mode — save AI suggestion, staff approves/sends in inbox
          await Message.create({
            contactPhone:phone, contactName, direction:"outbound",
            type:"text", body:finalReply, status:"draft",
            sentAt:new Date(), isAiGenerated:true, provider:"gupshup",
          });
          console.log("✏️ AI draft saved for:", phone);
        }
      }
    } catch(aiErr) {
      console.error(`🤖 AI pipeline error for ${phone}:`, aiErr.message);
      await Message.create({
        contactPhone:phone, contactName, direction:"outbound",
        type:"text", body:"[AI pipeline error]", status:"failed",
        sentAt:new Date(), isAiGenerated:true, provider:"gupshup",
        meta:{ aiError:aiErr.message },
      });
    }
  }
}

/* ── Message status events — applied in BATCHES ──────────────────────────────
   A bulk send produces 3–4 status events per message (100+ per second). Updating the
   campaign once per event rewrote a ~1 MB campaign document every time, which the
   free MongoDB tier could not keep up with. Now events are collected and applied
   every 2 seconds: one update per status type per batch, whatever the batch size.
   Events are held 30 s first, so the sender has saved the message ID they refer to.
   ─────────────────────────────────────────────────────────────────────────── */
const HOLD_MS = 30000, TICK_MS = 2000, BATCH = 3000, MAX_PENDING = 200000;
const QUIET_CODES = ["131026","131049","131050","130472"];   // recipient-side, normal in bulk

function queueStatus(payload, ids, status) {
  const code   = String(payload.payload?.code || "");
  const reason = status==="failed"
    ? [payload.payload?.code, payload.payload?.reason].filter(Boolean).join(" — ") || "Failed (no reason given)"
    : "";
  ST.tally[status] = (ST.tally[status] || 0) + 1;
  if (status==="failed") {
    if (QUIET_CODES.includes(code)) ST.tally.codes[code] = (ST.tally.codes[code] || 0) + 1;
    else console.error(`❌ Gupshup delivery failed ${ids.join("/")}: ${reason}`);
  }
  if (ST.pending.length >= MAX_PENDING) {
    if (ST.dropped++ % 1000 === 0) console.warn(`⚠️ status backlog full (${MAX_PENDING}) — dropped ${ST.dropped}`);
    return false;
  }
  ST.pending.push({ at:Date.now(), ids, status, reason });
  return true;
}

// Timers live on globalThis so a module reload never starts a second copy
if (!g.__gsStatusTimer) {
  g.__gsStatusTimer = setInterval(() => {
    flushStatuses().catch(e => console.error("status batch error (will retry):", e.message));
  }, TICK_MS);
  // One summary line a minute instead of one log line per undelivered message
  g.__gsStatusLog = setInterval(() => {
    const t = ST.tally;
    if (!t.delivered && !t.read && !t.failed && !ST.pending.length) return;
    const codes = Object.entries(t.codes).map(([c,n]) => `${c}×${n}`).join(", ");
    console.log(`📊 Status events (last 60s): delivered ${t.delivered} · read ${t.read} · failed ${t.failed}`
      + (codes ? ` [${codes}]` : "") + ` · backlog ${ST.pending.length}`);
    ST.tally = { delivered:0, read:0, failed:0, codes:{} };
  }, 60000);
}

async function flushStatuses() {
  if (ST.busy || !ST.pending.length) return;
  const cutoff = Date.now() - HOLD_MS;
  let n = 0;
  while (n < ST.pending.length && n < BATCH && ST.pending[n].at <= cutoff) n++;
  if (!n) return;
  const batch = ST.pending.splice(0, n);
  ST.busy = true;
  try {
    await applyStatuses(batch);
    ST.applied += batch.length;
  } catch (e) {
    ST.pending.unshift(...batch);      // keep them; next tick retries
    throw e;
  } finally {
    ST.busy = false;
  }
}

async function applyStatuses(batch) {
  const delivered = new Set(), read = new Set(), failed = new Map(), all = new Set();
  for (const ev of batch) {
    for (const id of ev.ids) all.add(id);
    if (ev.status === "delivered") ev.ids.forEach(i => delivered.add(i));
    else if (ev.status === "read") ev.ids.forEach(i => read.add(i));
    else if (ev.status === "failed") {
      if (!failed.has(ev.reason)) failed.set(ev.reason, new Set());
      ev.ids.forEach(i => failed.get(ev.reason).add(i));
    }
  }
  if (!all.size) return;
  await connectDB();

  // Campaign results: one arrayFilters update per transition (order matters:
  // delivered → read → failed), then recount the totals from the results array.
  const move = (ids, from, to, reason) => ({ updateMany:{
    filter: { "results.wamid":{ $in:ids } },
    update: { $set: reason
      ? { "results.$[r].status":to, "results.$[r].error":reason }
      : { "results.$[r].status":to } },
    arrayFilters: [{ "r.wamid":{ $in:ids }, "r.status":{ $in:from } }],
  }});
  const ops = [];
  if (delivered.size) ops.push(move([...delivered], ["sent"], "delivered"));
  if (read.size)      ops.push(move([...read], ["sent","delivered"], "read"));
  for (const [reason, set] of failed) ops.push(move([...set], ["sent","pending"], "failed", reason));
  const cnt = sts => ({ $size:{ $filter:{ input:"$results", as:"x", cond:{ $in:["$$x.status", sts] } } } });
  ops.push({ updateMany:{
    filter: { "results.wamid":{ $in:[...all] } },
    update: [{ $set:{
      sent:      cnt(["sent","delivered","read"]),
      delivered: cnt(["delivered","read"]),
      read:      cnt(["read"]),
      failed:    cnt(["failed"]),
    }}],
  }});
  await Campaign.collection.bulkWrite(ops, { ordered:true });

  // One-to-one messages (inbox / AI replies)
  const evTime = new Date(Date.now() - HOLD_MS);   // events are held HOLD_MS before being applied
  const mops = [];
  if (delivered.size) mops.push({ updateMany:{ filter:{ wamid:{ $in:[...delivered] }, status:"sent" },
                                               update:{ $set:{ status:"delivered", deliveredAt:evTime } } } });
  if (read.size)      mops.push({ updateMany:{ filter:{ wamid:{ $in:[...read] }, status:{ $in:["sent","delivered"] } },
                                               update:{ $set:{ status:"read", readAt:evTime } } } });
  const fids = [...failed.values()].flatMap(s => [...s]);
  if (fids.length)    mops.push({ updateMany:{ filter:{ wamid:{ $in:fids }, status:{ $in:["sent","delivered"] } },
                                               update:{ $set:{ status:"failed" } } } });
  if (mops.length) await Message.collection.bulkWrite(mops, { ordered:true });
}
