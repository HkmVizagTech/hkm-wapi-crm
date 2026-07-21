export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { connectDB }    from "@/lib/mongodb";
import User             from "@/models/User";
import bcrypt           from "bcryptjs";

export async function GET() {
  await connectDB();
  const users = await User.find().select("-password").sort({ createdAt:-1 }).lean();
  return NextResponse.json({ users });
}

export async function POST(req) {
  await connectDB();
  const { name, email, password, role } = await req.json();
  if (!name||!email||!password) 
    return NextResponse.json({ error:"name, email and password required" }, { status:400 });

  const existing = await User.findOne({ email:email.toLowerCase() });
  if (existing) return NextResponse.json({ error:"Email already exists" }, { status:400 });

  const hashed = await bcrypt.hash(password, 10);
  const user   = await User.create({ name, email, password:hashed, role:role||"viewer" });
  return NextResponse.json({ user:{ _id:user._id, name:user.name, email:user.email, role:user.role } }, { status:201 });
}
