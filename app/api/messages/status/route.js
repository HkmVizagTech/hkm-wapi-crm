export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { connectDB }    from "@/lib/mongodb";
import Message          from "@/models/Message";

export async function GET(req) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const phone = searchParams.get("phone");
  if (!phone) return NextResponse.json({ error:"phone required" }, { status:400 });

  // Get last 20 outbound messages for this contact
  const messages = await Message.find({
    contactPhone: phone,
    direction:    "outbound",
  }).sort({ sentAt:-1 }).limit(20).lean();

  // For each message with a wamid, try to get latest status from Flaxxa
  const token = process.env.FLAXXA_TOKEN;
  const updated = [];

  for (const msg of messages) {
    if (!msg.wamid || msg.status==="read") {
      updated.push(msg);
      continue;
    }
    try {
      const r = await fetch("https://wapi.flaxxa.com/api/v1/get_message_response", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ token, message_id: msg.wamid }),
      });
      const d = await r.json();
      const statusMap = { sent:"sent", delivered:"delivered", read:"read", failed:"failed" };
      const newStatus = statusMap[d?.status] || msg.status;

      if (newStatus !== msg.status) {
        await Message.findByIdAndUpdate(msg._id, { status: newStatus });
        updated.push({ ...msg, status: newStatus });
      } else {
        updated.push(msg);
      }
    } catch {
      updated.push(msg);
    }
  }

  return NextResponse.json({ messages: updated });
}
