import cron from "node-cron";

let initialized = false;

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

async function sendGupshup(phone, templateName, params, mediaUrl, headerFormat) {
  const template = { id:templateName, params:params||[] };
  if (mediaUrl?.startsWith("http") && headerFormat) {
    const fmt = headerFormat.toUpperCase();
    if (fmt==="IMAGE")    template.header = { type:"IMAGE",    link:mediaUrl };
    if (fmt==="VIDEO")    template.header = { type:"VIDEO",    link:mediaUrl };
    if (fmt==="DOCUMENT") template.header = { type:"DOCUMENT", link:mediaUrl };
  }
  const body = new URLSearchParams({
    channel: "whatsapp",
    source:  process.env.GUPSHUP_SOURCE  || "917075176108",
    destination: normalizePhone(phone),
    "src.name": process.env.GUPSHUP_APPNAME || "4KoeJVChI420QyWVhAW1kE7L",
    template: JSON.stringify(template),
    message:  JSON.stringify({ type:"text", text:"Hare Krishna" }),
  });
  const r = await fetch("https://api.gupshup.io/wa/api/v1/template/msg", {
    method:"POST",
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
  const campaign  = await Campaign.findById(campaignId).lean();
  if (!campaign) return;
  if (!["queued","scheduled"].includes(campaign.status)) return;

  console.log(`🚀 [${campaign.provider||"flaxxa"}] ${campaign.name} — ${campaign.totalContacts} contacts`);
  await Campaign.findByIdAndUpdate(campaignId, { status:"running" });

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

  for (let i = 0; i < contacts.length; i++) {
    // Check if stopped every 50 messages
    if (i % 50 === 0) {
      const fresh = await Campaign.findById(campaignId).select("status").lean();
      if (!fresh || fresh.status === "stopped") break;
    }

    const c = contacts[i];
    if (c.status !== "pending") continue;

    // Use per-contact params if set, else campaign defaultParams
    const params = (c.params?.filter(v=>v).length ? c.params : null)
                || campaign.defaultParams
                || [];

    try {
      const result = isGupshup
        ? await sendGupshup(c.phone, campaign.templateName, params, campaign.mediaUrl, headerFormat)
        : await sendFlaxxa(c.phone, campaign.templateName, campaign.templateLang, params, campaign.mediaUrl, headerFormat);

      await Campaign.findByIdAndUpdate(campaignId, {
        $set:{
          [`results.${i}.status`]: result.ok ? "sent" : "failed",
          [`results.${i}.wamid`]:  result.wamid,
          [`results.${i}.sentAt`]: new Date(),
          ...(result.ok ? {} : {[`results.${i}.error`]: result.error}),
        },
        $inc:{ sent: result.ok?1:0, failed: result.ok?0:1 },
      });
    } catch(e) {
      await Campaign.findByIdAndUpdate(campaignId, {
        $set:{ [`results.${i}.status`]:"failed", [`results.${i}.error`]:e.message },
        $inc:{ failed:1 },
      }).catch(()=>{});
    }

    if (campaign.delay > 0 && i < contacts.length - 1)
      await new Promise(r => setTimeout(r, campaign.delay));
  }

  await Campaign.findByIdAndUpdate(campaignId, { status:"done", completedAt:new Date() });
  console.log(`✅ Done: ${campaign.name}`);
}

export async function initScheduler() {
  if (initialized) return;
  initialized = true;
  console.log("⏰ Scheduler started");

  cron.schedule("* * * * *", async () => {
    try {
      const Campaign = await getCampaign();
      const now = new Date();
      const due = await Campaign.find({
        $or:[
          { status:"queued" },
          { status:"scheduled", scheduledAt:{ $lte:now } },
        ]
      }).limit(5);

      if (due.length > 0) {
        console.log(`⏰ ${due.length} campaign(s) due`);
        for (const c of due)
          executeCampaign(c._id.toString()).catch(e=>console.error(`Campaign error:`,e.message));
      }
    } catch(e) { console.error("Scheduler error:", e.message); }
  });

  // On startup — catch missed campaigns
  try {
    const Campaign = await getCampaign();
    const missed = await Campaign.find({
      $or:[
        { status:"queued" },
        { status:"scheduled", scheduledAt:{ $lte:new Date() } },
      ]
    });
    if (missed.length > 0) {
      console.log(`⚠️ ${missed.length} missed campaign(s) — running now`);
      for (const c of missed)
        executeCampaign(c._id.toString()).catch(e=>console.error(`Missed:`,e.message));
    }
  } catch(e) { console.error("Startup check failed:", e.message); }
}
