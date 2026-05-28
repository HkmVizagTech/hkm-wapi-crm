export const dynamic = "force-dynamic";
import { NextResponse }  from "next/server";
import { getTemplates }  from "@/lib/flaxxa";
export async function GET() {
  try { return NextResponse.json(await getTemplates()); }
  catch(e) { return NextResponse.json({ error:e.message }, { status:500 }); }
}
