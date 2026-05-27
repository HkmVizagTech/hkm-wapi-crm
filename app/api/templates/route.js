import { getTemplates } from "@/lib/flaxxa";
import { NextResponse }  from "next/server";

export async function GET() {
  try {
    const data = await getTemplates();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
