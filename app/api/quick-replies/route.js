export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { connectDB }    from "@/lib/mongodb";
import QuickReply       from "@/models/QuickReply";

export async function GET() {
  await connectDB();
  const replies = await QuickReply.find().sort({ shortcut:1 }).lean();
  return NextResponse.json({ replies });
}

export async function POST(req) {
  await connectDB();
  const { shortcut, title, message, category } = await req.json();
  const reply = await QuickReply.create({ shortcut, title, message, category });
  return NextResponse.json({ reply }, { status:201 });
}

export async function DELETE(req) {
  await connectDB();
  const { id } = await req.json();
  await QuickReply.findByIdAndDelete(id);
  return NextResponse.json({ ok:true });
}
