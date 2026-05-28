export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { connectDB }    from "@/lib/mongodb";
import Campaign         from "@/models/Campaign";
import { sendTemplate } from "@/lib/flaxxa";
export async function POST(req) {
  await connectDB();
  const { name, templateName, templateLang, contacts, delay=1200 } = await req.json();
  if (!contacts?.length||!templateName)
    return NextResponse.json({ error:"Missing fields" }, { status:400 });
  const campaign = await Campaign.create({
    name: name||`Bulk ${templateName} ${new Date().toLocaleDateString()}`,
    templateName, templateLang, totalContacts:contacts.length,
    delay, status:"running",
    results: contacts.map(c=>({ phone:c.phone, name:c.name, params:c.params, status:"pending" })),
  });
  // Send in background (no Bull needed for Railway — just async loop)
  (async () => {
    let sent=0, failed=0;
    for (let i=0; i<contacts.length; i++) {
      const c = contacts[i];
      try {
        const d = await sendTemplate(c.phone, templateName, templateLang||"en", c.params||[]);
        const ok = d?.status==="success"||d?.message_id||d?.message_wamid;
        if (ok) sent++; else failed++;
        await Campaign.findByIdAndUpdate(campaign._id, {
          $set:{ [`results.${i}.status`]: ok?"sent":"failed",
                 [`results.${i}.wamid`]:  d?.message_wamid||"",
                 [`results.${i}.error`]:  ok?"":d?.message||"" },
          $inc:{ sent:ok?1:0, failed:ok?0:1 },
        });
      } catch(e) {
        failed++;
        await Campaign.findByIdAndUpdate(campaign._id,{
          $set:{[`results.${i}.status`]:"failed",[`results.${i}.error`]:e.message},
          $inc:{failed:1},
        });
      }
      if (i<contacts.length-1) await new Promise(r=>setTimeout(r,delay));
    }
    await Campaign.findByIdAndUpdate(campaign._id,{ status:"done", completedAt:new Date() });
  })();
  return NextResponse.json({ campaignId:campaign._id, status:"running" }, { status:201 });
}
