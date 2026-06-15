export const dynamic = "force-dynamic";
export const maxDuration = 300;
import { NextResponse }  from "next/server";
import { connectDB }     from "@/lib/mongodb";
import Campaign          from "@/models/Campaign";

const FLAXXA_TOKEN = process.env.FLAXXA_TOKEN;

function normalizePhone(phone, cc="91") {
  let p = String(phone).trim().replace(/\s+/g,"").replace(/[-().]/g,"");
  if (p.startsWith("+"))  p = p.slice(1);
  if (p.startsWith("00")) p = p.slice(2);
  if (/^[6-9]\d{9}$/.test(p))  p = cc + p;
  if (/^0[6-9]\d{9}$/.test(p)) p = cc + p.slice(1);
  return p;
}

async function sendTemplate(phone, templateName, templateLang, params, mediaUrl, headerFormat) {
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
      token: FLAXXA_TOKEN,
      phone: normalizePhone(phone),
      template_name: templateName,
      template_language: templateLang||"en",
      components,
    }),
  });
  const d = await r.json().catch(()=>({}));
  const ok = r.ok && (d?.status==="success"||d?.message_id||d?.message_wamid);
  return { ok, wamid:d?.message_wamid||String(d?.message_id||""), error:d?.message||"" };
}

// GET: check status
export async function GET() {
  await connectDB();
  const queued    = await Campaign.countDocuments({ status:"queued" });
  const scheduled = await Campaign.countDocuments({ status:"scheduled" });
  const running   = await Campaign.countDocuments({ status:"running" });
  return NextResponse.json({ queued, scheduled, running });
}

// POST: process ONE queued/scheduled campaign
export async function POST() {
  await connectDB();
  const now = new Date();

  // Pick next queued or scheduled-due campaign
  const campaign = await Campaign.findOne({
    $or:[
      { status:"queued" },
      { status:"scheduled", scheduledAt:{ $lte:now } },
    ]
  }).sort({ createdAt:1 });

  if (!campaign) return NextResponse.json({ message:"No campaigns to process" });

  await Campaign.findByIdAndUpdate(campaign._id, { status:"running" });
  console.log(`🚀 Processing: ${campaign.name} (${campaign.totalContacts} contacts)`);

  // Detect headerFormat
  let headerFormat = campaign.headerFormat;
  if (!headerFormat && campaign.mediaUrl) {
    const u = campaign.mediaUrl.toLowerCase();
    if (u.match(/\.(jpg|jpeg|png|gif|webp)/)) headerFormat = "IMAGE";
    else if (u.match(/\.(mp4|mov)/))           headerFormat = "VIDEO";
    else if (u.match(/\.(pdf|doc)/))           headerFormat = "DOCUMENT";
    else headerFormat = "IMAGE";
  }

  const contacts = campaign.results || [];
  let sent=0, failed=0;

  for (let i=0; i<contacts.length; i++) {
    const fresh = await Campaign.findById(campaign._id).select("status").lean();
    if (fresh?.status === "stopped") break;

    const c = contacts[i];
    if (c.status !== "pending") continue;

    const params = (c.params?.filter(v=>v).length ? c.params : null)
                || campaign.defaultParams || [];

    const { ok, wamid, error } = await sendTemplate(
      c.phone, campaign.templateName, campaign.templateLang,
      params, campaign.mediaUrl, headerFormat
    ).catch(e=>({ ok:false, wamid:"", error:e.message }));

    await Campaign.findByIdAndUpdate(campaign._id, {
      $set:{
        [`results.${i}.status`]: ok?"sent":"failed",
        [`results.${i}.wamid`]:  wamid,
        [`results.${i}.sentAt`]: new Date(),
      },
      $inc:{ sent:ok?1:0, failed:ok?0:1 },
    });

    if (ok) sent++; else failed++;
    if (i < contacts.length-1)
      await new Promise(r=>setTimeout(r, campaign.delay||1200));
  }

  await Campaign.findByIdAndUpdate(campaign._id,
    { status:"done", completedAt:new Date() }
  );

  console.log(`✅ Done: ${campaign.name} | sent:${sent} failed:${failed}`);
  return NextResponse.json({ ok:true, name:campaign.name, sent, failed, total:contacts.length });
}
