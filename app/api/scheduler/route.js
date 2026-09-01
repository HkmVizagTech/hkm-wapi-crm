export const dynamic  = "force-dynamic";
export const maxDuration = 300;
import { NextResponse }  from "next/server";
import { connectDB }     from "@/lib/mongodb";
import Campaign          from "@/models/Campaign";

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
  return { ok: d.status==="submitted", wamid: d.messageId||"", error: d.message||"" };
}

export async function GET() {
  await connectDB();
  const queued    = await Campaign.countDocuments({ status:"queued" });
  const scheduled = await Campaign.countDocuments({ status:"scheduled" });
  const running   = await Campaign.countDocuments({ status:"running" });
  return NextResponse.json({ queued, scheduled, running });
}

export async function POST() {
  await connectDB();
  const now = new Date();
  const campaign = await Campaign.findOne({
    $or:[
      { status:"queued" },
      { status:"scheduled", scheduledAt:{ $lte:now } },
    ]
  }).sort({ createdAt:1 });

  if (!campaign) return NextResponse.json({ message:"No campaigns to process" });

  await Campaign.findByIdAndUpdate(campaign._id, { status:"running" });

  let headerFormat = campaign.headerFormat;
  if (!headerFormat && campaign.mediaUrl) {
    const u = campaign.mediaUrl.toLowerCase();
    if (u.match(/\.(jpg|jpeg|png|gif|webp)/)) headerFormat = "IMAGE";
    else if (u.match(/\.(mp4|mov|avi)/))       headerFormat = "VIDEO";
    else if (u.match(/\.(pdf|doc|docx)/))       headerFormat = "DOCUMENT";
    else headerFormat = "IMAGE";
  }

  const isGupshup = campaign.provider === "gupshup";
  const contacts  = campaign.results || [];
  let sent=0, failed=0;

  for (let i=0; i<contacts.length; i++) {
    if (i % 50 === 0) {
      const fresh = await Campaign.findById(campaign._id).select("status").lean();
      if (fresh?.status === "stopped") break;
    }
    const c = contacts[i];
    if (c.status !== "pending") continue;

    const params = (c.params?.filter(v=>v).length ? c.params : null)
                || campaign.defaultParams || [];

    const result = isGupshup
      ? await sendGupshup(c.phone, campaign.templateName, params, campaign.mediaUrl, headerFormat).catch(e=>({ok:false,wamid:"",error:e.message}))
      : await sendFlaxxa(c.phone, campaign.templateName, campaign.templateLang, params, campaign.mediaUrl, headerFormat).catch(e=>({ok:false,wamid:"",error:e.message}));

    await Campaign.findByIdAndUpdate(campaign._id, {
      $set:{
        [`results.${i}.status`]: result.ok?"sent":"failed",
        [`results.${i}.wamid`]:  result.wamid,
        [`results.${i}.sentAt`]: new Date(),
        ...(result.ok ? {} : {[`results.${i}.error`]: result.error}),
      },
      $inc:{ sent:result.ok?1:0, failed:result.ok?0:1 },
    });

    if (result.ok) sent++; else failed++;
    if (campaign.delay > 0 && i < contacts.length-1)
      await new Promise(r=>setTimeout(r, campaign.delay));
  }

  await Campaign.findByIdAndUpdate(campaign._id, { status:"done", completedAt:new Date() });
  return NextResponse.json({ ok:true, name:campaign.name, provider:campaign.provider||"flaxxa", sent, failed, total:contacts.length });
}
