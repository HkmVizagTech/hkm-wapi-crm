export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { connectDB }    from "@/lib/mongodb";
import Message          from "@/models/Message";
export async function POST(req) {
  await connectDB();
  const { message_id, status } = await req.json().catch(()=>({}));
  if (message_id && ["delivered","read","failed"].includes(status)) {
    await Message.findOneAndUpdate({ wamid:message_id }, { status });
  }
  return NextResponse.json({ ok:true });
}
