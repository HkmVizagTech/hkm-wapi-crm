export const dynamic = "force-dynamic";
import { NextResponse }   from "next/server";
import { connectDB }      from "@/lib/mongodb";
import WebhookForward     from "@/models/WebhookForward";

export async function PATCH(req, { params }) {
  await connectDB();
  const body = await req.json();
  const fwd  = await WebhookForward.findByIdAndUpdate(params.id, body, { new:true });
  return NextResponse.json({ forward: fwd });
}

export async function DELETE(req, { params }) {
  await connectDB();
  await WebhookForward.findByIdAndDelete(params.id);
  return NextResponse.json({ ok:true });
}
