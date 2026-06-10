export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { connectDB }    from "@/lib/mongodb";
import Campaign         from "@/models/Campaign";

const BASE  = "https://wapi.flaxxa.com";
const TOKEN = () => process.env.FLAXXA_TOKEN;

async function sendOne(phone, templateName, templateLang, params, mediaUrl, headerFormat) {
  const components = [];

  if (mediaUrl && headerFormat) {
    const fmt = headerFormat.toUpperCase();
    const paramObj =
      fmt === "IMAGE"    ? { type:"image",    image:    { link:mediaUrl } } :
      fmt === "DOCUMENT" ? { type:"document", document: { link:mediaUrl, filename:"Document" } } :
      fmt === "VIDEO"    ? { type:"video",    video:    { link:mediaUrl } } : null;
    if (paramObj) components.push({ type:"header", parameters:[paramObj] });
  }

  if (params?.length) {
    components.push({ type:"body", parameters:params.map(v=>({ type:"text", text:String(v) })) });
  }

  const r = await fetch(`${BASE}/api/v1/sendtemplatemessage`, {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({
      token:             TOKEN(),
      phone:             String(phone),
      template_name:     templateName,
      template_language: templateLang || "en",
      components,
    }),
  });
  const data = await r.json();
  const ok   = r.ok && (data?.status==="success" || data?.message_id || data?.message_wamid);
  return { ok, wamid: data?.message_wamid || String(data?.message_id||""), error: data?.message || "" };
}

export async function POST(req) {
  await connectDB();
  const {
    name, templateName, templateLang,
    contacts, delay=1200,
    mediaUrl, headerFormat, scheduledAt,
  } = await req.json();

  if (!contacts?.length || !templateName)
    return NextResponse.json({ error:"Missing fields" }, { status:400 });

  // Create campaign
  const campaign = await Campaign.create({
    name:         name || `Bulk ${templateName} ${new Date().toLocaleDateString()}`,
    templateName, templateLang, mediaUrl, headerFormat,
    totalContacts: contacts.length,
    delay,
    scheduledAt:  scheduledAt ? new Date(scheduledAt) : null,
    status:       "running",
    results: contacts.map(c=>({ phone:c.phone, name:c.name, params:c.params||[], status:"pending" })),
  });

  const isScheduled = scheduledAt && new Date(scheduledAt) > new Date();

  if (isScheduled) {
    await Campaign.findByIdAndUpdate(campaign._id, { status:"scheduled" });
    const msUntil = new Date(scheduledAt) - Date.now();
    // Fire and forget after delay
    setTimeout(async () => {
      await executeCampaign(campaign._id.toString(), contacts, templateName, templateLang, delay, mediaUrl, headerFormat);
    }, msUntil);
    return NextResponse.json({ campaignId:campaign._id, status:"scheduled" }, { status:201 });
  }

  // Run immediately — fire and forget (don't await)
  executeCampaign(campaign._id.toString(), contacts, templateName, templateLang, delay, mediaUrl, headerFormat);

  return NextResponse.json({ campaignId:campaign._id, status:"running" }, { status:201 });
}

async function executeCampaign(campaignId, contacts, templateName, templateLang, delay, mediaUrl, headerFormat) {
  try {
    await connectDB();
    for (let i = 0; i < contacts.length; i++) {
      const c = contacts[i];
      try {
        const { ok, wamid, error } = await sendOne(
          c.phone, templateName, templateLang, c.params, mediaUrl, headerFormat
        );
        await Campaign.findByIdAndUpdate(campaignId, {
          $set: {
            [`results.${i}.status`]: ok ? "sent" : "failed",
            [`results.${i}.wamid`]:  wamid,
            [`results.${i}.error`]:  ok ? "" : error,
            [`results.${i}.sentAt`]: new Date(),
          },
          $inc: { sent:ok?1:0, failed:ok?0:1 },
        });
      } catch(e) {
        await Campaign.findByIdAndUpdate(campaignId, {
          $set: { [`results.${i}.status`]:"failed", [`results.${i}.error`]:e.message },
          $inc: { failed:1 },
        });
      }
      if (i < contacts.length - 1) {
        await new Promise(r => setTimeout(r, delay || 1200));
      }
    }
    await Campaign.findByIdAndUpdate(campaignId, { status:"done", completedAt:new Date() });
  } catch(e) {
    console.error("Campaign error:", e.message);
    await Campaign.findByIdAndUpdate(campaignId, { status:"stopped" }).catch(()=>{});
  }
}
