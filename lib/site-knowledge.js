/**
 * Live temple/donation/event facts pulled from the hkmsite2.0-server API —
 * the SAME backend harekrishnavizag.org itself reads from. This is now the
 * single source of truth for the WhatsApp AI assistant instead of the
 * hand-maintained text that used to live entirely in ai-knowledge.js (which
 * had already drifted: wrong Bhagavatam class time, missing sevas like Gau
 * Seva / Vastra Seva, a generic festival list instead of the real calendar).
 *
 * Refreshed periodically by the cron job in lib/scheduler.js. getSiteKnowledge()
 * below only ever reads the cached, pre-formatted text — a WhatsApp reply
 * should never wait on an external API call to this or any other service.
 */
import SiteKnowledgeModel from "../models/SiteKnowledge.js";
import { connectDB } from "./mongodb.js";

const API_BASE = (process.env.HKM_SITE_API_URL || "https://hkmsite20-server-production.up.railway.app").replace(/\/$/, "");
const MAX_AGE_MS = 6 * 60 * 60 * 1000; // 6 hours — keep in step with the cron schedule below

async function fetchJson(path) {
  try {
    const r = await fetch(`${API_BASE}${path}`, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) {
      console.warn(`site-knowledge ${path} -> HTTP ${r.status}`);
      return null;
    }
    return await r.json();
  } catch (e) {
    console.warn(`site-knowledge fetch ${path} failed:`, e.message);
    return null;
  }
}

function fmtDate(d) {
  try {
    return new Date(d).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric", timeZone:"Asia/Kolkata" });
  } catch { return ""; }
}

function buildKnowledgeText({ siteContent, donationPage, events, importantDates, festivalDonations }) {
  const contact = siteContent?.content?.contact || {};
  const dp = donationPage?.page || {};
  const lines = [];

  lines.push("=== LIVE TEMPLE INFO (source: harekrishnavizag.org — this is the current, authoritative data) ===");
  if (contact.address)  lines.push(`Address: ${contact.address}`);
  if (contact.phone)    lines.push(`Phone: ${contact.phone}`);
  if (contact.email)    lines.push(`Email: ${contact.email}`);
  if (contact.morningHours || contact.eveningHours) {
    lines.push(`Visiting hours: Morning ${contact.morningHours || "—"}, Evening ${contact.eveningHours || "—"}`);
  }

  const options = Array.isArray(dp.donationOptions) ? dp.donationOptions : [];
  if (options.length) {
    lines.push("");
    lines.push("=== LIVE SEVA / DONATION OPTIONS ===");
    for (const o of options) {
      lines.push(`- ${o.title || o.category}${o.amount ? ` (suggested ₹${o.amount})` : ""}`);
    }
    lines.push("Hundreds of specific seva names exist beyond this list — for ANY donation/seva intent, even an unfamiliar name, give the donation link and register interest. Never invent an amount that isn't listed above.");
  }

  if (dp.bankDetails?.accountNumber) {
    const b = dp.bankDetails;
    lines.push("");
    lines.push("Direct bank transfer (offer only if asked for a NEFT/IMPS/bank option instead of the online link):");
    lines.push(`${b.beneficiaryName || "Hare Krishna Movement India"} — A/C ${b.accountNumber}, IFSC ${b.ifsc}${b.bankName ? `, ${b.bankName}` : ""}`);
  }

  const upcomingEvents = (Array.isArray(events?.events) ? events.events : [])
    .filter(e => e.status !== "cancelled" && new Date(e.date) >= new Date(Date.now() - 24*60*60*1000))
    .sort((a,b) => new Date(a.date) - new Date(b.date))
    .slice(0, 8);
  if (upcomingEvents.length) {
    lines.push("");
    lines.push("=== UPCOMING EVENTS ===");
    for (const e of upcomingEvents) lines.push(`- ${fmtDate(e.date)}: ${e.title}`);
  }

  const dates = (Array.isArray(importantDates?.dates) ? importantDates.dates : [])
    .filter(d => new Date(d.date) >= new Date(Date.now() - 24*60*60*1000))
    .sort((a,b) => new Date(a.date) - new Date(b.date))
    .slice(0, 10);
  if (dates.length) {
    lines.push("");
    lines.push("=== EKADASHIS & OBSERVANCE DAYS ===");
    for (const d of dates) lines.push(`- ${fmtDate(d.date)}: ${d.title}${d.type ? ` (${d.type})` : ""}`);
  }

  // Festival campaigns include internal test rows ("Testing on the server", etc.)
  // — exclude anything with no real donation options or an obvious test title
  // so the AI never repeats placeholder junk to a devotee.
  const campaigns = (Array.isArray(festivalDonations) ? festivalDonations : [])
    .filter(f => f.active && Array.isArray(f.donationOptions) && f.donationOptions.length && !/test/i.test(f.title || ""));
  if (campaigns.length) {
    lines.push("");
    lines.push("=== ACTIVE FESTIVAL CAMPAIGNS ===");
    for (const f of campaigns) lines.push(`- ${f.title}`);
  }

  return lines.join("\n");
}

export async function refreshSiteKnowledge() {
  const [siteContent, donationPage, events, importantDates, festivalDonations] = await Promise.all([
    fetchJson("/site-content"),
    fetchJson("/donation-page"),
    fetchJson("/events"),
    fetchJson("/important-dates"),
    fetchJson("/festival-donations/all"),
  ]);

  if (!siteContent && !donationPage && !events && !importantDates && !festivalDonations) {
    console.error("site-knowledge: every endpoint failed — keeping the previous cache untouched");
    await connectDB();
    await SiteKnowledgeModel.findOneAndUpdate(
      { key:"main" },
      { $set:{ lastError:"all endpoints unreachable", fetchedAt: new Date() } },
      { upsert:true }
    ).catch(()=>{});
    return null;
  }

  const text = buildKnowledgeText({ siteContent, donationPage, events, importantDates, festivalDonations });

  await connectDB();
  await SiteKnowledgeModel.findOneAndUpdate(
    { key:"main" },
    { $set:{
      text,
      raw:{ siteContent, donationPage, events, importantDates, festivalDonations },
      fetchedAt: new Date(),
      lastError: "",
    }},
    { upsert:true }
  );
  console.log(`✅ site-knowledge refreshed (${text.length} chars)`);
  return text;
}

// Read path used when building every AI prompt. Always returns instantly from
// cache; only blocks on a live fetch the very first time (nothing cached yet).
export async function getSiteKnowledge() {
  try {
    await connectDB();
    const doc = await SiteKnowledgeModel.findOne({ key:"main" }).lean();
    if (doc?.text) {
      if (Date.now() - new Date(doc.fetchedAt).getTime() > MAX_AGE_MS) {
        refreshSiteKnowledge().catch(()=>{}); // stale-while-revalidate, don't block this reply on it
      }
      return doc.text;
    }
  } catch (e) {
    console.warn("getSiteKnowledge read failed:", e.message);
  }
  return (await refreshSiteKnowledge().catch(()=>null)) || "";
}

// Used only by offlineFallback() in lib/gemini.js, on the rare path where
// every AI provider has failed — needs a couple of already-cached fields,
// synchronously cheap, no need for the whole formatted text block.
export async function getCachedContactFacts() {
  try {
    await connectDB();
    const doc = await SiteKnowledgeModel.findOne({ key:"main" }).lean();
    return doc?.raw?.siteContent?.content?.contact || null;
  } catch { return null; }
}
