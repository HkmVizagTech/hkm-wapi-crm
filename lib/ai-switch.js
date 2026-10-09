import { connectDB } from "@/lib/mongodb";
import AppSetting    from "@/models/AppSetting";

// Runtime switch for AI auto-replies.
//  - AI_ENABLED=true + GEMINI_API_KEY in Railway = AI is *available*
//  - The pause stored in MongoDB (toggled from Settings / Bulk Send) = AI is *paused*
// Webhooks call isAiReplyOn() on every inbound message, so the result is cached
// for a few seconds to avoid a DB read per message during reply storms.

const TTL_MS = 10_000;
let cache = { at:0, val:null };

export const aiEnvEnabled = () =>
  process.env.AI_ENABLED === "true" && !!process.env.GEMINI_API_KEY;

export async function getAiPause({ fresh=false } = {}) {
  if (!fresh && cache.val && Date.now() - cache.at < TTL_MS) return cache.val;
  await connectDB();
  const doc   = await AppSetting.findOne({ key:"ai" }).lean();
  const v     = doc?.value || {};
  const until = v.pausedUntil ? new Date(v.pausedUntil) : null;
  const paused = !!v.paused && (!until || until > new Date()); // auto-resumes after `until`
  const val = {
    paused,
    pausedUntil: paused ? until : null,
    pausedAt:    paused ? (v.pausedAt || null) : null,
    reason:      paused ? (v.reason || "") : "",
  };
  cache = { at:Date.now(), val };
  return val;
}

export async function isAiReplyOn() {
  if (!aiEnvEnabled()) return false;
  try { return !(await getAiPause()).paused; }
  catch { return false; } // if the setting can't be read, stay quiet rather than flood
}

// hours: number → pause for that long; null/undefined → until manually resumed
export async function setAiPause({ paused, hours=null, reason="" }) {
  await connectDB();
  const value = paused
    ? { paused:true, pausedAt:new Date(),
        pausedUntil: hours ? new Date(Date.now() + Number(hours)*3600*1000) : null,
        reason: String(reason||"").slice(0,200) }
    : { paused:false };
  await AppSetting.findOneAndUpdate(
    { key:"ai" },
    { $set:{ value, updatedAt:new Date() } },
    { upsert:true }
  );
  cache = { at:0, val:null };
  return getAiPause({ fresh:true });
}
