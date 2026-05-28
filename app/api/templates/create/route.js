export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

export async function POST(req) {
  const body = await req.json();
  const { name, category, language, header, headerFormat, headerText,
          bodyText, footerText, buttons } = body;

  const WABA_ID     = process.env.WABA_ID;
  const META_TOKEN  = process.env.META_TOKEN || process.env.FLAXXA_TOKEN;

  if (!WABA_ID || !META_TOKEN) {
    return NextResponse.json({
      error: "WABA_ID and META_TOKEN env vars required. Set them in Railway.",
      hint:  "Find WABA_ID in Meta Business Manager → WhatsApp → API Setup"
    }, { status: 400 });
  }

  // Build components array
  const components = [];

  // Header
  if (header && headerText) {
    components.push({
      type:   "HEADER",
      format: headerFormat || "TEXT",
      text:   headerText,
    });
  }

  // Body (required)
  if (bodyText) {
    const examples = [];
    const matches  = [...bodyText.matchAll(/\{\{(\d+)\}\}/g)];
    if (matches.length > 0) {
      examples.push(matches.map(m => `Sample value ${m[1]}`));
    }
    components.push({
      type:    "BODY",
      text:    bodyText,
      ...(examples.length > 0 ? { example: { body_text: examples } } : {}),
    });
  }

  // Footer
  if (footerText) {
    components.push({ type: "FOOTER", text: footerText });
  }

  // Buttons
  if (buttons?.length) {
    components.push({
      type: "BUTTONS",
      buttons: buttons.map(b => {
        if (b.type === "QUICK_REPLY") return { type:"QUICK_REPLY", text:b.text };
        if (b.type === "URL")         return { type:"URL",         text:b.text, url:b.url };
        if (b.type === "PHONE_NUMBER")return { type:"PHONE_NUMBER",text:b.text, phone_number:b.phone };
        return { type:"QUICK_REPLY", text:b.text };
      }),
    });
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${WABA_ID}/message_templates`,
      {
        method:  "POST",
        headers: { "Content-Type":"application/json",
                   "Authorization":`Bearer ${META_TOKEN}` },
        body: JSON.stringify({ name, category, language, components }),
      }
    );
    const data = await res.json();
    if (res.ok && data.id) {
      return NextResponse.json({ ok:true, templateId:data.id, status:data.status });
    }
    return NextResponse.json({ error: data.error?.message || "Submission failed", detail: data }, { status:400 });
  } catch(e) {
    return NextResponse.json({ error: e.message }, { status:500 });
  }
}
