import { connectDB } from "@/lib/mongodb";
import Message       from "@/models/Message";
import { NextResponse } from "next/server";

export async function GET() {
  await connectDB();
  const [total, delivered, failed, read] = await Promise.all([
    Message.countDocuments(),
    Message.countDocuments({ status:"delivered" }),
    Message.countDocuments({ status:"failed" }),
    Message.countDocuments({ status:"read" }),
  ]);
  return NextResponse.json({ total, delivered, failed, read });
}
