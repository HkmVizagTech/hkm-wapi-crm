export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { connectDB }    from "@/lib/mongodb";
import Campaign         from "@/models/Campaign";

export async function GET(req) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const query = status && status !== "ALL" ? { status } : {};

  const campaigns = await Campaign.find(query)
    .sort({ createdAt:-1 })
    .limit(200)  // increased from 100
    .lean();

  const enriched = campaigns.map(c => {
    const results    = c.results || [];
    const delivered  = results.filter(r => r.status==="delivered").length;
    const read       = results.filter(r => r.status==="read").length;
    const pending    = results.filter(r => r.status==="pending").length;
    const deliveryRate = c.sent > 0
      ? Math.round(((delivered + read) / c.sent) * 100) : 0;
    return { ...c, results:undefined, delivered, read, pending, deliveryRate };
  });

  return NextResponse.json({ campaigns: enriched });
}
