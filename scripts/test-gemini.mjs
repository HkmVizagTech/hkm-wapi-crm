import { processWithGemini } from "../lib/gemini.js";

const tests = [
  ["Ramesh", "I want to donate for Annadana seva. Please give me the payment link"],
  ["Lakshmi", "Can you give me the donation link?"],
  ["Krishna", "I need my donation receipt, when will I get it?"],
  ["Sita", "What are the temple timings?"],
];

for (const [name, msg] of tests) {
  const r = await processWithGemini("+919999999999", name, msg, []);
  console.log(`\n[${name}] "${msg}"`);
  console.log("  ACTION:", r.action);
  console.log("  REPLY:", (r.reply||"").slice(0,120).replace(/\n/g," "));
}