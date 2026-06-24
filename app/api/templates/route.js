export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const token = process.env.FLAXXA_TOKEN;
    if (!token) return NextResponse.json({ error:"FLAXXA_TOKEN not set" }, { status:400 });

    // cache:"no-store" — prevents Next.js from caching this fetch
    // so new templates appear immediately
    const r = await fetch(
      `https://wapi.flaxxa.com/api/v1/getTemplates?token=${token}&_t=${Date.now()}`,
      { cache:"no-store" }
    );
    const data = await r.json();

    if (data.status === "success" && data.templates?.length) {
      return NextResponse.json(
        { templates: data.templates, source:"live", total:data.templates.length },
        { headers:{ "Cache-Control":"no-store, max-age=0" } }
      );
    }
    return NextResponse.json({ error:data.message||"Failed to fetch", templates:[] }, { status:500 });
  } catch(e) {
    return NextResponse.json({ error:e.message, templates:[] }, { status:500 });
  }
}
