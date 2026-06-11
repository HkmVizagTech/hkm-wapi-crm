export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min max
import { NextResponse } from "next/server";
import { connectDB }    from "@/lib/mongodb";
import Campaign         from "@/models/Campaign";

const BASE = "https://wapi.flaxxa.com";

async function sendTemplate(phone, templateName, templateLang, params, mediaUrl, headerFormat) {
  const components = [];

  // Only add header if mediaUrl is a proper HTTPS URL (not base64)
  if (mediaUrl && headerFormat && mediaUrl.startsWith("http")) {
    const fmt = headerFormat.toUpperCase();
    const p = fmt==="IMAGE"    ? {type:"image",    image:    {link:mediaUrl}}
            : fmt==="DOCUMENT" ? {type:"document", document: {link:mediaUrl,filename:"Document"}}
            : fmt==="VIDEO"    ? {type:"video",    video:    {link:mediaUrl}}
            : null;
    if (p) components.push({type:"header", parameters:[p]});
  }

  if (params?.filter(v=>v).length) {
    components.push({
      type:"body",
      parameters: params.filter(v=>v).map(v=>({type:"text",text:String(v)}))
    });
  }

  const r = await fetch(`${BASE}/api/v1/sendtemplatemessage`, {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({
      token:             process.env.FLAXXA_TOKEN,
      phone:             String(phone).replace(/^\+/,""),
      template_name:     templateName,
      template_language: templateLang||"en",
      components,
    }),
  });

  const d = await r.json().catch(()=>({}));
  const ok = r.ok && (d?.status==="success"||d?.message_id||d?.message_wamid);
  return { ok, wamid:d?.message_wamid||String(d?.message_id||""), error:d?.message||"" };
}

export async function POST(req) {
  try {
    await connectDB();

    const body = await req.json();
    const { name, templateName, templateLang, contacts,
            delay=1200, mediaUrl, headerFormat, scheduledAt } = body;

    if (!contacts?.length || !templateName)
      return NextResponse.json({error:"Missing required fields"},{status:400});

    // Validate mediaUrl — reject base64
    if (mediaUrl && mediaUrl.startsWith("data:")) {
      return NextResponse.json({
        error:"Please use a Cloudinary URL for the image, not a local file. Upload the image to Media Library first."
      },{status:400});
    }

    // Deduplicate contacts by phone number — keep first occurrence
    const seen    = new Set();
    const unique  = [];
    const dupes   = [];
    for (const c of contacts) {
      const phone = String(c.phone).trim().replace(/^\+/,"");
      if (seen.has(phone)) {
        dupes.push(phone);
      } else {
        seen.add(phone);
        unique.push({ ...c, phone });
      }
    }
    if (dupes.length > 0) {
      console.log(`Removed ${dupes.length} duplicate phone numbers:`, dupes);
    }
    const dedupedContacts = unique;

    // Create campaign
    const campaign = await Campaign.create({
      name:          name || `Bulk ${templateName} ${new Date().toLocaleDateString()}`,
      templateName, templateLang,
      mediaUrl:      mediaUrl?.startsWith("http") ? mediaUrl : "",
      headerFormat,
      totalContacts: dedupedContacts.length,
      delay,
      scheduledAt:   scheduledAt ? new Date(scheduledAt) : null,
      status:        scheduledAt && new Date(scheduledAt)>new Date() ? "scheduled" : "running",
      results:       dedupedContacts.map(c=>({phone:c.phone,name:c.name,params:c.params||[],status:"pending"})),
    });

    const campaignId = campaign._id.toString();

    // Scheduled — return immediately
    if (scheduledAt && new Date(scheduledAt) > new Date()) {
      return NextResponse.json({campaignId, status:"scheduled"},{status:201});
    }

    // Process all contacts synchronously and collect results
    const results = [];
    let sent=0, failed=0;

    for (let i=0; i<dedupedContacts.length; i++) {
      const c = dedupedContacts[i];
      try {
        const {ok,wamid,error} = await sendTemplate(
          c.phone, templateName, templateLang,
          c.params||[], mediaUrl, headerFormat
        );
        if (ok) sent++; else failed++;
        results.push({phone:c.phone,name:c.name,status:ok?"sent":"failed",wamid,error});

        await Campaign.findByIdAndUpdate(campaignId,{
          $set:{
            [`results.${i}.status`]: ok?"sent":"failed",
            [`results.${i}.wamid`]:  wamid,
            [`results.${i}.error`]:  ok?"":error,
            [`results.${i}.sentAt`]: new Date(),
          },
          $inc:{sent:ok?1:0,failed:ok?0:1},
        });
      } catch(e) {
        failed++;
        results.push({phone:c.phone,name:c.name,status:"failed",error:e.message});
        await Campaign.findByIdAndUpdate(campaignId,{
          $set:{[`results.${i}.status`]:"failed",[`results.${i}.error`]:e.message},
          $inc:{failed:1},
        }).catch(()=>{});
      }

      // Delay between sends (skip after last)
      if (i < dedupedContacts.length-1) {
        await new Promise(r=>setTimeout(r, Math.max(delay,500)));
      }
    }

    // Mark done
    await Campaign.findByIdAndUpdate(campaignId,{status:"done",completedAt:new Date()});

    return NextResponse.json({
      campaignId, status:"done",
      sent, failed, total:contacts.length,
      results,
    });

  } catch(e) {
    console.error("Bulk send error:", e.message);
    return NextResponse.json({error:e.message},{status:500});
  }
}
