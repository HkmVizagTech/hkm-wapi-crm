export const dynamic = "force-dynamic";
import { NextResponse }        from "next/server";
import { getGupshupTemplates } from "@/lib/gupshup";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const provider = searchParams.get("provider") || "flaxxa";

  try {
    if (provider === "gupshup") {
      const templates = await getGupshupTemplates();
      // Normalize Gupshup format to match Flaxxa shape used by frontend
      const normalized = templates.map(t => {
        // data field has body + footer/buttons joined by newlines; take first paragraph block as body
        const bodyText = (t.data||"").split("\n\n").slice(0, -1).join("\n\n") || t.data || "";
        return {
          id: t.id, name: t.elementName, status: t.status,
          category: t.category, language: t.languageCode,
          components: JSON.stringify([
            ...(["IMAGE","VIDEO","DOCUMENT"].includes(t.templateType)
              ? [{type:"HEADER", format:t.templateType}] : []),
            {type:"BODY", text: bodyText || t.data || ""},
          ]),
        };
      });
      return NextResponse.json({ templates:normalized, source:"gupshup-live", total:normalized.length });
    }

    // Flaxxa (default)
    const token = process.env.FLAXXA_TOKEN;
    if (!token) return NextResponse.json({ error:"FLAXXA_TOKEN not set" }, { status:400 });
    const r = await fetch(
      `https://wapi.flaxxa.com/api/v1/getTemplates?token=${token}&_t=${Date.now()}`,
      { cache:"no-store" }
    );
    const data = await r.json();
    if (data.status === "success" && data.templates?.length) {
      return NextResponse.json(
        { templates: data.templates, source:"flaxxa-live", total:data.templates.length },
        { headers:{ "Cache-Control":"no-store, max-age=0" } }
      );
    }
    return NextResponse.json({ error:data.message||"Failed to fetch", templates:[] }, { status:500 });
  } catch(e) {
    return NextResponse.json({ error:e.message, templates:[] }, { status:500 });
  }
}
