export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { connectDB }    from "@/lib/mongodb";
import Contact          from "@/models/Contact";
export async function GET() {
  await connectDB();
  const contacts = await Contact.find().sort({ addedAt:-1 }).lean();
  return NextResponse.json({ contacts });
}
export async function POST(req) {
  await connectDB();
  const body = await req.json();
  try {
    const c = await Contact.create(body);
    return NextResponse.json({ contact:c }, { status:201 });
  } catch(e) { return NextResponse.json({ error:e.message }, { status:400 }); }
}
