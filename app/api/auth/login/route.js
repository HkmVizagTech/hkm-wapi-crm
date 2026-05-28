export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
export async function POST(req) {
  const { email, password } = await req.json();
  if (email === (process.env.ADMIN_EMAIL||"admin@hkmvizag.org") &&
      password === (process.env.ADMIN_PASSWORD||"hkm@admin123")) {
    return NextResponse.json({ ok:true });
  }
  return NextResponse.json({ error:"Invalid credentials" }, { status:401 });
}
