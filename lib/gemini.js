/**
 * Gemini AI Integration for HKM Vizag WhatsApp Assistant
 *
 * Provider order per message: Gemini (waterfalls across its own models,
 * since each model has its own separate free-tier quota) → Groq (a totally
 * separate provider/quota pool, see lib/groq.js) → static offlineFallback()
 * → generic human-escalation message as the last resort.
 */
import { HKM_KNOWLEDGE } from "./ai-knowledge.js";
import { displayBusinessPhone } from "./gupshup.js";
import { callGroq } from "./groq.js";
import { getSiteKnowledge, getCachedContactFacts } from "./site-knowledge.js";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";
const GEMINI_API   = model => `https://generativelanguage.googleapis.com/v1beta/models/${model}`;
const CONTACT_PHONE = displayBusinessPhone();

// Pinned fallback models — NOT "-latest" aliases. Each Gemini model has its own
// separate free-tier quota bucket, so when the primary model returns
// RESOURCE_EXHAUSTED these are tried next rather than giving up immediately.
const FALLBACK_MODELS = ["gemini-2.5-flash", "gemini-3.5-flash-lite"].filter(m => m !== GEMINI_MODEL);

async function callGemini(apiKey, prompt, config={}) {
  const models = [GEMINI_MODEL, ...FALLBACK_MODELS];
  // Once a model comes back exhausted/unauthorized for this key, don't waste
  // later retry rounds calling it again — daily quota won't refill mid-request.
  const deadModels = new Set();
  let lastErr = null;

  for (let attempt = 0; attempt < (config.maxRetries||3); attempt++) {
    for (const model of models) {
      if (deadModels.has(model)) continue;
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
          const msg = d?.error?.message || `HTTP ${r.status}`;
          console.warn(`Gemini ${model} ${err}: ${msg.slice(0,120)}`);
          lastErr = msg;
          // Quota exhausted / auth rejected for THIS model — known to be model-scoped
          // (an "AQ."-format key can be unauthorized for one model and fine for
          // another), so mark it dead and try the next model instead of aborting
          // the whole call the way this used to.
          if ([401,403,429].includes(r.status) || err === "RESOURCE_EXHAUSTED" || /quota/i.test(msg)) {
            deadModels.add(model);
          }
          continue;
        }
        return d;
      } catch(e) {
        console.warn(`Gemini ${model} network error:`, e.message);
        lastErr = e.message;
      }
    }
    if (deadModels.size >= models.length) break; // every model exhausted — no point waiting and retrying
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
  if (/donat|seva|annadana|gita|sponsor|offer|contribute|give|pay|link|upi|gpay|phone pe/.test(m)) return ACTIONS.REGISTER_INTEREST;
  if (/human|customer care|call me|talk to (someone|staff|team|person)|agent|speak/.test(m)) return ACTIONS.ESCALATE_TO_HUMAN;
  return null;
}

// Shared parser for any provider's raw text — Gemini and Groq are given the same
// prompt/contract, so both can be parsed the same way.
function parseModelReply(text, message) {
  const actionMatch = text.match(/ACTION:\s*(\w+)/);
  let action = actionMatch ? actionMatch[1] : null;
  const reply = sanitizeWhatsApp(text.replace(/\s*ACTION:\s*\w+/, ""));
  if (!action && reply) action = inferAction(message, reply) || null;
  return { reply, action };
}

