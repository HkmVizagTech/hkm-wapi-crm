export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { connectDB }    from "@/lib/mongodb";
import Contact          from "@/models/Contact";
export async function POST(req) {
  await connectDB();
  const { contacts } = await req.json();
  let inserted=0, skipped=0;
  for (const c of contacts) {
    try { await Contact.findOneAndUpdate({phone:c.phone},{$setOnInsert:c},{upsert:true,new:false}); inserted++; }
    catch { skipped++; }
  }
  return NextResponse.json({ inserted, skipped });
}
