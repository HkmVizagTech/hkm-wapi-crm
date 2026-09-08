export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { connectDB }    from "@/lib/mongodb";
import Message          from "@/models/Message";

export async function DELETE(req, { params }) {
  await connectDB();
  await Message.findByIdAndDelete(params.id).catch(()=>{});
  return NextResponse.json({ ok:true });
}