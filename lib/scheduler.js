import cron from "node-cron";
import { refreshSiteKnowledge } from "./site-knowledge.js";
import { resolveGupshupTemplate, buildGupshupMessage, gupshupMediaError, isMediaTemplate,
         gupshupParamError, cleanParam } from "./gupshup.js";

let initialized = false;

// How many campaigns may send at the same time. Each one sends 1 message per `delay` ms,
// so with the default 1200ms delay: 5 parallel ≈ 4 msgs/sec ≈ 14,000/hour.
const MAX_PARALLEL = Math.max(1, Number(process.env.CAMPAIGN_CONCURRENCY) || 5);
// A "running" campaign whose heartbeat is older than this is treated as orphaned
// (server restarted / redeployed mid-send) and resumed from its pending contacts.
const STALE_MS = 3 * 60 * 1000;
const active = new Set();   // campaign IDs being sent by THIS process

async function getCampaign() {
  const { default: Campaign } = await import("../models/Campaign.js");
  return Campaign;
}

function normalizePhone(phone) {
  let p = String(phone).trim().replace(/\s+/g,"").replace(/[-().]/g,"");
  if (p.startsWith("+"))  p = p.slice(1);
  if (p.startsWith("00")) p = p.slice(2);
  if (/^[6-9]\d{9}$/.test(p))  p = "91" + p;
  if (/^0[6-9]\d{9}$/.test(p)) p = "91" + p.slice(1);
  return p;
}

async function sendFlaxxa(phone, templateName, templateLang, params, mediaUrl, headerFormat) {
  const components = [];
  if (mediaUrl?.startsWith("http") && headerFormat) {
    const fmt = headerFormat.toUpperCase();
    const p = fmt==="IMAGE"    ? {type:"image",    image:    {link:mediaUrl}}
            : fmt==="DOCUMENT" ? {type:"document", document: {link:mediaUrl,filename:"Document"}}
            : fmt==="VIDEO"    ? {type:"video",    video:    {link:mediaUrl}}
            : null;
    if (p) components.push({type:"header", parameters:[p]});
  }
  if (params?.filter(v=>v).length)
    components.push({type:"body", parameters:params.filter(v=>v).map(v=>({type:"text",text:String(v)}))});

  const r = await fetch("https://wapi.flaxxa.com/api/v1/sendtemplatemessage", {
    method:"POST", headers:{"Content-Type":"application/json"},
    signal: AbortSignal.timeout(20000),   // never let one hung request stall the campaign
    body: JSON.stringify({
      token: process.env.FLAXXA_TOKEN,
      phone: normalizePhone(phone),
      template_name: templateName,
      template_language: templateLang||"en",
      components,
    }),
  });
  const d = await r.json().catch(()=>({}));
  const ok = r.ok && (d?.status==="success"||d?.message_id||d?.message_wamid);
  return { ok, wamid: d?.message_wamid||String(d?.message_id||""), error: d?.message||"" };
}