// Static answers for the most common queries when every AI provider is down / quota exceeded.
// `liveContact` is whatever lib/site-knowledge.js last cached from harekrishnavizag.org's
// own API — used here so even this last-resort path shows real, current facts
// instead of numbers baked into this file that can drift out of date.
function offlineFallback(message, liveContact) {
  const m = message.toLowerCase();
  const morningHours = liveContact?.morningHours || "4:30 AM – 1:00 PM";
  const eveningHours = liveContact?.eveningHours || "4:00 PM – 8:30 PM";
  const address = liveContact?.address || "Hare Krishna Movement Visakhapatnam (ISKCON Gambheeram), Gambheeram, Visakhapatnam, Andhra Pradesh";
  const phone = liveContact?.phone || CONTACT_PHONE;

  if (/timing|open|close|darshan|visit|when can i/.test(m) && /temple|darshan|morning|evening/.test(m)) {
    return {
      reply: `Hare Krishna 🙏 Temple timings:\n\n• Morning: ${morningHours}\n• Evening: ${eveningHours}\n\nYou are most welcome to visit Hare Krishna Movement Visakhapatnam (ISKCON Gambheeram). 🙏`,
      action: null
    };
  }
  if (/timing|open|close|darshan|program/i.test(m)) {
    return {
      reply: `Hare Krishna 🙏\n\n• Temple timings: Morning ${morningHours}, Evening ${eveningHours}\n• Bhagavatam class: 8:15 AM daily\n• Sandhya Aarti: 7:00 PM\n• Sunday Festival: 5:00 PM every Sunday\n\nIf you'd like more details, our team is happy to help at ${phone}.`,
      action: null
    };
  }
  if (/address|location|where|find|reach|come|direction|map|state|city|district|located|situated|place|area|which part/i.test(m)) {
    return {
      reply: `Hare Krishna 🙏 Our temple is at: ${address}\n\nWebsite: harekrishnavizag.org\nPhone: ${phone}`,
      action: null
    };
  }
  if (/phone|contact|call|whatsapp|number|reach/i.test(m)) {
    return {
      reply: `Hare Krishna 🙏 You can reach us at:\n\n• Phone / WhatsApp: ${phone}\n• Website: harekrishnavizag.org`,
      action: null
    };
  }
  if (/program|sunday|class|aarti|bhagavat|lecture|kirtan|bal vihar|youth|folk/i.test(m)) {
    return {
      reply: `Hare Krishna 🙏\n\n• Daily Bhagavatam class: 8:15 AM\n• Sandhya Aarti: 7:00 PM\n• Sunday Festival: 5:00 PM every Sunday\n• FOLK youth program & more\n\nFor detailed program schedules, please visit harekrishnavizag.org/events or call ${CONTACT_PHONE}.`,
      action: null
    };
  }
  if (/festival|janmashtami|ratha|ekadashi|gaura|purnima|radhastami|event/i.test(m)) {
    return {
      reply: `Hare Krishna 🙏 We celebrate Janmashtami, Gaura Purnima, Ratha Yatra, Ekadashi and Radhashtami festivals.\n\nFor event dates and registration: harekrishnavizag.org/events\n\nOr call ${CONTACT_PHONE}.`,
      action: null
    };
  }
  if (/receipt|refund|payment status|donation status|donation hist|st[a-z]+ of donation/.test(m)) {
    return {
      reply: `Hare Krishna 🙏 Our team will look into this and get back to you shortly. You can also call us at ${CONTACT_PHONE}.`,
      action: ACTIONS.GET_RECEIPT
    };
  }
  if (/president|vice[- ]?president|who (heads|runs|leads) the temple|temple leadership|temple head|head of the temple|management/.test(m)) {
    return {
      reply: `Hare Krishna 🙏 Hare Krishna Movement Visakhapatnam (ISKCON Gambheeram) is led by:\n\n• Temple President: Niskinchana Bhakta Dasa\n• Vice President: Yaduraja Dasa\n\n(Srila Prabhupada is the founder-acharya of ISKCON worldwide, not the temple president.)`,
      action: null
    };
  }
  const SEVA_PAGES = [
    [/subhojanam|annadan|anna[-\s]*daan|anna dhan|annadanam|bhagavat[-\s]*prasadam|food|meal|feeding/i, "https://annadan.harekrishnavizag.org/"],
    [/sqft|square feet|sft|temple construction|mandir construction|construction/i, "https://www.harekrishnavizag.org/sqft-seva-campaign"],
    [/brick/i, "https://www.harekrishnavizag.org/brick-seva-campaign"],
    [/gau[-\s]*seva|cow|cow protection|goshala|go[-\s]*seva|cow seva/i, "https://www.harekrishnavizag.org/gau-seva"],
    [/gita[-\s]*daan|gita[-\s]*dhan|gita daan/i, "https://www.harekrishnavizag.org/gita-daan-seva"],
    [/vastra|alankara|dressing? the deities|clothes? for the lord|deity (dress|clothes)/i, "https://www.harekrishnavizag.org/alankara-vastra-seva"],
    [/janmashtami/i, "https://www.harekrishnavizag.org/janmashtami"],
    [/radhashtami|radhastami/i, "https://www.harekrishnavizag.org/radhashtami"],
  ];
  if (/donat|seva|gita|annadana|sponsor|offer|contribute|give|pay|link|upi|gpay|phone\s*pe|d[eé]p/.test(m)) {
    const sevaUrl = (SEVA_PAGES.find(([re]) => re.test(m)) || [])[1] || "https://harekrishnavizag.org/donate";
    return {
      reply: `Hare Krishna 🙏 Thank you for your generosity! You can do this seva here: ${sevaUrl}\n\nWe've noted your interest — our team is also available at ${CONTACT_PHONE}.`,
      action: ACTIONS.REGISTER_INTEREST
    };
  }
  return null;
}

