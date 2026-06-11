export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { connectDB }    from "@/lib/mongodb";
import Message          from "@/models/Message";
import Contact          from "@/models/Contact";
import Campaign         from "@/models/Campaign";

/* ── GET — Meta webhook verification ── */
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

/* ── POST — Incoming messages + delivery status ── */
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
          if      (type==="text")     bodyText = msg.text?.body||"";
          else if (type==="image")    bodyText = msg.image?.caption||"[Image]";
          else if (type==="document") bodyText = msg.document?.filename||"[Document]";
          else if (type==="audio")    bodyText = "[Audio]";
          else if (type==="video")    bodyText = "[Video]";
          else if (type==="button")   bodyText = msg.button?.text||"[Button Reply]";
          else                        bodyText = `[${type}]`;

          const contactName = value?.contacts?.find(c=>c.wa_id===phone)?.profile?.name || phone;

          await Message.findOneAndUpdate(
            { wamid },
            { $setOnInsert: {
              contactPhone:phone, contactName,
              direction:"inbound", type, body:bodyText,
              status:"received", wamid, sentAt:timestamp,
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
          const newStatus = { sent:"sent", delivered:"delivered", read:"read", failed:"failed" }[s.status];
          if (!newStatus || !wamid) continue;

          const timestamp = new Date(parseInt(s.timestamp) * 1000);

          // Update message record
          const msg = await Message.findOneAndUpdate(
            { wamid },
            { $set: {
              status: newStatus,
              ...(newStatus==="delivered" ? { deliveredAt:timestamp } : {}),
              ...(newStatus==="read"      ? { readAt:timestamp }      : {}),
            }},
            { new:true }
          );

          // Update campaign result if this message belongs to a campaign
          if (newStatus==="delivered" || newStatus==="read") {
            // Find campaign that has this wamid in its results
            const campaign = await Campaign.findOne({ "results.wamid": wamid });
            if (campaign) {
              const idx = campaign.results.findIndex(r => r.wamid === wamid);
              if (idx > -1) {
                const oldStatus = campaign.results[idx].status;
                const update = { $set: { [`results.${idx}.status`]: newStatus } };

                // Only increment delivered if not already delivered/read
                if (newStatus==="delivered" && oldStatus==="sent") {
                  update.$inc = { delivered:1 };
                } else if (newStatus==="read") {
                  if (oldStatus==="sent")      update.$inc = { delivered:1, read:1 };
                  if (oldStatus==="delivered") update.$inc = { read:1 };
                }

                await Campaign.findByIdAndUpdate(campaign._id, update);
              }
            }
          }

          // Handle failed status
          if (newStatus==="failed") {
            const campaign = await Campaign.findOne({ "results.wamid": wamid });
            if (campaign) {
              const idx = campaign.results.findIndex(r => r.wamid === wamid);
              if (idx > -1) {
                const oldStatus = campaign.results[idx].status;
                const update = { $set: { [`results.${idx}.status`]: "failed" } };
                if (oldStatus==="sent") update.$inc = { sent:-1, failed:1 };
                await Campaign.findByIdAndUpdate(campaign._id, update);
              }
            }
          }
        }
      }
    }

    return NextResponse.json({ ok:true });
  } catch(e) {
    console.error("Webhook error:", e.message);
    return NextResponse.json({ ok:true }); // always 200 to Meta
  }
}
