export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { connectDB }    from "@/lib/mongodb";
import Message          from "@/models/Message";
import Contact          from "@/models/Contact";
import Campaign         from "@/models/Campaign";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const mode      = searchParams.get("hub.mode");
  const token     = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");
  const VERIFY    = process.env.WEBHOOK_VERIFY_TOKEN || "hkm_vizag_webhook_2025";
  if (mode === "subscribe" && token === VERIFY) {
    return new Response(challenge, { status:200 });
  }
  return new Response("Forbidden", { status:403 });
}

export async function POST(req) {
  try {
    await connectDB();
    const body = await req.json();

    for (const entry of (body?.entry||[])) {
      for (const change of (entry?.changes||[])) {
        const value = change?.value;
        if (!value) continue;

        /* ── Incoming messages ── */
        for (const msg of (value?.messages||[])) {
          const phone     = msg.from;
          const wamid     = msg.id;
          const type      = msg.type;
          const timestamp = new Date(parseInt(msg.timestamp) * 1000);

          let bodyText = "";
          let mediaUrl = "";
          let mimeType = "";

          switch(type) {
            case "text":
              bodyText = msg.text?.body || "";
              break;
            case "image":
              bodyText = msg.image?.caption || "";
              mediaUrl = msg.image?.url || msg.image?.link || "";
              mimeType = msg.image?.mime_type || "image/jpeg";
              if (!bodyText) bodyText = "📷 Photo";
              break;
            case "video":
              bodyText = msg.video?.caption || "";
              mediaUrl = msg.video?.url || msg.video?.link || "";
              mimeType = msg.video?.mime_type || "video/mp4";
              if (!bodyText) bodyText = "🎥 Video";
              break;
            case "audio":
              bodyText = "🎵 Voice message";
              mediaUrl = msg.audio?.url || msg.audio?.link || "";
              mimeType = msg.audio?.mime_type || "audio/ogg";
              break;
            case "document":
              bodyText = msg.document?.filename || "📄 Document";
              mediaUrl = msg.document?.url || msg.document?.link || "";
              mimeType = msg.document?.mime_type || "application/pdf";
              break;
            case "sticker":
              bodyText = "🎉 Sticker";
              mediaUrl = msg.sticker?.url || "";
              break;
            case "location":
              bodyText = `📍 Location: ${msg.location?.name||""} (${msg.location?.latitude}, ${msg.location?.longitude})`;
              break;
            case "contacts":
              bodyText = `👤 Contact: ${msg.contacts?.[0]?.name?.formatted_name || "Contact shared"}`;
              break;
            case "button":
              bodyText = msg.button?.text || "[Button Reply]";
              break;
            case "interactive":
              bodyText = msg.interactive?.button_reply?.title ||
                         msg.interactive?.list_reply?.title ||
                         "[Interactive Reply]";
              break;
            default:
              bodyText = `[${type}]`;
          }

          const contactName = value?.contacts?.find(c=>c.wa_id===phone)?.profile?.name || phone;

          await Message.findOneAndUpdate(
            { wamid },
            { $setOnInsert: {
              contactPhone: phone,
              contactName,
              direction:    "inbound",
              type,
              body:         bodyText,
              mediaUrl,
              mimeType,
              status:       "received",
              wamid,
              sentAt:       timestamp,
            }},
            { upsert:true }
          );

          await Contact.findOneAndUpdate(
            { phone },
            { $set:{ lastMessageAt:timestamp, name:contactName },
              $setOnInsert:{ phone, name:contactName, addedAt:new Date() } },
            { upsert:true }
          );
        }

        /* ── Delivery / read status updates ── */
        for (const s of (value?.statuses||[])) {
          const wamid     = s.id;
          const newStatus = {sent:"sent",delivered:"delivered",read:"read",failed:"failed"}[s.status];
          if (!newStatus || !wamid) continue;

          const timestamp = new Date(parseInt(s.timestamp) * 1000);

          await Message.findOneAndUpdate(
            { wamid },
            { $set: {
              status: newStatus,
              ...(newStatus==="delivered" ? { deliveredAt:timestamp } : {}),
              ...(newStatus==="read"      ? { readAt:timestamp }      : {}),
            }}
          );

          if (newStatus==="delivered" || newStatus==="read") {
            const campaign = await Campaign.findOne({"results.wamid":wamid});
            if (campaign) {
              const idx = campaign.results.findIndex(r=>r.wamid===wamid);
              if (idx > -1) {
                const oldStatus = campaign.results[idx].status;
                const update = {$set:{[`results.${idx}.status`]:newStatus}};
                if (newStatus==="delivered" && oldStatus==="sent")
                  update.$inc = {delivered:1};
                else if (newStatus==="read") {
                  if (oldStatus==="sent")      update.$inc = {delivered:1,read:1};
                  if (oldStatus==="delivered") update.$inc = {read:1};
                }
                await Campaign.findByIdAndUpdate(campaign._id, update);
              }
            }
          }
        }
      }
    }
    return NextResponse.json({ok:true});
  } catch(e) {
    console.error("Webhook error:", e.message);
    return NextResponse.json({ok:true});
  }
}
