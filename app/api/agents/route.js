export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { connectDB }    from "@/lib/mongodb";
import User             from "@/models/User";

export async function GET() {
  await connectDB();
  // All active users can be agents
  const agents = await User.find({ active:true })
    .select("name email role")
    .lean();
  // Add the env admin as default agent
  const list = [
    { name:"Admin", email:process.env.ADMIN_EMAIL||"admin@hkmvizag.org", role:"admin" },
    ...agents,
  ];
  return NextResponse.json({ agents:list });
}
