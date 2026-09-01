export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { connectDB }    from "@/lib/mongodb";
import Conversation     from "@/models/Conversation";

export async function GET(req, { params }) {
  await connectDB();
  const convo = await Conversation.findOne({ phone:params.phone }).lean();
  return NextResponse.json({ conversation:convo });
}

export async function PATCH(req, { params }) {
  await connectDB();
  const body = await req.json();
  const update = {};

  if (body.assignedTo !== undefined) {
    update.assignedTo = body.assignedTo;
    update.assignedAt = new Date();
  }
  if (body.status) {
    update.status = body.status;
    if (body.status === "resolved") {
      update.resolvedAt = new Date();
      update.resolvedBy = body.resolvedBy || body.assignedTo;
    }
  }
  if (body.priority)          update.priority = body.priority;
  if (body.labels)            update.labels = body.labels;
  if (body.aiMode)            update.aiMode = body.aiMode;
  if (body.unreadCount !== undefined) update.unreadCount = body.unreadCount;

  const convo = await Conversation.findOneAndUpdate(
    { phone:params.phone }, { $set:update }, { upsert:true, new:true }
  );
  return NextResponse.json({ conversation:convo });
}
