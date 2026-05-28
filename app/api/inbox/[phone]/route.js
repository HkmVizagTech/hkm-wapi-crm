export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { connectDB }    from "@/lib/mongodb";
import Message          from "@/models/Message";

export async function GET(req, { params }) {
  await connectDB();
  const phone = decodeURIComponent(params.phone);
  const messages = await Message.find({ contactPhone: phone })
    .sort({ sentAt: 1 })
    .limit(100)
    .lean();

  // Mark inbound messages as read
  await Message.updateMany(
    { contactPhone: phone, direction:"inbound", status:"received" },
    { $set: { status:"read" } }
  );

  return NextResponse.json({ messages });
}
