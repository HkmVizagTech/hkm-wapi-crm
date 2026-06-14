export const dynamic = "force-dynamic";
export const maxDuration = 300;
import { NextResponse } from "next/server";
import { connectDB }    from "@/lib/mongodb";
import Campaign         from "@/models/Campaign";

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
  if (mediaUrl && headerFormat && mediaUrl.startsWith("http")) {
    const fmt = headerFormat.toUpperCase();
    const p = fmt==="IMAGE"    ? {type:"image",    image:    {link:mediaUrl}}
            : fmt==="DOCUMENT" ? {type:"document", document: {link:mediaUrl,filename:"Document"}}
            : fmt==="VIDEO"    ? {type:"video",    video:    {link:mediaUrl}}
            : null;
    if (p) components.push({type:"header", parameters:[p]});
  }
  if (params?.filter(v=>v).length) {
    components.push({type:"body", parameters:params.filter(v=>v).map(v=>({type:"text",text:String(v)}))});
  }
  const r = await fetch("https://wapi.flaxxa.com/api/v1/sendtemplatemessage", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({
      token:             process.env.FLAXXA_TOKEN,
      phone:             normalizePhone(phone),
      template_name:     templateName,
      template_language: templateLang||"en",
      components,
    }),
  });
  const d = await r.json().catch(()=>({}));
  const ok = r.ok && (d?.status==="success"||d?.message_id||d?.message_wamid);
  return { ok, wamid:d?.message_wamid||String(d?.message_id||""), error:d?.message||"" };
}

// Background processor — runs after response is returned
async function processCampaign(campaignId) {
  try {
    await connectDB();
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) return;

    await Campaign.findByIdAndUpdate(campaignId, { status:"running" });

    const contacts = campaign.results || [];
    const BATCH    = 10; // process 10 at a time

    for (let i = 0; i < contacts.length; i++) {
      // Re-check if campaign was stopped
      if (i % 50 === 0) {
        const fresh = await Campaign.findById(campaignId).select("status").lean();
        if (fresh?.status === "stopped") break;
      }

      const c = contacts[i];
      try {
        const { ok, wamid, error } = await sendTemplate(
          c.phone, campaign.templateName, campaign.templateLang,
          c.params||[], campaign.mediaUrl, campaign.headerFormat
        );
        await Campaign.findByIdAndUpdate(campaignId, {
          $set:{
            [`results.${i}.status`]: ok?"sent":"failed",
            [`results.${i}.wamid`]:  wamid,
            [`results.${i}.error`]:  ok?"":error,
            [`results.${i}.sentAt`]: new Date(),
          },
          $inc:{ sent:ok?1:0, failed:ok?0:1 },
        });
      } catch(e) {
        await Campaign.findByIdAndUpdate(campaignId, {
          $set:{[`results.${i}.status`]:"failed",[`results.${i}.error`]:e.message},
          $inc:{failed:1},
        }).catch(()=>{});
      }

      if (i < contacts.length-1) {
        await new Promise(r=>setTimeout(r, campaign.delay||1200));
      }
    }

    await Campaign.findByIdAndUpdate(campaignId,{
      status:"done", completedAt:new Date()
    });
    console.log(`✅ Campaign ${campaignId} done`);
  } catch(e) {
    console.error(`Campaign ${campaignId} error:`, e.message);
    await Campaign.findByIdAndUpdate(campaignId,{status:"stopped"}).catch(()=>{});
  }
}

export async function POST(req) {
  try {
    await connectDB();
    const {
      name, templateName, templateLang,
      contacts, delay=1200,
      mediaUrl, headerFormat, scheduledAt,
    } = await req.json();

    if (!contacts?.length || !templateName)
      return NextResponse.json({error:"Missing required fields"},{status:400});

    if (contacts.length > 50000) {
      return NextResponse.json({
        error:`Too many contacts (${contacts.length.toLocaleString()}). Maximum is 50,000 per campaign. Please split your CSV into smaller files.`
      },{status:400});
    }

    // Validate media URL
    if (mediaUrl && mediaUrl.startsWith("data:")) {
      return NextResponse.json({
        error:"Please use a Cloudinary URL for the image, not a local file."
      },{status:400});
    }

    // Deduplicate
    const seen=new Set(), unique=[];
    for (const c of contacts) {
      const phone = normalizePhone(c.phone);
      if (!seen.has(phone)) { seen.add(phone); unique.push({...c,phone}); }
    }

    // Create campaign record
    const campaign = await Campaign.create({
      name:          name || `Bulk ${templateName} ${new Date().toLocaleDateString()}`,
      templateName,  templateLang,
      mediaUrl:      mediaUrl?.startsWith("http") ? mediaUrl : "",
      headerFormat,
      totalContacts: unique.length,
      delay,
      scheduledAt:   scheduledAt ? new Date(scheduledAt) : null,
      status:        "queued",
      results:       unique.map(c=>({ phone:c.phone, name:c.name, params:c.params||[], status:"pending" })),
    });

    const campaignId = campaign._id.toString();

    // Check if scheduled for future
    const schedTime   = scheduledAt ? new Date(scheduledAt) : null;
    const isScheduled = schedTime && schedTime > new Date(Date.now() + 60*1000);

    console.log(`📋 Campaign: ${campaign.name} | contacts: ${unique.length} | scheduledAt: ${scheduledAt||"none"} | isScheduled: ${isScheduled}`);

    if (isScheduled) {
      await Campaign.findByIdAndUpdate(campaignId, { status:"scheduled" });
      console.log(`⏰ Saved as scheduled for: ${schedTime.toISOString()}`);
      return NextResponse.json({ campaignId, status:"scheduled", total:unique.length }, {status:201});
    }

    // For large campaigns — return immediately, process in background
    if (unique.length > 100) {
      // Start processing in background without awaiting
      processCampaign(campaignId);
      return NextResponse.json({
        campaignId,
        status:"running",
        total: unique.length,
        message: `Campaign started. ${unique.length.toLocaleString()} messages will be sent in the background.`
      }, {status:201});
    }

    // For small campaigns (≤100) — process synchronously
    const results = [];
    let sent=0, failed=0;
    await Campaign.findByIdAndUpdate(campaignId, { status:"running" });

    for (let i=0; i<unique.length; i++) {
      const c = unique[i];
      try {
        const {ok,wamid,error} = await sendTemplate(
          c.phone, templateName, templateLang, c.params||[], mediaUrl, headerFormat
        );
        if(ok) sent++; else failed++;
        results.push({phone:c.phone,name:c.name,status:ok?"sent":"failed",wamid,error});
        await Campaign.findByIdAndUpdate(campaignId,{
          $set:{[`results.${i}.status`]:ok?"sent":"failed",[`results.${i}.wamid`]:wamid,[`results.${i}.sentAt`]:new Date()},
          $inc:{sent:ok?1:0,failed:ok?0:1},
        });
      } catch(e) {
        failed++;
        results.push({phone:c.phone,name:c.name,status:"failed",error:e.message});
      }
      if(i<unique.length-1) await new Promise(r=>setTimeout(r,Math.max(delay,500)));
    }

    await Campaign.findByIdAndUpdate(campaignId,{status:"done",completedAt:new Date()});
    return NextResponse.json({ campaignId, status:"done", sent, failed, total:unique.length, results });

  } catch(e) {
    console.error("Bulk send error:", e.message);
    return NextResponse.json({error:e.message},{status:500});
  }
}
// Sun Jun 14 16:50:21 UTC 2026
