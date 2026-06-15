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

export async function POST(req) {
  try {
    await connectDB();
    const rawBody = await req.text();
    console.log(`📦 Bulk request: ${(rawBody.length/1024).toFixed(0)} KB`);
    const {
      name, templateName, templateLang,
      contacts, delay=1200,
      mediaUrl, headerFormat, scheduledAt,
    } = JSON.parse(rawBody);

    if (!contacts?.length || !templateName)
      return NextResponse.json({ error:"Missing required fields" }, { status:400 });

    // Deduplicate
    const seen=new Set(), unique=[];
    for (const c of contacts) {
      const phone = normalizePhone(c.phone);
      if (!seen.has(phone)) { seen.add(phone); unique.push({...c, phone}); }
    }

    // Determine status
    const schedTime   = scheduledAt ? new Date(scheduledAt) : null;
    const isScheduled = schedTime && schedTime > new Date(Date.now() + 60*1000);
    const status      = isScheduled ? "scheduled" : "queued";

    // Store params once at campaign level if all contacts share same params
    // This avoids storing 400+ chars per contact in MongoDB
    const firstParams = unique[0]?.params || [];
    const allSameParams = unique.every(c =>
      JSON.stringify(c.params||[]) === JSON.stringify(firstParams)
    );

    const campaign = await Campaign.create({
      name:          name || `Bulk ${templateName} ${new Date().toLocaleDateString()}`,
      templateName,  templateLang:templateLang||"en",
      mediaUrl:      mediaUrl?.startsWith("http") ? mediaUrl : "",
      headerFormat,
      totalContacts: unique.length,
      delay,
      scheduledAt:   schedTime,
      status,
      // If all params identical, store once at top level
      defaultParams: allSameParams ? firstParams : [],
      results: unique.map(c=>({
        phone:  c.phone,
        name:   c.name||"",
        // Only store params per-contact if they differ
        params: allSameParams ? [] : (c.params||[]),
        status: "pending",
      })),
    });

    console.log(`✅ Campaign saved: ${campaign.name} | ${unique.length} contacts | status:${status}`);

    return NextResponse.json({
      campaignId: campaign._id.toString(),
      status,
      total: unique.length,
    }, { status:201 });

  } catch(e) {
    console.error("Bulk save error:", e.message);
    return NextResponse.json({ error: e.message }, { status:500 });
  }
}
