export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { connectDB }    from "@/lib/mongodb";
import Campaign         from "@/models/Campaign";

const BASE = "https://wapi.flaxxa.com";

async function sendTemplate(phone, templateName, templateLang, params, mediaUrl, headerFormat) {
  const components = [];
  if (mediaUrl && headerFormat) {
    const fmt = headerFormat.toUpperCase();
    const p = fmt==="IMAGE"    ? {type:"image",    image:    {link:mediaUrl}}
            : fmt==="DOCUMENT" ? {type:"document", document: {link:mediaUrl,filename:"Document"}}
            : fmt==="VIDEO"    ? {type:"video",    video:    {link:mediaUrl}}
            : null;
    if (p) components.push({type:"header", parameters:[p]});
  }
  if (params?.length) {
    components.push({type:"body", parameters:params.map(v=>({type:"text",text:String(v||"")}))});
  }
  const r = await fetch(`${BASE}/api/v1/sendtemplatemessage`, {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({
      token:             process.env.FLAXXA_TOKEN,
      phone:             String(phone),
      template_name:     templateName,
      template_language: templateLang||"en",
      components,
    }),
  });
  const d = await r.json();
  const ok = r.ok && (d?.status==="success"||d?.message_id||d?.message_wamid);
  return {ok, wamid:d?.message_wamid||String(d?.message_id||""), error:d?.message||""};
}

export async function POST(req) {
  const db = await connectDB();
  const {name,templateName,templateLang,contacts,delay=1200,mediaUrl,headerFormat,scheduledAt} = await req.json();

  if (!contacts?.length||!templateName)
    return NextResponse.json({error:"Missing fields"},{status:400});

  // Create campaign record
  const campaign = await Campaign.create({
    name:          name||`Bulk ${templateName} ${new Date().toLocaleDateString()}`,
    templateName,  templateLang, mediaUrl, headerFormat,
    totalContacts: contacts.length,
    delay,
    scheduledAt:   scheduledAt ? new Date(scheduledAt) : null,
    status:        scheduledAt && new Date(scheduledAt)>new Date() ? "scheduled" : "running",
    results:       contacts.map(c=>({phone:c.phone,name:c.name,params:c.params||[],status:"pending"})),
  });

  const campaignId = campaign._id.toString();

  // For scheduled — return immediately
  if (scheduledAt && new Date(scheduledAt) > new Date()) {
    return NextResponse.json({campaignId, status:"scheduled"},{status:201});
  }

  // Use a streaming response so the connection stays open while we send
  const encoder = new TextEncoder();
  const stream  = new ReadableStream({
    async start(controller) {
      const send = (data) => {
        try { controller.enqueue(encoder.encode(JSON.stringify(data)+"\n")); } catch{}
      };

      // Send campaign ID immediately
      send({type:"init", campaignId});

      let sent=0, failed=0;
      for (let i=0; i<contacts.length; i++) {
        const c = contacts[i];
        try {
          const {ok,wamid,error} = await sendTemplate(
            c.phone, templateName, templateLang, c.params, mediaUrl, headerFormat
          );
          if (ok) sent++; else failed++;

          // Update DB
          await Campaign.findByIdAndUpdate(campaignId, {
            $set:{
              [`results.${i}.status`]: ok?"sent":"failed",
              [`results.${i}.wamid`]:  wamid,
              [`results.${i}.error`]:  ok?"":error,
              [`results.${i}.sentAt`]: new Date(),
            },
            $inc:{sent:ok?1:0, failed:ok?0:1},
          });

          // Stream progress to frontend
          send({type:"progress", index:i, total:contacts.length, sent, failed,
            result:{phone:c.phone,name:c.name,status:ok?"sent":"failed",error:ok?"":error}});

        } catch(e) {
          failed++;
          await Campaign.findByIdAndUpdate(campaignId,{
            $set:{[`results.${i}.status`]:"failed",[`results.${i}.error`]:e.message},
            $inc:{failed:1},
          }).catch(()=>{});
          send({type:"progress", index:i, total:contacts.length, sent, failed,
            result:{phone:c.phone,name:c.name,status:"failed",error:e.message}});
        }

        if (i < contacts.length-1) {
          await new Promise(r=>setTimeout(r, delay));
        }
      }

      // Mark done
      await Campaign.findByIdAndUpdate(campaignId,{status:"done",completedAt:new Date()});
      send({type:"done", campaignId, sent, failed, total:contacts.length});
      controller.close();
    }
  });

  return new Response(stream, {
    headers:{
      "Content-Type":  "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Campaign-Id": campaignId,
    },
  });
}
