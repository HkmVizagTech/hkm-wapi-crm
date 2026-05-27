import { connectDB } from "@/lib/mongodb";
import Contact       from "@/models/Contact";
import { NextResponse } from "next/server";

export async function POST(req) {
  await connectDB();
  const { contacts } = await req.json();
  if (!contacts?.length) return NextResponse.json({ error: "No contacts provided" }, { status: 400 });

  let inserted = 0, skipped = 0;
  for (const c of contacts) {
    try {
      await Contact.findOneAndUpdate({ phone: c.phone }, { $setOnInsert: c }, { upsert: true });
      inserted++;
    } catch { skipped++; }
  }
  return NextResponse.json({ inserted, skipped });
}
