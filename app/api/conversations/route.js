export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { connectDB }    from "@/lib/mongodb";
import Conversation     from "@/models/Conversation";

export async function GET(req) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const filter   = searchParams.get("filter") || "all";  // all|mine|unassigned|resolved|open
  const agent    = searchParams.get("agent");
  const search   = searchParams.get("search");
  const label    = searchParams.get("label");

  let query = {};
  if (filter === "mine" && agent)       query.assignedTo = agent;
  else if (filter === "unassigned")     query.assignedTo = { $in:[null,""] };
  else if (filter === "resolved")       query.status = "resolved";
  else if (filter === "open")           query.status = "open";
  else if (filter === "pending")        query.status = "pending";

  if (label)  query.labels = label;
  if (search) query.$or = [
    { name:  { $regex:search, $options:"i" } },
    { phone: { $regex:search } },
  ];

  const conversations = await Conversation.find(query)
    .sort({ lastMessageAt:-1 })
    .limit(100)
    .lean();

  // Counts for filter badges
  const counts = {
    all:        await Conversation.countDocuments({}),
    open:       await Conversation.countDocuments({ status:"open" }),
    unassigned: await Conversation.countDocuments({ assignedTo:{ $in:[null,""] } }),
    resolved:   await Conversation.countDocuments({ status:"resolved" }),
    mine:       agent ? await Conversation.countDocuments({ assignedTo:agent }) : 0,
  };

  return NextResponse.json({ conversations, counts });
}
