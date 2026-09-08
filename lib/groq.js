/**
 * Groq AI Integration — second-opinion / overflow provider for the WhatsApp assistant.
 *
 * Gemini's free tier gives each model its own small daily quota (gemini-3.6-flash
 * runs out after a handful of messages on a no-billing project). Groq is a
 * completely separate provider with its own quota pool, so it's used here as a
 * fallback when every Gemini model attempt has failed for this message — not as
 * the primary provider. Get a free key at https://console.groq.com/keys
 */
const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-20b";
const GROQ_API = "https://api.groq.com/openai/v1/chat/completions";

// Backup models to try, in order, if the primary Groq model itself is rate-limited.
const GROQ_FALLBACK_MODELS = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];

export async function callGroq(apiKey, prompt, config = {}) {
  if (!apiKey) return null;
  const models = [GROQ_MODEL, ...GROQ_FALLBACK_MODELS.filter(m => m !== GROQ_MODEL)];

  for (const model of models) {
    try {
      const r = await fetch(GROQ_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature: config.temperature ?? 0.7,
          max_tokens: config.maxTokens || 1024,
          top_p: config.topP ?? 0.9,
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        const err = d?.error?.type || r.status;
        console.warn(`Groq ${model} ${err}: ${(d?.error?.message || "").slice(0, 120)}`);
        // Rate-limited or model unavailable on this key — try the next model.
        continue;
      }
      const text = d?.choices?.[0]?.message?.content;
      if (text) return text;
    } catch (e) {
      console.warn(`Groq ${model} network error:`, e.message);
    }
  }
  console.error("Groq failed on all models");
  return null;
}
