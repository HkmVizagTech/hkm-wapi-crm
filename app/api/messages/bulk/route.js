export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { connectDB }    from "@/lib/mongodb";
import Campaign         from "@/models/Campaign";

async function sendTemplate(token, phone, templateName, templateLang, params, mediaUrl, headerFormat) {
  const components = [];

  // Add media header if template has IMAGE/DOCUMENT/VIDEO header
  if (mediaUrl && headerFormat) {
    const fmt = headerFormat.toUpperCase();
    const paramType = fmt === "IMAGE"    ? { type:"image",    image:    { link:mediaUrl } }
                    : fmt === "DOCUMENT" ? { type:"document", document: { link:mediaUrl, filename:"Document" } }
                    : fmt === "VIDEO"    ? { type:"video",    video:    { link:mediaUrl } }
                    : null;
    if (paramType) {
      components.push({ type:"header", parameters:[paramType] });
    }
  }

  // Add body params
  if (params?.length) {
    components.push({
      type:"body",
      parameters: params.map(v => ({ type:"text", text:v })),
    });
  }

  const r = await fetch("https://wapi.flaxxa.com/api/v1/sendtemplatemessage", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({
      token,
      phone,
      template_name:     templateName,
      template_language: templateLang || "en",
      components,
    }),
  });
  return r.json();
}

async function runCampaign(campaign) {
  const token = process.env.FLAXXA_TOKEN;
  await Campaign.findByIdAndUpdate(campaign._id, { status:"running" });

  for (let i = 0; i < campaign.results.length; i++) {
    const contact = campaign.results[i];
    try {
      const d = await sendTemplate(
        token,
        contact.phone,
        campaign.templateName,
        campaign.templateLang,
        contact.params,
        campaign.mediaUrl,
        campaign.headerFormat,
      );
      const ok = d?.status==="success" || d?.message_id || d?.message_wamid;
      await Campaign.findByIdAndUpdate(campaign._id, {
        $set: {
          [`results.${i}.status`]: ok ? "sent" : "failed",
          [`results.${i}.wamid`]:  d?.message_wamid || "",
          [`results.${i}.error`]:  ok ? "" : (d?.message || "Failed"),
          [`results.${i}.sentAt`]: new Date(),
        },
        $inc: { sent:ok?1:0, failed:ok?0:1 },
      });
    } catch(e) {
      await Campaign.findByIdAndUpdate(campaign._id, {
        $set: { [`results.${i}.status`]:"failed", [`results.${i}.error`]:e.message },
        $inc: { failed:1 },
      });
    }
    if (i < campaign.results.length - 1) {
      await new Promise(r => setTimeout(r, campaign.delay || 1200));
    }
  }
  await Campaign.findByIdAndUpdate(campaign._id, { status:"done", completedAt:new Date() });
}

export async function POST(req) {
  await connectDB();
  const {
    name, templateName, templateLang, contacts,
    delay, mediaUrl, headerFormat, scheduledAt,
  } = await req.json();

  if (!contacts?.length || !templateName)
    return NextResponse.json({ error:"Missing fields" }, { status:400 });

  const isScheduled = scheduledAt && new Date(scheduledAt) > new Date();

  const campaign = await Campaign.create({
    name:         name || `Bulk ${templateName} ${new Date().toLocaleDateString()}`,
    templateName, templateLang, mediaUrl, headerFormat,
    totalContacts: contacts.length,
    delay,
    scheduledAt:  scheduledAt ? new Date(scheduledAt) : null,
    status:       isScheduled ? "scheduled" : "running",
    results: contacts.map(c => ({
      phone:  c.phone,
      name:   c.name,
      params: c.params || [],
      status: "pending",
    })),
  });

  if (isScheduled) {
    // Schedule: wait until the time then run
    const msUntil = new Date(scheduledAt) - Date.now();
    setTimeout(() => runCampaign(campaign), msUntil);
    return NextResponse.json({ campaignId:campaign._id, status:"scheduled" }, { status:201 });
  }

  // Run immediately in background
  runCampaign(campaign);
  return NextResponse.json({ campaignId:campaign._id, status:"running" }, { status:201 });
}
