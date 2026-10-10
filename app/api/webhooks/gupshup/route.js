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
g.__gsStatusQ  ||= makeQueue("status-update", 4, 30000);
g.__gsInboundQ ||= makeQueue("inbound-message", 4, 5000);
g.__gsSeen     ||= new Set();
const statusQ = g.__gsStatusQ, inboundQ = g.__gsInboundQ, seen = g.__gsSeen;
const queueStats = () => ({ status:statusQ.stats(), inbound:inboundQ.stats() });

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
      if (!seen.has(key)) {
        if (seen.size > 100000) seen.clear();
        seen.add(key);
        statusQ.push(() => handleStatusEvent(payload, ids, status, 0)
          .catch(e => { seen.delete(key); throw e; }));   // failed → let Gupshup's retry through
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

/* ── Message status event ── */
// Gupshup sends its own message ID in `id` for enqueued/failed events, but the
// WhatsApp ID in `id` (and its own ID in `gsId`) for sent/delivered/read.
// We store Gupshup's ID at send time, so match on both.
const RETRY_DELAYS = [20000, 60000, 180000];
async function handleStatusEvent(payload, ids, status, attempt) {
  const reason = status==="failed"
    ? [payload.payload?.code, payload.payload?.reason].filter(Boolean).join(" — ") || "Failed (no reason given)"
    : "";
  // Recipient-side failures (not on WhatsApp, opted out, per-user limits) are normal in bulk
  // sends — log them quietly; anything else is a real problem and stays red.
  if (status==="failed" && attempt===0) {
    const code = String(payload.payload?.code || "");
    if (["131026","131049","131050","130472"].includes(code)) console.log(`⚠️ Undelivered (${code}) ${ids[0]}`);
    else console.error(`❌ Gupshup delivery failed ${ids.join("/")}: ${reason}`);
  }

  await connectDB();
  const m = await Message.updateOne({ wamid:{ $in:ids } }, { $set:{ status } });
  if (status === "sent") return;

  // Update campaign metrics with single atomic, indexed updates (results.wamid index).
  // Never loads the campaign document — matters when 25k status events arrive at once.
  const at = st => ({ results:{ $elemMatch:{ wamid:{ $in:ids }, status:st } } });
  const upd = (st, $set, $inc) => Campaign.updateOne(at(st), { $set, $inc });
  let r = { modifiedCount:0 };
  if (status==="delivered") {
    r = await upd("sent", { "results.$.status":"delivered" }, { delivered:1 });
  } else if (status==="read") {
    r = await upd("sent", { "results.$.status":"read" }, { read:1, delivered:1 });
    if (!r.modifiedCount) r = await upd("delivered", { "results.$.status":"read" }, { read:1 });
  } else if (status==="failed") {
    r = await upd("sent", { "results.$.status":"failed", "results.$.error":reason }, { failed:1, sent:-1 });
    if (!r.modifiedCount) r = await upd("pending", { "results.$.status":"failed", "results.$.error":reason }, { failed:1 });
  }

  // The sender saves results in batches, so an event can arrive before its message ID
  // is in the DB. Nothing matched → try again a little later (up to 3 times).
  if (!m.matchedCount && !r.modifiedCount && attempt < RETRY_DELAYS.length) {
    setTimeout(() => statusQ.push(() => handleStatusEvent(payload, ids, status, attempt + 1)),
               RETRY_DELAYS[attempt]);
  }
}