async function sendGupshup(phone, templateId, params, mediaUrl, headerFormat) {
  // templateId must be Gupshup's template UUID (resolved once per campaign).
  // Media headers go in `message`, not in `template`.
  const template = { id:templateId, params:params||[] };
  const message  = buildGupshupMessage(mediaUrl?.startsWith("http") ? mediaUrl : "", headerFormat);
  const body = new URLSearchParams({
    channel: "whatsapp",
    source:  process.env.GUPSHUP_SOURCE  || "917075176108",
    destination: normalizePhone(phone),
    "src.name": process.env.GUPSHUP_APPNAME || "4KoeJVChI420QyWVhAW1kE7L",
    template: JSON.stringify(template),
    message:  JSON.stringify(message),
  });
  const r = await fetch("https://api.gupshup.io/wa/api/v1/template/msg", {
    method:"POST",
    signal: AbortSignal.timeout(20000),   // never let one hung request stall the campaign
    headers:{ "apikey": process.env.GUPSHUP_APIKEY||"sk_0381bd5a455746478c53899f213f838b",
              "Content-Type":"application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const d = await r.json().catch(()=>({}));
  const ok = d.status === "submitted";
  return { ok, wamid: d.messageId||"", error: d.message||"" };
}

async function executeCampaign(campaignId) {
  const Campaign = await getCampaign();
  // Atomically claim the campaign so two ticks / two containers can never both send it
  const campaign = await Campaign.findOneAndUpdate(
    { _id:campaignId, status:{ $in:["queued","scheduled"] } },
    { $set:{ status:"running", heartbeatAt:new Date() } },
    { new:true }
  ).lean();
  if (!campaign) return;

  const pendingCount = (campaign.results||[]).filter(r=>r.status==="pending").length;
  console.log(`🚀 [${campaign.provider||"flaxxa"}] ${campaign.name} — ${pendingCount}/${campaign.totalContacts} pending`);

  // Auto-detect headerFormat
  let headerFormat = campaign.headerFormat;
  if (!headerFormat && campaign.mediaUrl) {
    const u = campaign.mediaUrl.toLowerCase();
    if (u.match(/\.(jpg|jpeg|png|gif|webp)/)) headerFormat = "IMAGE";
    else if (u.match(/\.(mp4|mov|avi)/))       headerFormat = "VIDEO";
    else if (u.match(/\.(pdf|doc|docx)/))       headerFormat = "DOCUMENT";
    else headerFormat = "IMAGE";
  }

  const contacts  = campaign.results || [];
  const isGupshup = campaign.provider === "gupshup";

  // Gupshup needs the template UUID, not the name shown in the UI
  let gsTemplateId = null, gsSetupError = "", gsTpl = null;
  if (isGupshup) {
    gsTpl = await resolveGupshupTemplate(campaign.templateName).catch(() => null);
    if (!gsTpl) gsSetupError = `Template "${campaign.templateName}" not found in Gupshup app`;
    else {
      gsTemplateId = gsTpl.id;
      // Trust Gupshup's own template type over the URL-based guess above
      if (isMediaTemplate(gsTpl.type)) headerFormat = gsTpl.type;
      gsSetupError = gupshupMediaError(gsTpl, campaign.mediaUrl);
    }
    if (gsSetupError) console.error(`❌ [gupshup] ${campaign.name}: ${gsSetupError} — marking contacts failed`);
  }

  // ── Results are written in batches, not one DB write per message ──
  // One write per FLUSH_EVERY messages (and at least every FLUSH_MS) cuts DB load ~25x.
  // A flush retries until it lands, so a contact that was actually sent is never left
  // "pending" in the DB (which would make it get re-sent after a restart).
  const FLUSH_EVERY = 25, FLUSH_MS = 15000;
  let buf = [], lastFlush = Date.now();
  async function flush() {
    if (!buf.length) return;
    const batch = buf; buf = [];
    const $set = { heartbeatAt:new Date() }, $inc = { sent:0, failed:0 };
    for (const r of batch) {
      $set[`results.${r.i}.status`] = r.ok ? "sent" : "failed";
      $set[`results.${r.i}.wamid`]  = r.wamid || "";
      $set[`results.${r.i}.sentAt`] = r.at;
      if (!r.ok) $set[`results.${r.i}.error`] = r.error || "";
      r.ok ? $inc.sent++ : $inc.failed++;
    }
    for (let attempt = 1; ; attempt++) {
      try {
        await Campaign.updateOne({ _id:campaignId }, { $set, $inc });
        if (attempt > 1) console.log(`💾 ${campaign.name}: saved ${batch.length} results after ${attempt} tries`);
        break;
      } catch (e) {
        const wait = Math.min(30000, 2000 * attempt);
        console.error(`💾 ${campaign.name}: DB write failed (try ${attempt}, retrying in ${wait/1000}s): ${e.message}`);
        await new Promise(r => setTimeout(r, wait));
      }
    }
    lastFlush = Date.now();
  }

  let stopped = false, checked = 0;
  for (let i = 0; i < contacts.length; i++) {
    const c = contacts[i];
    if (c.status !== "pending") continue;

    // Check if stopped every 50 messages (a slow/failed check never blocks sending)
    if (checked++ % 50 === 0) {
      try {
        const fresh = await Campaign.findById(campaignId).select("status").lean().maxTimeMS(10000);
        if (!fresh || fresh.status === "stopped") { stopped = true; break; }
      } catch (e) { /* DB busy — keep sending, check again later */ }
    }

    // Use per-contact params if set, else campaign defaultParams
    const params = (c.params?.filter(v=>v).length ? c.params : null)
                || campaign.defaultParams
                || [];

    let result;
    try {
      result = isGupshup
        ? (gsSetupError
            ? { ok:false, wamid:"", error:gsSetupError }
            : gupshupParamError(gsTpl, params)
              ? { ok:false, wamid:"", error:gupshupParamError(gsTpl, params) }
              : await sendGupshup(c.phone, gsTemplateId,
                  (gsTpl.paramCount ? params.slice(0, gsTpl.paramCount) : params).map(cleanParam),
                  campaign.mediaUrl, headerFormat))
        : await sendFlaxxa(c.phone, campaign.templateName, campaign.templateLang, params, campaign.mediaUrl, headerFormat);
    } catch(e) {
      result = { ok:false, wamid:"", error:e.message };
    }
    buf.push({ i, ...result, at:new Date() });
    if (buf.length >= FLUSH_EVERY || Date.now() - lastFlush >= FLUSH_MS) await flush();

    if (campaign.delay > 0 && i < contacts.length - 1)
      await new Promise(r => setTimeout(r, campaign.delay));
  }
  await flush();

  if (stopped) { console.log(`⏹ Stopped: ${campaign.name}`); return; }
  for (let attempt = 1; ; attempt++) {
    try { await Campaign.updateOne({ _id:campaignId }, { $set:{ status:"done", completedAt:new Date() } }); break; }
    catch (e) { await new Promise(r => setTimeout(r, Math.min(30000, 2000 * attempt))); }
  }
  console.log(`✅ Done: ${campaign.name}`);
}

// One scheduling pass: requeue orphaned campaigns, then start due ones up to MAX_PARALLEL.
async function tick(label="⏰") {
  const Campaign = await getCampaign();
  const now = new Date();

  // Orphaned: marked running but no progress for STALE_MS and not being sent by this process
  const stale = await Campaign.find({
    status:"running",
    $or:[ { heartbeatAt:{ $lt:new Date(now - STALE_MS) } }, { heartbeatAt:{ $exists:false } } ],
  }).select("_id name").lean();
  for (const c of stale) {
    if (active.has(String(c._id))) continue;
    const r = await Campaign.updateOne({ _id:c._id, status:"running" }, { $set:{ status:"queued" } });
    if (r.modifiedCount) console.log(`♻️ Resuming interrupted campaign: ${c.name}`);
  }

  const slots = MAX_PARALLEL - active.size;
  if (slots <= 0) return;
  const due = await Campaign.find({
    $or:[
      { status:"queued" },
      { status:"scheduled", scheduledAt:{ $lte:now } },
    ]
  }).select("_id name").sort({ scheduledAt:1, createdAt:1 }).limit(slots).lean();

  const waiting = await Campaign.countDocuments({
    $or:[ { status:"queued" }, { status:"scheduled", scheduledAt:{ $lte:now } } ],
  });
  if (due.length) console.log(`${label} starting ${due.length} campaign(s) · ${active.size} already sending · ${waiting - due.length} waiting`);

  for (const c of due) {
    const id = String(c._id);
    if (active.has(id)) continue;
    active.add(id);
    executeCampaign(id)
      .catch(e => console.error(`Campaign error (${c.name}):`, e.message))
      .finally(() => active.delete(id));
  }
}

export async function initScheduler() {
  if (initialized) return;
  initialized = true;
  console.log("⏰ Scheduler started");

  cron.schedule("* * * * *", () => {
    tick().catch(e => console.error("Scheduler error:", e.message));
  });

  // Keep the AI's temple/donation/event knowledge in sync with the live
  // website every 3 hours — see lib/site-knowledge.js. Runs independently of
  // the campaign scheduler above; a failure here never blocks campaigns.
  cron.schedule("0 */3 * * *", () => {
    refreshSiteKnowledge().catch(e => console.error("site-knowledge refresh error:", e.message));
  });

  // On startup — catch missed campaigns, and warm the site-knowledge cache
  // so the very first WhatsApp reply after a deploy already has live data.
  // (Same concurrency limit as the cron; interrupted campaigns resume once their heartbeat goes stale.)
  try { await tick("⚠️ startup:"); }
  catch(e) { console.error("Startup check failed:", e.message); }

  refreshSiteKnowledge().catch(e => console.error("site-knowledge initial fetch error:", e.message));
}
