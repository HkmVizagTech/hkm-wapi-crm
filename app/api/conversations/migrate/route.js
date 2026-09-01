export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { connectDB }    from "@/lib/mongodb";
import Message          from "@/models/Message";
import Conversation     from "@/models/Conversation";

// Backfill Conversation records from existing inbound messages
export async function POST() {
  await connectDB();

  // Get distinct phones from messages
  const phones = await Message.distinct("contactPhone", { direction:"inbound" });
  let created = 0;

  for (const phone of phones) {
    const exists = await Conversation.findOne({ phone });
    if (exists) continue;

    const lastMsg = await Message.findOne({ contactPhone:phone })
      .sort({ sentAt:-1 }).lean();
    const unread = await Message.countDocuments({
      contactPhone:phone, direction:"inbound", status:{ $ne:"read" }
    });

    await Conversation.create({
      phone,
      name: lastMsg?.contactName || phone,
      status: "open",
      aiMode: "auto",
      lastMessageAt: lastMsg?.sentAt || new Date(),
      lastMessageText: (lastMsg?.body||"").slice(0,100),
      lastMessageDir: lastMsg?.direction || "inbound",
      unreadCount: unread,
      createdAt: new Date(),
    });
    created++;
  }

  return NextResponse.json({ ok:true, created, total:phones.length });
}
