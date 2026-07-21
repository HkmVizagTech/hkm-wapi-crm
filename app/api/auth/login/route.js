export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { connectDB }    from "@/lib/mongodb";
import User             from "@/models/User";
import bcrypt           from "bcryptjs";

export async function POST(req) {
  const { email, password } = await req.json();

  // 1. Check env admin (always works as fallback)
  if (email === (process.env.ADMIN_EMAIL||"admin@hkmvizag.org") &&
      password === (process.env.ADMIN_PASSWORD||"hkm@admin123")) {
    return NextResponse.json({ ok:true, role:"admin", name:"Admin" });
  }

  // 2. Check DB users
  try {
    await connectDB();
    const user = await User.findOne({ email: email.toLowerCase(), active:true });
    if (!user) return NextResponse.json({ error:"Invalid credentials" }, { status:401 });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return NextResponse.json({ error:"Invalid credentials" }, { status:401 });

    await User.findByIdAndUpdate(user._id, { lastLogin:new Date() });
    return NextResponse.json({ ok:true, role:user.role, name:user.name });
  } catch(e) {
    return NextResponse.json({ error:"Invalid credentials" }, { status:401 });
  }
}
