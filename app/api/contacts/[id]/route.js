export const dynamic = "force-dynamic";

import { connectDB } from "@/lib/mongodb";
import Contact       from "@/models/Contact";
import { NextResponse } from "next/server";

export async function GET(req, { params }) {
  await connectDB();
  const contact = await Contact.findById(params.id).lean();
  if (!contact) return NextResponse.json({ error:"Not found" }, { status:404 });
  return NextResponse.json({ contact });
}

export async function PUT(req, { params }) {
  await connectDB();
  const body    = await req.json();
  const contact = await Contact.findByIdAndUpdate(params.id, body, { new:true });
  return NextResponse.json({ contact });
}

export async function DELETE(req, { params }) {
  await connectDB();
  await Contact.findByIdAndDelete(params.id);
  return NextResponse.json({ success:true });
}
