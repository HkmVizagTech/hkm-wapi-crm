export const dynamic = "force-dynamic";
import { NextResponse }   from "next/server";
import { connectDB }      from "@/lib/mongodb";
import WebhookForward     from "@/models/WebhookForward";

export async function GET() {
  await connectDB();
  const forwards = await WebhookForward.find().sort({ createdAt:-1 }).lean();
  return NextResponse.json({ forwards });
}

export async function POST(req) {
  await connectDB();
  const { name, url, secret, events } = await req.json();
  if (!name || !url) return NextResponse.json({ error:"name and url required" }, { status:400 });
  try { new URL(url); } catch { return NextResponse.json({ error:"Invalid URL" }, { status:400 }); }
  const fwd = await WebhookForward.create({ name, url, secret, events:events||["all"] });
  return NextResponse.json({ forward: fwd }, { status:201 });
}
