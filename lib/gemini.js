/**
 * Gemini AI Integration for HKM Vizag WhatsApp Assistant
 */
import { HKM_KNOWLEDGE } from "./ai-knowledge.js";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";
const GEMINI_API   = model => `https://generativelanguage.googleapis.com/v1beta/models/${model}`;

// Fallback models in case the primary is overloaded (503/429) or unavailable
const FALLBACK_MODELS = ["gemini-flash-latest", "gemini-3.6-flash"];

async function callGemini(apiKey, prompt, config={}) {
  const models = [GEMINI_MODEL, ...FALLBACK_MODELS.filter(m=>m!==GEMINI_MODEL)];
  let lastErr = null;
  for (let attempt = 0; attempt < (config.maxRetries||3); attempt++) {
    for (const model of models) {
      try {
        const r = await fetch(`${GEMINI_API(model)}:generateContent`, {
          method:"POST",
          headers:{ "Content-Type":"application/json", "X-goog-api-key":apiKey },
          body: JSON.stringify({
            contents:[{ parts:[{ text: prompt }] }],
            generationConfig:{ temperature: config.temperature ?? 0.7, maxOutputTokens: config.maxTokens || 1024, topP: config.topP ?? 0.9 },
            safetySettings:[
              { category:"HARM_CATEGORY_HARASSMENT",        threshold:"BLOCK_MEDIUM_AND_ABOVE" },
              { category:"HARM_CATEGORY_HATE_SPEECH",       threshold:"BLOCK_MEDIUM_AND_ABOVE" },
              { category:"HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold:"BLOCK_MEDIUM_AND_ABOVE" },
              { category:"HARM_CATEGORY_DANGEROUS_CONTENT", threshold:"BLOCK_MEDIUM_AND_ABOVE" },
            ],
          }),
        });
        const d = await r.json().catch(()=>({}));
        if (!r.ok) {
          const err = d?.error?.status || r.status;
          console.warn(`Gemini ${model} ${err}: ${(d?.error?.message||"").slice(0,120)}`);
          lastErr = d?.error?.message || `HTTP ${r.status}`;
          // Model overload/rate-limit/gone → try next model
          if ([401,403].includes(r.status)) return null; // auth issue, don't retry
          continue;
        }
        return d;
      } catch(e) {
        console.warn(`Gemini ${model} network error:`, e.message);
        lastErr = e.message;
      }
    }
    if (attempt < (config.maxRetries||3) - 1) {
      await new Promise(res => setTimeout(res, 1200 * (attempt + 1)));
    }
  }
  console.error("Gemini failed after retries:", lastErr);
  return null;
}

// Actions the AI can trigger — all handled by lib/ai-actions.js executeAction()
const ACTIONS = {
  CHECK_DONATION:     "check_donation",
  GET_PAYMENT_LINK:   "get_payment_link",
  REGISTER_INTEREST:  "register_interest",
  ESCALATE_TO_HUMAN:  "escalate_to_human",
  GET_RECEIPT:        "get_receipt",
  SEND_DONATION_LINK: "send_donation_link",
};

// Strip Markdown so replies render cleanly on WhatsApp
function sanitizeWhatsApp(text) {
  if (!text) return text;
  return text
    .replace(/```[\s\S]*?```/g, m => m.replace(/```/g,"").trim())
    .replace(/\*\*([^*]+)\*\*/g, "$1")   // bold **x**
    .replace(/\*([^*\n]+)\*/g, "$1")     // italic *x*
    .replace(/`([^`]+)`/g, "$1")         // inline code
    .replace(/^#{1,6}\s+/gm, "")         // headings #
    .replace(/\s*\n{3,}/g, "\n\n")       // collapse excess blank lines
    .trim();
}

// Heuristic fallback when the model omits the ACTION tag
function inferAction(message, reply) {
  const m = message.toLowerCase();
  if (/receipt|donation st[a-z]*|donation hist|payment st[a-z]*/.test(m)) return ACTIONS.GET_RECEIPT;
  if (/donat|seva|annadana|sponsor|offer|contribute|give|pay|link|upi|gpay|phone pe/.test(m)) return ACTIONS.REGISTER_INTEREST;
  if (/human|customer care|call me|talk to (someone|staff|team|person)|agent|speak/.test(m)) return ACTIONS.ESCALATE_TO_HUMAN;
  return null;
}

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
3. If they want to donate → give this link directly: https://harekrishnavizag.org/donate AND append ACTION:register_interest
4. If they ask for the payment/donation link → give the link directly
5. If they ask about their donation status/history → say you'll have our team check and append ACTION:check_donation
6. If they ask for a donation receipt → say our team will send it to them and append ACTION:get_receipt
7. If the query is beyond your scope or needs staff help → append ACTION:escalate_to_human
8. Never invent donation amounts, receipt numbers, or promises

Respond with ONLY the message text. If you need to trigger an action, end with:
ACTION:action_name

Example: "Hare Krishna! 🙏 You can make your donation here: https://harekrishnavizag.org/donate
ACTION:register_interest"`;

  try {
    const d = await callGemini(apiKey, prompt, { temperature:0.7, maxTokens:1024, topP:0.9, maxRetries:3 });
    if (!d) throw new Error("Gemini request failed");
    const text = d.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Parse action from response (robust to newlines/spacing)
    const actionMatch = text.match(/ACTION:\s*(\w+)/);
    let action = actionMatch ? actionMatch[1] : null;
    const reply  = sanitizeWhatsApp(text.replace(/\s*ACTION:\s*\w+/,""));

    // Fallback: if model forgot the ACTION tag, infer intent from the message
    if (!action && reply) {
      action = inferAction(message, reply) || null;
    }

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
    const d = await callGemini(apiKey, prompt, { temperature:0.8, maxTokens:300, maxRetries:2 });
    if (!d) return null;
    return sanitizeWhatsApp(d.candidates?.[0]?.content?.parts?.[0]?.text) || null;
  } catch { return null; }
}