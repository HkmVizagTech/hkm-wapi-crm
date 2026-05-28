export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { connectDB }    from "@/lib/mongodb";
import Contact          from "@/models/Contact";
export async function DELETE(req, { params }) {
  await connectDB();
  await Contact.findByIdAndDelete(params.id);
  return NextResponse.json({ ok:true });
}
