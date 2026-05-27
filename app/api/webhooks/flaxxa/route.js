import { connectDB } from "@/lib/mongodb";
import Message       from "@/models/Message";
import Campaign      from "@/models/Campaign";
import { NextResponse } from "next/server";

export async function POST(req) {
  await connectDB();
  const body = await req.json();

  try {
    const { message_id, status, timestamp } = body;
    if (!message_id || !status) return NextResponse.json({ ok: true });

    const statusMap = { delivered: "delivered", read: "read", failed: "failed" };
    const newStatus  = statusMap[status];
    if (!newStatus) return NextResponse.json({ ok: true });

    await Message.findOneAndUpdate(
      { wamid: message_id },
      {
        status:                                         newStatus,
        ...(newStatus==="delivered" && { deliveredAt: new Date(timestamp*1000) }),
        ...(newStatus==="read"      && { readAt:       new Date(timestamp*1000) }),
      }
    );

    // Update campaign result if applicable
    await Campaign.findOneAndUpdate(
      { "results.wamid": message_id },
      { $set: { "results.$.status": newStatus },
        $inc: { delivered: newStatus==="delivered"||newStatus==="read" ? 1 : 0 } }
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
