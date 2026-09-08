/**
 * AI Action Handler
 * Executes actions triggered by Gemini AI decisions
 * Returns a result object that webhooks can use.
 */
import { connectDB }       from "./mongodb.js";
import Contact             from "../models/Contact.js";
import Message             from "../models/Message.js";
import { sendGupshupText } from "./gupshup.js";
import { sendText }        from "./flaxxa.js";

export const DONATION_LINK = "https://harekrishnavizag.org/donate";

// Action: Register donation interest in CRM
export async function registerInterest(phone, contactName, sevaType="General") {
  await connectDB();
  await Contact.findOneAndUpdate(
    { phone },
    {
      $set:{
        name: contactName||phone,
        aiStatus: "interested",
        lastInterestAt: new Date(),
        interestedIn: sevaType,
      },
      $setOnInsert:{ phone, addedAt:new Date() }
    },
    { upsert:true }
  );
  console.log(`✅ Registered interest: ${phone} → ${sevaType}`);
  return { ok:true, interest:sevaType };
}

// Action: Escalate to human
export async function escalateToHuman(phone, contactName, reason="AI could not handle") {
  await connectDB();
  await Contact.findOneAndUpdate(
    { phone },
    {
      $set:{
        name: contactName||phone,
        aiStatus: "needs_human",
        escalatedAt: new Date(),
        escalationReason: reason,
      },
      $setOnInsert:{ phone, addedAt:new Date() }
    },
    { upsert:true }
  );
  console.log(`🚨 Escalated to human: ${phone} (${reason})`);
  return { ok:true, escalated:true };
}

// Action: Check donation history from Campaigner
export async function checkDonation(phone) {
  try {
    const campaignerUrl = process.env.CAMPAIGNER_API_URL;
    if (!campaignerUrl) return { ok:true, source:"external" };
    const r = await fetch(`${campaignerUrl}/api/donations?phone=${phone}`, {
      headers:{ "Authorization": `Bearer ${process.env.CAMPAIGNER_API_KEY}` }
    });
    if (!r.ok) return { ok:true, source:"external" };
    return { ok:true, source:"external", data:await r.json() };
  } catch { return { ok:true, source:"external" }; }
}

// Action: Provide donation payment link (logs interest)
export async function getPaymentLink(phone, contactName, sevaType="General") {
  await registerInterest(phone, contactName, sevaType);
  return { ok:true, link:DONATION_LINK };
}

// Action: Send donation link to the devotee via WhatsApp
export async function sendDonationLink(phone, contactName, sevaType="General", provider="gupshup") {
  await registerInterest(phone, contactName, sevaType);
  const msg = `Hare Krishna 🙏\n\nYou can make your donation here:\n${DONATION_LINK}\n\nHare Krishna Movement Visakhapatnam (ISKCON Gambheeram)`;
  const sent = provider === "gupshup"
    ? await sendGupshupText(phone, msg)
    : await sendText(phone, msg);

  await Message.create({
    contactPhone: phone, contactName, direction:"outbound",
    type:"text", body:msg, status: sent.ok ? "sent" : "failed",
    sentAt:new Date(), isAiGenerated:true, provider,
    wamid: sent.wamid||"",
  });
  console.log(`🧾 Donation link sent: ${phone} via ${provider}:`, sent.ok?"OK":"FAIL");
  return { ok:sent.ok, link:DONATION_LINK, sent };
}

// Action: Receipt request — not automated yet, escalate to staff
export async function getReceipt(phone, contactName) {
  await escalateToHuman(phone, contactName, "Devotee requested donation receipt");
  return { ok:true, escalated:true };
}

// Action: Execute based on Gemini's action string
export async function executeAction(actionName, { phone, contactName, message, provider="gupshup" }) {
  switch(actionName) {
    case "register_interest":
      return await registerInterest(phone, contactName);
    case "escalate_to_human":
      return await escalateToHuman(phone, contactName, message || "AI could not handle");
    case "check_donation":
      return await checkDonation(phone);
    case "get_payment_link":
      return await getPaymentLink(phone, contactName);
    case "send_donation_link":
      return await sendDonationLink(phone, contactName, undefined, provider);
    case "get_receipt":
      return await getReceipt(phone, contactName);
    default:
      return null;
  }
}