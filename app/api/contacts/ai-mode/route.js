export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { connectDB }    from "@/lib/mongodb";
import Contact          from "@/models/Contact";

export async function POST(req) {
  await connectDB();
  const { phone, mode, doNotContact } = await req.json();
  const update = {};
  if (mode) update.aiMode = mode;
  if (doNotContact !== undefined) update.doNotContact = doNotContact;
  await Contact.findOneAndUpdate({ phone }, { $set:update }, { upsert:true });
  return NextResponse.json({ ok:true });
}
