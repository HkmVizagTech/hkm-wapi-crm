export const dynamic = "force-dynamic";
import { NextResponse }              from "next/server";
import { connectDB }                 from "@/lib/mongodb";
import Message                       from "@/models/Message";
import { sendText, sendTemplate }    from "@/lib/flaxxa";
export async function POST(req) {
  await connectDB();
  const { phone, type, message, templateName, templateLang, params, contactName } = await req.json();
  const data = type==="template"
    ? await sendTemplate(phone, templateName, templateLang, params)
    : await sendText(phone, message);
  const ok = data?.status==="success"||data?.message_id||data?.message_wamid;
  if (!ok) return NextResponse.json({ error:data?.message||"Send failed" }, { status:400 });
  await Message.create({ contactPhone:phone, contactName, type,
    body:message||`[${templateName}]`, templateName, params,
    status:"sent", wamid:data?.message_wamid||String(data?.message_id||"") });
  return NextResponse.json({ ok:true, wamid:data?.message_wamid });
}
