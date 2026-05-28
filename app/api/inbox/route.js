export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { connectDB }    from "@/lib/mongodb";
import Message          from "@/models/Message";
import Contact          from "@/models/Contact";

export async function GET() {
  await connectDB();
  // Get all contacts that have messages
  const latest = await Message.aggregate([
    { $sort: { sentAt: -1 } },
    { $group: {
      _id:         "$contactPhone",
      lastMessage: { $first: "$body" },
      lastTime:    { $first: "$sentAt" },
      lastDir:     { $first: "$direction" },
      unread:      { $sum: { $cond: [{ $and:[
        { $eq:["$direction","inbound"] },
        { $eq:["$status","received"] }
      ]}, 1, 0] } },
    }},
    { $sort: { lastTime: -1 } },
    { $limit: 50 },
  ]);

  // Get contact names
  const phones   = latest.map(l => l._id);
  const contacts = await Contact.find({ phone: { $in: phones } }).lean();
  const cMap     = Object.fromEntries(contacts.map(c => [c.phone, c]));

  const conversations = latest.map(l => ({
    phone:       l._id,
    name:        cMap[l._id]?.name || l._id,
    lastMessage: l.lastMessage,
    lastTime:    l.lastTime,
    lastDir:     l.lastDir,
    unread:      l.unread,
  }));

  return NextResponse.json({ conversations });
}
