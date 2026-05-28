export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { connectDB }    from "@/lib/mongodb";
import Message          from "@/models/Message";
import Contact          from "@/models/Contact";

/* ── GET — Meta webhook verification ── */
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const mode      = searchParams.get("hub.mode");
  const token     = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || "hkm_vizag_webhook_2025";

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook verified ✅");
    return new Response(challenge, { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

/* ── POST — Incoming messages from Meta ── */
export async function POST(req) {
  try {
    await connectDB();
    const body = await req.json();

    // Meta sends messages inside entry[].changes[].value
    const entries = body?.entry || [];
    for (const entry of entries) {
      const changes = entry?.changes || [];
      for (const change of changes) {
        const value = change?.value;
        if (!value) continue;

        // ── Incoming messages ──────────────────────────
        const messages = value?.messages || [];
        for (const msg of messages) {
          const phone   = msg.from;
          const wamid   = msg.id;
          const type    = msg.type; // text, image, document, audio, etc
          const timestamp = new Date(parseInt(msg.timestamp) * 1000);

          // Extract body text
          let body_text = "";
          if (type === "text")       body_text = msg.text?.body || "";
          else if (type === "image") body_text = msg.image?.caption || "[Image]";
          else if (type === "document") body_text = msg.document?.filename || "[Document]";
          else if (type === "audio") body_text = "[Audio]";
          else if (type === "video") body_text = "[Video]";
          else if (type === "location") body_text = `[Location: ${msg.location?.latitude},${msg.location?.longitude}]`;
          else if (type === "button") body_text = msg.button?.text || "[Button Reply]";
          else body_text = `[${type}]`;

          // Get contact name from contacts array
          const contactInfo = value?.contacts?.find(c => c.wa_id === phone);
          const contactName = contactInfo?.profile?.name || phone;

          // Save message to DB
          await Message.findOneAndUpdate(
            { wamid },
            {
              $setOnInsert: {
                contactPhone: phone,
                contactName,
                direction:    "inbound",
                type,
                body:         body_text,
                status:       "received",
                wamid,
                sentAt:       timestamp,
              }
            },
            { upsert: true }
          );

          // Update or create contact
          await Contact.findOneAndUpdate(
            { phone },
            {
              $set:         { lastMessageAt: timestamp, name: contactName },
              $setOnInsert: { phone, name: contactName, addedAt: new Date() },
              $inc:         { totalMessagesSent: 0 },
            },
            { upsert: true }
          );
        }

        // ── Delivery / read status updates ────────────
        const statuses = value?.statuses || [];
        for (const s of statuses) {
          const statusMap = { sent:"sent", delivered:"delivered", read:"read", failed:"failed" };
          const newStatus = statusMap[s.status];
          if (newStatus && s.id) {
            await Message.findOneAndUpdate(
              { wamid: s.id },
              { $set: { status: newStatus,
                ...(newStatus==="delivered" ? { deliveredAt: new Date(parseInt(s.timestamp)*1000) } : {}),
                ...(newStatus==="read"      ? { readAt:       new Date(parseInt(s.timestamp)*1000) } : {}),
              }}
            );
          }
        }
      }
    }
    return NextResponse.json({ ok: true });
  } catch(e) {
    console.error("Webhook error:", e.message);
    return NextResponse.json({ ok: true }); // always return 200 to Meta
  }
}
