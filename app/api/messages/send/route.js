import { sendText, sendTemplate } from "@/lib/flaxxa";
import { connectDB }              from "@/lib/mongodb";
import Message                    from "@/models/Message";
import { NextResponse }           from "next/server";

export async function POST(req) {
  await connectDB();
  const { phone, type, message, templateName, templateLang, params, contactName } = await req.json();

  try {
    let data;
    if (type === "template") {
      data = await sendTemplate(phone, templateName, templateLang, params);
    } else {
      data = await sendText(phone, message);
    }

    const ok   = data?.status === "success" || data?.message_id || data?.message_wamid;
    const wamid = data?.message_wamid || String(data?.message_id || "");

    await Message.create({
      contactPhone: phone, contactName,
      type, body: message || `[Template: ${templateName}]`,
      templateName, params,
      status: ok ? "sent" : "failed",
      wamid,
    });

    if (!ok) return NextResponse.json({ error: data?.message || "Send failed" }, { status: 400 });
    return NextResponse.json({ success: true, wamid });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
