/**
 * Gemini AI Integration for HKM Vizag WhatsApp Assistant
 */
import { HKM_KNOWLEDGE } from "./ai-knowledge.js";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";
const GEMINI_API   = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Actions the AI can trigger
const ACTIONS = {
  CHECK_DONATION:     "check_donation",
  GET_PAYMENT_LINK:   "get_payment_link",
  REGISTER_INTEREST:  "register_interest",
  ESCALATE_TO_HUMAN:  "escalate_to_human",
  GET_RECEIPT:        "get_receipt",
  SEND_DONATION_LINK: "send_donation_link",
};

export async function processWithGemini(phone, contactName, message, conversationHistory=[]) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { reply:"I'm currently unavailable. Please call us at +91 90631 72108. Hare Krishna 🙏", action:null };

  // Build conversation context
  const historyText = conversationHistory.slice(-6).map(m =>
    `${m.direction === "inbound" ? "Devotee" : "Assistant"}: ${m.body}`
  ).join("\n");

  const prompt = `${HKM_KNOWLEDGE}

=== CONVERSATION HISTORY ===
${historyText || "This is the start of the conversation."}

=== CURRENT MESSAGE ===
Devotee (${contactName||phone}): ${message}

=== YOUR TASK ===
1. Respond warmly and helpfully in the same language the devotee used (English/Telugu/mixed)
2. Keep response under 200 words
3. If they want to donate → provide the donation link: https://harekrishnavizag.org/donate
4. If they ask about Annadana → provide: https://harekrishnavizag.org/annadana  
5. If they ask about donation status/receipt → say you'll check and include ACTION:check_donation
6. If the query is beyond your scope → include ACTION:escalate_to_human
7. If they express clear donation intent → include ACTION:register_interest

Respond with ONLY the message text. If you need to trigger an action, end with:
ACTION:action_name

Example: "Hare Krishna! 🙏 You can make your donation here: https://harekrishnavizag.org/donate
ACTION:register_interest"`;

  try {
    const r = await fetch(`${GEMINI_API}?key=${apiKey}`, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({
        contents:[{ parts:[{ text: prompt }] }],
        generationConfig:{
          temperature: 0.7,
          maxOutputTokens: 300,
          topP: 0.9,
        },
        safetySettings:[
          { category:"HARM_CATEGORY_HARASSMENT",        threshold:"BLOCK_MEDIUM_AND_ABOVE" },
          { category:"HARM_CATEGORY_HATE_SPEECH",       threshold:"BLOCK_MEDIUM_AND_ABOVE" },
          { category:"HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold:"BLOCK_MEDIUM_AND_ABOVE" },
          { category:"HARM_CATEGORY_DANGEROUS_CONTENT", threshold:"BLOCK_MEDIUM_AND_ABOVE" },
        ],
      }),
    });

    const d = await r.json();
    const text = d.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Parse action from response
    const actionMatch = text.match(/ACTION:(\w+)/);
    const action = actionMatch ? actionMatch[1] : null;
    const reply  = text.replace(/\nACTION:\w+/,"").trim();

    return { reply, action };
  } catch(e) {
    console.error("Gemini error:", e.message);
    return { 
      reply:"Hare Krishna! 🙏 I'll connect you with our team shortly. You can also reach us at +91 90631 72108.",
      action: ACTIONS.ESCALATE_TO_HUMAN 
    };
  }
}

export async function generateDonationFollowUp(contactName, sevaType="General") {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const prompt = `Write a short, warm WhatsApp follow-up message (under 100 words) for ${contactName||"a devotee"} who expressed interest in ${sevaType} seva at Hare Krishna Movement Visakhapatnam. Be devotional but not pushy. Include the donation link https://harekrishnavizag.org/donate. Start with "Hare Krishna 🙏"`;
  try {
    const r = await fetch(`${GEMINI_API}?key=${apiKey}`, {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ contents:[{ parts:[{ text:prompt }] }], generationConfig:{ temperature:0.8, maxOutputTokens:150 } }),
    });
    const d = await r.json();
    return d.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch { return null; }
}
