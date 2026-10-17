export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { connectDB }    from "@/lib/mongodb";
import Message          from "@/models/Message";

// GET /api/inbox/:phone?limit=40&before=<ISO date>
// Returns the newest `limit` messages (oldest→newest). Pass `before` (the sentAt of the
// oldest message already loaded) to page further back, WhatsApp-style.
export async function GET(req, { params }) {
  await connectDB();
  const phone  = decodeURIComponent(params.phone);
  const { searchParams } = new URL(req.url);
  const limit  = Math.min(100, Math.max(1, parseInt(searchParams.get("limit")) || 40));
  const before = searchParams.get("before");

  const query = { contactPhone: phone };
  if (before && !isNaN(new Date(before))) query.sentAt = { $lt:new Date(before) };

  const rows = await Message.find(query)
    .sort({ sentAt:-1, _id:-1 })
    .limit(limit + 1)
    .lean();
  const hasMore  = rows.length > limit;
  const messages = (hasMore ? rows.slice(0, limit) : rows).reverse();

  // Mark inbound messages as read (only when opening/refreshing the latest page)
  if (!before) {
    await Message.updateMany(
      { contactPhone: phone, direction:"inbound", status:"received" },
      { $set: { status:"read" } }
    );
  }

  return NextResponse.json({ messages, hasMore });
}
