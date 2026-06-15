export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { connectDB }    from "@/lib/mongodb";
import Campaign         from "@/models/Campaign";

export async function GET(req) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const query  = status && status !== "ALL" ? { status } : {};

  // Exclude results array — it can be huge (2000 items per campaign)
  const campaigns = await Campaign.find(query)
    .select("-results -defaultParams")
    .sort({ createdAt:-1 })
    .limit(200)
    .lean();

  const enriched = campaigns.map(c => {
    const deliveryRate = c.sent > 0
      ? Math.round(((c.delivered||0) + (c.read||0)) / c.sent * 100) : 0;
    const pending = (c.totalContacts||0) - (c.sent||0) - (c.failed||0);
    return { ...c, deliveryRate, pending: Math.max(0, pending) };
  });

  return NextResponse.json({ campaigns: enriched });
}
