export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { connectDB }    from "@/lib/mongodb";
import Campaign         from "@/models/Campaign";
export async function GET() {
  await connectDB();
  const campaigns = await Campaign.find().select("-results").sort({ createdAt:-1 }).limit(50).lean();
  return NextResponse.json({ campaigns });
}
