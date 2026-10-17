export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { connectDB }    from "@/lib/mongodb";
import Contact          from "@/models/Contact";
// GET /api/contacts                      → every contact (legacy)
// GET /api/contacts?limit=40&skip=0&q=   → one page + total + hasMore (infinite scroll)
export async function GET(req) {
  await connectDB();
  const sp = new URL(req.url).searchParams;
  if (!sp.get("limit")) {
    const contacts = await Contact.find().sort({ addedAt:-1 }).lean();
    return NextResponse.json({ contacts });
  }
  const limit = Math.min(200, Math.max(1, parseInt(sp.get("limit")) || 40));
  const skip  = Math.max(0, parseInt(sp.get("skip")) || 0);
  const q     = (sp.get("q") || "").trim();
  const esc   = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const query = q ? { $or:[{ name:{ $regex:esc, $options:"i" } }, { phone:{ $regex:esc } }] } : {};
  const status = sp.get("status");
  if (status === "dnc") query.doNotContact = true;
  else if (["new","interested","needs_human","donated","completed"].includes(status)) query.aiStatus = status;
  const SORTABLE = ["addedAt","name","totalMessagesSent","lastMessageAt","phone"];
  const sortKey  = SORTABLE.includes(sp.get("sort")) ? sp.get("sort") : "addedAt";
  const sortDir  = sp.get("dir") === "asc" ? 1 : -1;
  const [rows, total] = await Promise.all([
    Contact.find(query).sort({ [sortKey]:sortDir, _id:-1 }).skip(skip).limit(limit + 1).lean(),
    skip === 0 ? Contact.countDocuments(query) : Promise.resolve(undefined),
  ]);
  const hasMore = rows.length > limit;
  return NextResponse.json({ contacts: hasMore ? rows.slice(0, limit) : rows, hasMore, ...(total !== undefined && { total }) });
}
export async function POST(req) {
  await connectDB();
  const body = await req.json();
  try {
    const c = await Contact.create(body);
    return NextResponse.json({ contact:c }, { status:201 });
  } catch(e) { return NextResponse.json({ error:e.message }, { status:400 }); }
}
