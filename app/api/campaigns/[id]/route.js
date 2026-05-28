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
