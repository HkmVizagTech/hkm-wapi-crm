export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { connectDB }    from "@/lib/mongodb";
import Message          from "@/models/Message";
import Contact          from "@/models/Contact";
import Conversation     from "@/models/Conversation";
import Campaign         from "@/models/Campaign";
import { processWithGemini } from "@/lib/gemini";
import { executeAction }     from "@/lib/ai-actions";
import { sendGupshupText }   from "@/lib/gupshup";
import { BUILD_VERSION }     from "@/lib/version";

export async function GET() {
  return NextResponse.json({ status:"Gupshup webhook active" });
}

export async function POST(req) {
  const dbg = {};
  try {
    await connectDB();
    dbg.conn = true;
    const body = await req.json();

    // Gupshup payload structure
    const type    = body?.type;              // "message" | "message-event"
    const payload = body?.payload;

    if (!payload) return NextResponse.json({ ok:true, debug:dbg });

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
      dbg.stored = true;

      const contact = await Contact.findOneAndUpdate(
        { phone },
        { $set:{ lastMessageAt:new Date(), name:contactName },
          $setOnInsert:{ phone, addedAt:new Date() } },
        { upsert:true, new:true }
      );
      dbg.contact = true;

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
      dbg.conversation = true;

      // AI auto-reply / draft
      const aiMode = contact?.aiMode || "auto";
      const aiActive = msgType==="text" && !contact?.doNotContact &&
                       process.env.GEMINI_API_KEY && process.env.AI_ENABLED === "true";
      await Message.updateOne(
        { wamid },
        { $set:{ meta:{
          aiMode, aiActive,
          env:{ geminiKey:!!process.env.GEMINI_API_KEY, aiEnabled:process.env.AI_ENABLED, model:process.env.GEMINI_MODEL },
          msgType, doNotContact:!!contact?.doNotContact,
          build:BUILD_VERSION,
        }}}
      );
      dbg.meta = true;
      dbg.aiMode = aiMode;
      dbg.aiActive = aiActive;
      dbg.env = { geminiKey:!!process.env.GEMINI_API_KEY, aiEnabled:process.env.AI_ENABLED, model:process.env.GEMINI_MODEL };
      dbg.build = BUILD_VERSION;
      if (aiActive && (aiMode==="auto" || aiMode==="draft")) {
        try {
          const history = await Message.find({ contactPhone:phone }).sort({ sentAt:-1 }).limit(6).lean();
          history.reverse();
          const { reply, action } = await processWithGemini(phone, contactName, bodyText, history);
          if (action) await executeAction(action, { phone, contactName, message:bodyText, provider:"gupshup" });
          let finalReply = reply;
          if (action === "register_interest") {
            if (!finalReply) finalReply = `Hare Krishna 🙏 You can donate here: https://harekrishnavizag.org/donate`;
            else if (!finalReply.includes("harekrishnavizag.org/donate")) finalReply += `\n\nDonate here: https://harekrishnavizag.org/donate`;
          }
          if (finalReply) {
            if (aiMode === "auto") {
              const sent = await sendGupshupText(phone, finalReply);
              await Message.create({
                contactPhone:phone, contactName, direction:"outbound",
                type:"text", body:finalReply, status: sent.ok ? "sent" : "failed",
                sentAt:new Date(), isAiGenerated:true, provider:"gupshup",
                wamid:sent.wamid||"",
              });
            } else {
              // Draft mode — save AI suggestion, staff approves/sends in inbox
              await Message.create({
                contactPhone:phone, contactName, direction:"outbound",
                type:"text", body:finalReply, status:"draft",
                sentAt:new Date(), isAiGenerated:true, provider:"gupshup",
              });
              console.log("✏️ AI draft saved for:", phone);
            }
          }
        } catch(aiErr) {
          console.error(`🤖 AI pipeline error for ${phone}:`, aiErr.message);
          await Message.create({
            contactPhone:phone, contactName, direction:"outbound",
            type:"text", body:"[AI pipeline error]", status:"failed",
            sentAt:new Date(), isAiGenerated:true, provider:"gupshup",
            meta:{ aiError:aiErr.message },
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

    return NextResponse.json({ ok:true, debug:dbg });
  } catch(e) {
    console.error("Gupshup webhook error:", e.message);
    dbg.error = e.message;
    return NextResponse.json({ ok:true, debug:dbg });
  }
}
