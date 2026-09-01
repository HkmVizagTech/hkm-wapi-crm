export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { connectDB }    from "@/lib/mongodb";
import Conversation     from "@/models/Conversation";

export async function POST(req, { params }) {
  await connectDB();
  const { text, author } = await req.json();
  const convo = await Conversation.findOneAndUpdate(
    { phone:params.phone },
    { $push:{ notes:{ text, author, createdAt:new Date() } } },
    { upsert:true, new:true }
  );
  return NextResponse.json({ notes:convo.notes });
}
