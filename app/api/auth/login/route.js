export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

export async function POST(req) {
  const { email, password } = await req.json();
  const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || "admin@hkmvizag.org";
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "hkm@admin123";

  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    return NextResponse.json({ success: true });
  }
  return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
}
