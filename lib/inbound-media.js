/**
 * Inbound media persistence.
 *
 * The media links WhatsApp providers send on the webhook are temporary and can't be
 * hot-linked from a browser:
 *   • Meta/Flaxxa "lookaside.fbsbx.com" links need an auth header and expire within minutes
 *   • Gupshup "filemanager.gupshup.io" links stop working after ~1-2 days
 * So we download the file right when the message arrives and re-host it on Cloudinary;
 * the inbox then shows the permanent Cloudinary URL.
 */
import { createHash } from "crypto";

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
    const { CLOUDINARY_CLOUD_NAME:cloud, CLOUDINARY_API_KEY:key, CLOUDINARY_API_SECRET:secret } = process.env;
    if (!url || !cloud || !key || !secret) return "";
    const { buf, type } = await download(url, provider);
    const ct = (mimeType || type || "application/octet-stream").split(";")[0];

    const timestamp = Math.floor(Date.now() / 1000);
    const folder = "hkm-wapi/inbound";
    const signature = createHash("sha1").update(`folder=${folder}&timestamp=${timestamp}${secret}`).digest("hex");
    const form = new FormData();
    form.append("file", new Blob([buf], { type:ct }), filename || "media");
    form.append("folder", folder);
    form.append("api_key", key);
    form.append("timestamp", String(timestamp));
    form.append("signature", signature);

    const r = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/auto/upload`, {
      method:"POST", body:form, signal:AbortSignal.timeout(60000),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || !d.secure_url) throw new Error(d?.error?.message || `Cloudinary HTTP ${r.status}`);
    return d.secure_url;
  } catch (e) {
    console.warn(`📎 inbound media not saved (${provider}): ${e.message}`);
    return "";
  }
}
