export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { connectDB }    from "@/lib/mongodb";
import Message          from "@/models/Message";
export async function GET() {
  await connectDB();
  const [total,delivered,read,failed] = await Promise.all([
    Message.countDocuments(),
    Message.countDocuments({status:"delivered"}),
    Message.countDocuments({status:"read"}),
    Message.countDocuments({status:"failed"}),
  ]);
  return NextResponse.json({ total, delivered, read, failed });
}
