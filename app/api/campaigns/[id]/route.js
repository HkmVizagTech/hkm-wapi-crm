export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { connectDB }    from "@/lib/mongodb";
import Campaign         from "@/models/Campaign";

export async function GET(req, { params }) {
  await connectDB();
  const campaign = await Campaign.findById(params.id).lean();
  if (!campaign) return NextResponse.json({ error:"Not found" }, { status:404 });
  return NextResponse.json({ campaign });
}

export async function DELETE(req, { params }) {
  await connectDB();
  const campaign = await Campaign.findById(params.id);
  if (!campaign) return NextResponse.json({ error:"Not found" }, { status:404 });
  if (!["scheduled","queued"].includes(campaign.status)) {
    return NextResponse.json({ error:"Only scheduled or queued campaigns can be cancelled" }, { status:400 });
  }
  await Campaign.findByIdAndUpdate(params.id, { status:"stopped" });
  return NextResponse.json({ ok:true });
}
