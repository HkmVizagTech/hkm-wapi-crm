export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { connectDB }    from "@/lib/mongodb";
import Campaign         from "@/models/Campaign";

// Stop a specific campaign by ID
export async function POST(req) {
  await connectDB();
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error:"id required" }, { status:400 });
  await Campaign.findByIdAndUpdate(id, { status:"stopped" });
  return NextResponse.json({ ok:true });
}

// Stop ALL queued + scheduled campaigns
export async function DELETE() {
  await connectDB();
  const result = await Campaign.updateMany(
    { status: { $in: ["queued","scheduled","running"] } },
    { $set: { status: "stopped" } }
  );
  return NextResponse.json({ ok:true, stopped: result.modifiedCount });
}
