export const dynamic = "force-dynamic";

import { connectDB } from "@/lib/mongodb";
import Media         from "@/models/Media";
import { NextResponse } from "next/server";

export async function GET() {
  await connectDB();
  const media = await Media.find().sort({ uploadedAt: -1 }).lean();
  return NextResponse.json({ media });
}
