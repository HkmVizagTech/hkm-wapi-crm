/**
 * AI Action Handler
 * Executes actions triggered by Gemini AI decisions
 */
import { connectDB } from "./mongodb.js";
import Contact       from "../models/Contact.js";
import Message       from "../models/Message.js";

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
  console.log(`🚨 Escalated to human: ${phone}`);
}

// Action: Check donation history from Campaigner
export async function checkDonation(phone) {
  try {
    const campaignerUrl = process.env.CAMPAIGNER_API_URL;
    if (!campaignerUrl) return null;
    const r = await fetch(`${campaignerUrl}/api/donations?phone=${phone}`, {
      headers:{ "Authorization": `Bearer ${process.env.CAMPAIGNER_API_KEY}` }
    });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

// Action: Execute based on Gemini's action string
export async function executeAction(actionName, { phone, contactName, message }) {
  switch(actionName) {
    case "register_interest":
      await registerInterest(phone, contactName);
      break;
    case "escalate_to_human":
      await escalateToHuman(phone, contactName, message);
      break;
    case "check_donation":
      return await checkDonation(phone);
    default:
      break;
  }
  return null;
}
