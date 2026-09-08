/**
 * AI-Only Demo (No MongoDB needed)
 * Simulates the Gupshup/Flaxxa webhook AI pipeline:
 *   inbound message → Gemini reply → detected action → outbound WhatsApp payload
 *
 * Usage:
 *   node scripts/ai-demo.mjs                 (interactive prompt)
 *   node scripts/ai-demo.mjs "your message"  (single shot)
 *   node scripts/ai-demo.mjs --test          (runs built-in scenarios)
 */
import { stdin as input, stdout as output } from "node:process";
import * as readline from "node:readline/promises";
import { processWithGemini } from "../lib/gemini.js";

const API_KEY = process.env.GEMINI_API_KEY;

// What each CRM action does (display only — no DB writes here)
const ACTION_INFO = {
  register_interest:  "📌 CRM: contact flagged as interested in donation/seva",
  escalate_to_human:  "🚨 CRM: contact flagged for staff follow-up",
  check_donation:     "🧾 CRM: team checks donation history",
  get_receipt:        "📄 CRM: team will send the donation receipt",
  get_payment_link:   "🔗 CRM: donation link provided",
  send_donation_link: "📲 CRM: donation link sent separately",
};

// The exact payload the webhook would POST to Gupshup's send API
function outboundPayload(provider, phone, text) {
  if (provider === "gupshup") {
    return new URLSearchParams({
      channel: "whatsapp",
      source:  process.env.GUPSHUP_SOURCE || "917075176108",
      destination: String(phone).replace(/^\+/, ""),
      "src.name": process.env.GUPSHUP_APPNAME || "4KoeJVChI420QyWVhAW1kE7L",
      message: JSON.stringify({ type: "text", text }),
    }).toString();
  }
  return JSON.stringify({ token: "(token)", phone, message: text }, null, 2);
}

function render(phone, name, message, provider = "gupshup") {
  console.log("\n" + "─".repeat(56));
  console.log("  📥 INBOUND  (via " + provider.toUpperCase() + ")");
  console.log("─".repeat(56));
  console.log(`  From:      ${name} <${phone}>`);
  console.log(`  Message:   ${message}`);
}

function renderResult(r, phone, provider, history) {
  console.log("\n" + "─".repeat(56));
  console.log("  🤖 GEMINI (models/gemini-3.6-flash)");
  console.log("─".repeat(56));
  console.log(`  Context:   ${history.length} previous message(s) in history`);
  console.log(`  Action:    ${r.action ? "✔ " + r.action : "— (none)"}`);
  console.log(`  ${ACTION_INFO[r.action] || ""}`);
  console.log("\n  💬 REPLY that gets sent to devotee:\n");
  console.log("  " + (r.reply || "(no reply)").split("\n").join("\n  "));
  console.log("\n  📤 OUTBOUND " + provider.toUpperCase() + " payload:\n");
  outboundPayload(provider, phone, r.reply)
    .split("\n")
    .forEach(l => console.log("  " + l));
  console.log("");
}

async function runOne(phone, name, message, provider) {
  render(phone, name, message, provider);
  const history = [
    { direction: "inbound", body: "Hare Krishna" },
    { direction: "outbound", body: "Hare Krishna! 🙏 How can I help you today?" },
  ];
  const r = await processWithGemini(phone, name, message, history);
  renderResult(r, phone, provider, history);
  return r;
}

const TEST_CASES = [
  ["+919876543210", "Ramesh",   "Hare Krishna. I want to donate for Annadana seva. Please give me the link"],
  ["+919876543211", "Lakshmi",  "Can you share the donation link?"],
  ["+919876543212", "Krishna",  "I need my donation receipt, when will it arrive?"],
  ["+919876543213", "Sita",     "Hare Krishna, what are today's temple timings?"],
];

async function main() {
  if (!API_KEY) {
    console.error("\n❌ GEMINI_API_KEY not set. Run with:\n   $env:GEMINI_API_KEY=\"your-key\"; node scripts/ai-demo.mjs\n");
    process.exit(1);
  }

  const arg = process.argv[2];

  if (arg === "--test") {
    console.log("Running AI demo scenarios…\n");
    for (const [phone, name, msg] of TEST_CASES) await runOne(phone, name, msg, "gupshup");
    return;
  }

  if (arg && arg !== "gupshup" && arg !== "flaxxa") {
    await runOne("+919999999999", "Devotee", arg, "gupshup");
    return;
  }

  if (arg) {
    await runOne("+919999999999", "Devotee", await rlQuestion("Enter message: "), arg);
    return;
  }

  // Interactive mode
  const rl = readline.createInterface({ input, output });
  console.log("\n🤖 HKM Vizag AI demo — type a devotee's message, or 'quit'");
  console.log("   Usage examples:  'I want to donate',  'need my receipt',  'temple timings'\n");
  while (true) {
    const msg = await rl.question("> ");
    if (!msg.trim() || msg.toLowerCase() === "quit" || msg.toLowerCase() === "exit") break;
    await runOne("+919999999999", "Devotee", msg.trim(), "gupshup");
  }
  rl.close();
}

async function rlQuestion(q) {
  const rl = readline.createInterface({ input, output });
  const a = await rl.question(q);
  rl.close();
  return a;
}

main().catch(e => { console.error("Error:", e.message); process.exit(1); });