export const dynamic = "force-dynamic";

import { connectDB } from "@/lib/mongodb";
import Contact       from "@/models/Contact";
import { NextResponse } from "next/server";

export async function GET() {
  await connectDB();
  const contacts = await Contact.find().sort({ addedAt: -1 }).lean();
  return NextResponse.json({ contacts });
}

export async function POST(req) {
  await connectDB();
  const body = await req.json();
  try {
    const contact = await Contact.create(body);
    return NextResponse.json({ contact }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
