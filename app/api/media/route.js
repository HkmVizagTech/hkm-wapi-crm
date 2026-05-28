export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { connectDB }    from "@/lib/mongodb";
import Media            from "@/models/Media";
export async function GET() {
  await connectDB();
  const media = await Media.find().sort({ uploadedAt:-1 }).lean();
  return NextResponse.json({ media });
}
