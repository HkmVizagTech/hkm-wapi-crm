import { connectDB }    from "@/lib/mongodb";
import Campaign         from "@/models/Campaign";
import { getQueue }     from "@/lib/queue/bulkSendQueue";
import { NextResponse } from "next/server";

export async function POST(req) {
  await connectDB();
  const { name, templateName, templateLang, contacts, delay, mediaUrl } = await req.json();

  if (!contacts?.length || !templateName) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const campaign = await Campaign.create({
    name: name || `Campaign ${new Date().toLocaleDateString()}`,
    templateName, templateLang, mediaUrl,
    totalContacts: contacts.length,
    delay,
    results: contacts.map(c => ({
      phone: c.phone, name: c.name, params: c.params, status: "pending"
    })),
  });

  const queue = getQueue();
  await queue.add({
    campaignId:   campaign._id.toString(),
    contacts,
    templateName,
    templateLang: templateLang || "en",
    delay:        delay || 1200,
  });

  return NextResponse.json({ campaignId: campaign._id, status: "queued" }, { status: 201 });
}
