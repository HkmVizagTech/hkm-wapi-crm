export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { connectDB }    from "@/lib/mongodb";
import User             from "@/models/User";
import bcrypt           from "bcryptjs";

export async function PATCH(req, { params }) {
  await connectDB();
  const { name, password, role, active } = await req.json();
  const update = {};
  if (name)     update.name   = name;
  if (role)     update.role   = role;
  if (active !== undefined) update.active = active;
  if (password) update.password = await bcrypt.hash(password, 10);
  const user = await User.findByIdAndUpdate(params.id, update, { new:true }).select("-password");
  return NextResponse.json({ user });
}

export async function DELETE(req, { params }) {
  await connectDB();
  await User.findByIdAndDelete(params.id);
  return NextResponse.json({ ok:true });
}
