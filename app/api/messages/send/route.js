export const dynamic = "force-dynamic";
import { NextResponse }              from "next/server";
import { connectDB }                 from "@/lib/mongodb";
import Message                       from "@/models/Message";
import Conversation                  from "@/models/Conversation";
import { sendText, sendTemplate }    from "@/lib/flaxxa";
import { sendGupshupText, sendGupshupTemplate } from "@/lib/gupshup";

export async function POST(req) {
  await connectDB();
  const { phone, type, message, templateName, templateLang, params, contactName, agentName, provider } = await req.json();

  // Determine provider: explicit override > conversation's stored provider > default flaxxa
  let useProvider = provider;
  if (!useProvider) {
    const convo = await Conversation.findOne({ phone }).select("provider").lean();
    useProvider = convo?.provider || "flaxxa";
  }

  const isGupshup = useProvider === "gupshup";

  let data;
  if (isGupshup) {
    data = type==="template"
      ? await sendGupshupTemplate(phone, templateName, params||[])
      : await sendGupshupText(phone, message);
  } else {
    data = type==="template"
      ? await sendTemplate(phone, templateName, templateLang, params)
      : await sendText(phone, message);
  }

  const ok = isGupshup
    ? (data?.ok !== undefined ? data.ok : data?.status==="submitted")
    : (data?.status==="success"||data?.message_id||data?.message_wamid);

  if (!ok) return NextResponse.json({ error:data?.error||data?.message||"Send failed" }, { status:400 });

  const wamid = isGupshup ? (data?.wamid||data?.messageId||"") : (data?.message_wamid||String(data?.message_id||""));

  await Message.create({
    contactPhone: phone, contactName, type,
    body: message||`[${templateName}]`, templateName, params,
    status:"sent", agentName, provider:useProvider,
    wamid,
  });

  await Conversation.findOneAndUpdate(
    { phone },
    {
      $set:{
        name: contactName,
        lastMessageAt: new Date(),
        lastMessageText: (message||`[${templateName}]`).slice(0,100),
        lastMessageDir: "outbound",
        unreadCount: 0,
        provider: useProvider,
      },
      $setOnInsert:{ phone, createdAt:new Date(), status:"pending" },
    },
    { upsert:true }
  );

  return NextResponse.json({ ok:true, wamid, provider:useProvider });
}
