export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import mongoose         from "mongoose";
import { connectDB }    from "@/lib/mongodb";
import Contact          from "@/models/Contact";
export async function DELETE(req, { params }) {
  if (!mongoose.Types.ObjectId.isValid(params.id))
    return NextResponse.json({ error:"Invalid contact id" }, { status:400 });
  try {
    await connectDB();
    const r = await Contact.findByIdAndDelete(params.id);
    if (!r) return NextResponse.json({ error:"Contact not found" }, { status:404 });
    return NextResponse.json({ ok:true });
  } catch (e) {
    return NextResponse.json({ error:e.message || "Delete failed" }, { status:500 });
  }
}
