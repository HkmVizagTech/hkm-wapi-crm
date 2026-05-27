import { connectDB } from "@/lib/mongodb";
import Campaign      from "@/models/Campaign";
import { NextResponse } from "next/server";

export async function GET(req, { params }) {
  await connectDB();
  const campaign = await Campaign.findById(params.id).lean();
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ campaign });
}