async function buildPrompt(contactName, phone, message, conversationHistory) {
  const historyText = conversationHistory.slice(-6).map(m =>
    `${m.direction === "inbound" ? "Devotee" : "Assistant"}: ${m.body}`
  ).join("\n");

  // Live facts from harekrishnavizag.org's own API (address/hours/sevas/events) —
  // see lib/site-knowledge.js. Always resolves from a fast local cache; falls
  // back to an empty string (rare — only if this is the very first request
  // ever and the site's API is also unreachable) rather than failing the reply.
  const liveKnowledge = await getSiteKnowledge().catch(() => "");

  return `${HKM_KNOWLEDGE}
${liveKnowledge ? `\n${liveKnowledge}\n` : ""}
=== CONVERSATION HISTORY ===
${historyText || "This is the start of the conversation."}

=== CURRENT MESSAGE ===
Devotee (${contactName||phone}): ${message}

=== YOUR TASK ===
1. Respond warmly and helpfully in the same language the devotee used (English/Telugu/mixed)
2. Keep response under 200 words
3. If they want to donate or do ANY seva (Annadana, Gita Daan, Gau Seva, monthly, festival, or any name you don't recognize) → look the seva up in the === SEVA LANDING PAGES === section of the knowledge above and give that seva's OWN dedicated page directly (e.g. Subhojanam/Annadan → https://annadan.harekrishnavizag.org/, temple Sqft campaign → https://www.harekrishnavizag.org/sqft-seva-campaign, Gau Seva → https://www.harekrishnavizag.org/gau-seva, etc.). Only for a seva NOT listed there, or a general donation, give https://harekrishnavizag.org/donate. Always append ACTION:register_interest. Donation intent NEVER escalates.
4. If they ask for the payment/donation link → give https://harekrishnavizag.org/donate directly
5. If they ask who is the temple president or who heads this temple → answer: Temple President Niskinchana Bhakta Dasa (Vice President Yaduraja Dasa). Srila Prabhupada is ISKCON's founder-acharya, NOT the temple president — never answer "president" questions with Prabhupada.
6. If they ask about their donation status/history → say you'll have our team check and append ACTION:check_donation
7. If they ask for a donation receipt → say our team will send it to them and append ACTION:get_receipt
8. If they need a human (complaints, refunds, complex personal changes) → append ACTION:escalate_to_human
9. Never invent donation amounts, receipt numbers, or promises
10. If you're unsure about anything non-donation, answer with what you know from your training — don't escalate.

Respond with ONLY the message text. If you need to trigger an action, end with:
ACTION:action_name

Example: "Hare Krishna! 🙏 You can make your donation here: https://harekrishnavizag.org/donate
ACTION:register_interest"`;
}

export async function processWithGemini(phone, contactName, message, conversationHistory=[]) {
  const geminiKey = process.env.GEMINI_API_KEY;
  const groqKey   = process.env.GROQ_API_KEY;
  const prompt = await buildPrompt(contactName, phone, message, conversationHistory);

  // 1) Gemini (waterfalls across its own models — see callGemini)
  if (geminiKey) {
    const d = await callGemini(geminiKey, prompt, { temperature:0.7, maxTokens:1024, topP:0.9, maxRetries:3 });
    const text = d?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) return parseModelReply(text, message);
  }

  // 2) Groq — a different provider with a completely separate quota pool, used
  // only once every Gemini model above has failed for this message.
  if (groqKey) {
    const text = await callGroq(groqKey, prompt, { temperature:0.7, maxTokens:1024, topP:0.9 });
    if (text) return parseModelReply(text, message);
  }

  // 3) Static keyword-based answers, enriched with whatever contact facts are
  // cached from the site — still correct, just not conversational
  const liveContact = await getCachedContactFacts().catch(() => null);
  const offline = offlineFallback(message, liveContact);
  if (offline) return offline;

  // 4) Last resort — hand off to a human
  console.error(`AI unavailable for "${message.slice(0,80)}" — no provider responded, no offline match`);
  return {
    reply:`Hare Krishna 🙏 I'll connect you with our team shortly. You can also reach us at ${CONTACT_PHONE}.`,
    action: ACTIONS.ESCALATE_TO_HUMAN
  };
}

export async function generateDonationFollowUp(contactName, sevaType="General") {
  const geminiKey = process.env.GEMINI_API_KEY;
  const groqKey   = process.env.GROQ_API_KEY;
  const prompt = `Write a short, warm WhatsApp follow-up message (under 100 words) for ${contactName||"a devotee"} who expressed interest in ${sevaType} seva at Hare Krishna Movement Visakhapatnam. Be devotional but not pushy. Include the donation link https://harekrishnavizag.org/donate. Start with "Hare Krishna 🙏"`;

  if (geminiKey) {
    const d = await callGemini(geminiKey, prompt, { temperature:0.8, maxTokens:300, maxRetries:2 });
    const text = d?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) return sanitizeWhatsApp(text);
  }
  if (groqKey) {
    const text = await callGroq(groqKey, prompt, { temperature:0.8, maxTokens:300 });
    if (text) return sanitizeWhatsApp(text);
  }
  // Final catch-all: helpful menu — never a cold "we will connect you" line by default
  return `Hare Krishna 🙏 I'm here to help with:\n\n• Temple timings & location (Andhra Pradesh, Visakhapatnam)\n• Sevas & donations: https://harekrishnavizag.org/donate\n• Programs, classes & festivals\n• Donation receipts (I'll get our team to send it)\n\nWhat would you like to know? You can also reach us at ${CONTACT_PHONE}. 🙏`;
}
