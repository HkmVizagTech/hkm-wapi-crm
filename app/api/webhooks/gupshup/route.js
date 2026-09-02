export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { connectDB }    from "@/lib/mongodb";
import Message          from "@/models/Message";
import Contact          from "@/models/Contact";
import Conversation     from "@/models/Conversation";
import Campaign         from "@/models/Campaign";
import { processWithGemini } from "@/lib/gemini";
import { executeAction }     from "@/lib/ai-actions";

export async function GET() {
  return NextResponse.json({ status:"Gupshup webhook active" });
}

export async function POST(req) {
  try {
    await connectDB();
    const body = await req.json();

    // Gupshup payload structure
    const type    = body?.type;              // "message" | "message-event"
    const payload = body?.payload;

    if (!payload) return NextResponse.json({ ok:true });

    /* ── Incoming message ── */
    if (type === "message") {
      const phone       = payload.source;                    // sender number
      const contactName = payload.sender?.name || phone;
      const wamid       = payload.id;
      const msgType     = payload.type;                      // text|image|file etc

      let bodyText="", mediaUrl="", mimeType="";
      switch(msgType) {
        case "text":
          bodyText = payload.payload?.text || "";
          break;
        case "image":
          mediaUrl = payload.payload?.url || "";
          bodyText = payload.payload?.caption || "📷 Photo";
          mimeType = "image/jpeg";
          break;
        case "file":
        case "document":
          mediaUrl = payload.payload?.url || "";
          bodyText = payload.payload?.name || "📄 Document";
          break;
        case "audio":
        case "voice":
          mediaUrl = payload.payload?.url || "";
          bodyText = "🎵 Voice message";
          break;
        case "video":
          mediaUrl = payload.payload?.url || "";
          bodyText = payload.payload?.caption || "🎥 Video";
          break;
        case "location":
          bodyText = `📍 Location: ${payload.payload?.latitude}, ${payload.payload?.longitude}`;
          break;
        default:
          bodyText = `[${msgType}]`;
      }

      await Message.findOneAndUpdate(
        { wamid },
        { $setOnInsert:{
          contactPhone: phone, contactName,
          direction:"inbound", type:msgType, body:bodyText,
          mediaUrl, mimeType, status:"received", wamid,
          provider:"gupshup", sentAt:new Date(),
        }},
        { upsert:true }
      );

      const contact = await Contact.findOneAndUpdate(
        { phone },
        { $set:{ lastMessageAt:new Date(), name:contactName },
          $setOnInsert:{ phone, name:contactName, addedAt:new Date() } },
        { upsert:true, new:true }
      );

      // Sync Conversation
      await Conversation.findOneAndUpdate(
        { phone },
        { $set:{ name:contactName, lastMessageAt:new Date(),
            lastMessageText:bodyText.slice(0,100), lastMessageDir:"inbound",
            status:"open", provider:"gupshup" },
          $inc:{ unreadCount:1 },
          $setOnInsert:{ phone, createdAt:new Date(), aiMode:"auto" } },
        { upsert:true }
      );

      // AI auto-reply
      const aiMode = contact?.aiMode || "auto";
      if (msgType==="text" && aiMode==="auto" && !contact?.doNotContact && process.env.GEMINI_API_KEY) {
        const history = await Message.find({ contactPhone:phone }).sort({ sentAt:-1 }).limit(6).lean();
        history.reverse();
        const { reply, action } = await processWithGemini(phone, contactName, bodyText, history);
        if (action) await executeAction(action, { phone, contactName, message:bodyText });
        if (reply) {
          // Reply via Gupshup session message
          const gbody = new URLSearchParams({
            channel:"whatsapp",
            source: process.env.GUPSHUP_SOURCE||"917075176108",
            destination: phone,
            "src.name": process.env.GUPSHUP_APPNAME||"4KoeJVChI420QyWVhAW1kE7L",
            message: JSON.stringify({ type:"text", text:reply }),
          });
          await fetch("https://api.gupshup.io/wa/api/v1/msg", {
            method:"POST",
            headers:{ "apikey":process.env.GUPSHUP_APIKEY||"sk_0381bd5a455746478c53899f213f838b",
                      "Content-Type":"application/x-www-form-urlencoded" },
            body: gbody.toString(),
          }).catch(()=>{});
          await Message.create({
            contactPhone:phone, contactName, direction:"outbound",
            type:"text", body:reply, status:"sent", sentAt:new Date(),
            isAiGenerated:true, provider:"gupshup",
          });
        }
      }
    }

    /* ── Message status event ── */
    if (type === "message-event") {
      const wamid  = payload.id;
      const status = { sent:"sent", delivered:"delivered", read:"read", failed:"failed" }[payload.type];
      if (status && wamid) {
        await Message.findOneAndUpdate({ wamid }, { $set:{ status } });
        // Update campaign metrics
        if (status==="delivered"||status==="read") {
          const camp = await Campaign.findOne({ "results.wamid":wamid });
          if (camp) {
            const idx = camp.results.findIndex(r=>r.wamid===wamid);
            if (idx>-1) {
              const upd={ $set:{[`results.${idx}.status`]:status} };
              if (status==="delivered"&&camp.results[idx].status==="sent") upd.$inc={delivered:1};
              if (status==="read") upd.$inc={read:1,...(camp.results[idx].status==="sent"?{delivered:1}:{})};
              await Campaign.findByIdAndUpdate(camp._id, upd);
            }
          }
        }
      }
    }

    return NextResponse.json({ ok:true });
  } catch(e) {
    console.error("Gupshup webhook error:", e.message);
    return NextResponse.json({ ok:true });
  }
}
