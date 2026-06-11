export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { connectDB }    from "@/lib/mongodb";
import Campaign         from "@/models/Campaign";

// Recalculates sent/delivered/read/failed counts from results array
// Useful for existing campaigns before webhook was set up
export async function POST() {
  await connectDB();

  const campaigns = await Campaign.find({ status:{ $in:["done","stopped"] } });
  let updated = 0;

  for (const c of campaigns) {
    const results = c.results || [];
    const sent      = results.filter(r => ["sent","delivered","read"].includes(r.status)).length;
    const delivered = results.filter(r => r.status==="delivered").length;
    const read      = results.filter(r => r.status==="read").length;
    const failed    = results.filter(r => r.status==="failed").length;

    await Campaign.findByIdAndUpdate(c._id, { $set:{ sent, delivered, read, failed } });
    updated++;
  }

  return NextResponse.json({ ok:true, updated });
}
