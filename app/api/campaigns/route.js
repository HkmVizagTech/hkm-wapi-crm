export const dynamic = "force-dynamic";

import { connectDB } from "@/lib/mongodb";
import Campaign      from "@/models/Campaign";
import { NextResponse } from "next/server";

export async function GET() {
  await connectDB();
  const campaigns = await Campaign.find()
    .select("-results")
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  return NextResponse.json({ campaigns });
}
