/**
 * Inbound media persistence.
 *
 * The media links WhatsApp providers send on the webhook are temporary and can't be
 * hot-linked from a browser:
 *   • Meta/Flaxxa "lookaside.fbsbx.com" links need an auth header and expire within minutes
 *   • Gupshup "filemanager.gupshup.io" links stop working after ~1-2 days
 * So we download the file right when the message arrives and re-host it on Cloudflare R2;
 * the inbox then shows the permanent R2 URL.
 */
import { r2Put, r2Configured } from "./r2.js";

const MAX_BYTES = 25 * 1024 * 1024;

async function download(url, provider) {
  const attempts = [{}];
  if (/lookaside\.fbsbx\.com|graph\.facebook\.com/.test(url)) {
    for (const t of [process.env.META_TOKEN, process.env.FLAXXA_TOKEN].filter(Boolean))
      attempts.push({ Authorization:`Bearer ${t}` });
  } else if (provider === "gupshup" && process.env.GUPSHUP_APIKEY) {
    attempts.push({ apikey:process.env.GUPSHUP_APIKEY });
  }
  let lastErr = "";
  for (const headers of attempts) {
    try {
      const r = await fetch(url, { headers, signal:AbortSignal.timeout(30000) });
      if (!r.ok) { lastErr = `HTTP ${r.status}`; continue; }
      const len = Number(r.headers.get("content-length") || 0);
      if (len > MAX_BYTES) throw new Error("file too large");
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length > MAX_BYTES) throw new Error("file too large");
      return { buf, type: r.headers.get("content-type") || "" };
    } catch (e) { lastErr = e.message; }
  }
  throw new Error(lastErr || "download failed");
}

/** Returns a permanent URL, or "" if it could not be saved. Never throws. */
export async function persistInboundMedia({ url, mimeType, provider, filename }) {
  try {
    if (!url || !r2Configured()) return "";
    const { buf, type } = await download(url, provider);
    const ct = (mimeType || type || "application/octet-stream").split(";")[0];

    const ext  = (String(filename || "").match(/\.([A-Za-z0-9]{1,5})$/)?.[1] || ct.split("/")[1] || "bin").replace(/[^A-Za-z0-9]/g, "").slice(0, 5);
    const safe = String(filename || "media").replace(/\.[^.]+$/, "").replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "media";
    const { url:permanent } = await r2Put(`hkm-wapi/inbound/${Date.now()}-${safe}.${ext}`, buf, ct);
    return permanent;
  } catch (e) {
    console.warn(`📎 inbound media not saved (${provider}): ${e.message}`);
    return "";
  }
}
