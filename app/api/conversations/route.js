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
  // Pagination: first page + "load more" as the list is scrolled
  const limit    = Math.min(100, Math.max(1, parseInt(searchParams.get("limit")) || 30));
  const skip     = Math.max(0, parseInt(searchParams.get("skip")) || 0);

  // "All" is the active inbox: resolved (closed) chats live under the Resolved tab
  let query = filter === "resolved" ? {} : { status: { $ne: "resolved" } };
  if (filter === "mine" && agent)       query.assignedTo = agent;
  else if (filter === "unassigned")     query.assignedTo = { $in:[null,""] };
  else if (filter === "resolved")       query.status = "resolved";
  else if (filter === "open")           query.status = "open";
  else if (filter === "pending")        query.status = "pending";

  if (label)  query.labels = label;
  if (search) query.$or = [
    { name:  { $regex:search.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"), $options:"i" } },
    { phone: { $regex:search.replace(/[.*+?^${}()|[\]\\]/g,"\\$&") } },
  ];

  const rows = await Conversation.find(query)
    .sort({ lastMessageAt:-1, _id:-1 })
    .skip(skip)
    .limit(limit + 1)          // one extra row tells us whether more pages exist
    .lean();
  const hasMore = rows.length > limit;
  const conversations = hasMore ? rows.slice(0, limit) : rows;

  // Later pages don't need the filter-badge counts
  if (skip > 0) return NextResponse.json({ conversations, hasMore });

  // Counts for filter badges
  const counts = {
    all:        await Conversation.countDocuments({ status:{ $ne:"resolved" } }),
    open:       await Conversation.countDocuments({ status:"open" }),
    unassigned: await Conversation.countDocuments({ assignedTo:{ $in:[null,""] } }),
    resolved:   await Conversation.countDocuments({ status:"resolved" }),
    mine:       agent ? await Conversation.countDocuments({ assignedTo:agent }) : 0,
  };

  return NextResponse.json({ conversations, counts, hasMore });
}
