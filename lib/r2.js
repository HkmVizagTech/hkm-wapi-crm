/**
 * Cloudflare R2 storage (S3-compatible). Plain SigV4 over fetch — no SDK needed.
 *
 * Env: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_R2_ACCESS_KEY_ID, CLOUDFLARE_R2_SECRET_ACCESS_KEY,
 *      CLOUDFLARE_R2_BUCKET, CLOUDFLARE_R2_PUBLIC_URL (the bucket's public r2.dev / custom-domain base URL)
 */
import { createHash, createHmac } from "crypto";

const sha256 = d => createHash("sha256").update(d).digest("hex");
const hmac   = (k, d) => createHmac("sha256", k).update(d).digest();

export function r2Configured() {
  const e = process.env;
  return !!(e.CLOUDFLARE_ACCOUNT_ID && e.CLOUDFLARE_R2_ACCESS_KEY_ID && e.CLOUDFLARE_R2_SECRET_ACCESS_KEY
         && e.CLOUDFLARE_R2_BUCKET && e.CLOUDFLARE_R2_PUBLIC_URL);
}

/** Uploads `buf` to `key` in the bucket. Returns { url, key }. Throws on failure. */
export async function r2Put(key, buf, contentType = "application/octet-stream") {
  const { CLOUDFLARE_ACCOUNT_ID:acct, CLOUDFLARE_R2_ACCESS_KEY_ID:ak, CLOUDFLARE_R2_SECRET_ACCESS_KEY:sk,
          CLOUDFLARE_R2_BUCKET:bucket, CLOUDFLARE_R2_PUBLIC_URL:pub } = process.env;
  if (!r2Configured()) throw new Error("Cloudflare R2 is not configured (CLOUDFLARE_* env vars)");

  const host   = `${acct}.r2.cloudflarestorage.com`;
  const path   = `/${bucket}/${key.split("/").map(encodeURIComponent).join("/")}`;
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");   // 20260101T000000Z
  const day     = amzDate.slice(0, 8);
  const payload = sha256(buf);

  const headers = { "content-type":contentType, host, "x-amz-content-sha256":payload, "x-amz-date":amzDate };
  const signedNames = Object.keys(headers).sort();
  const canonical = `PUT\n${path}\n\n${signedNames.map(n => `${n}:${headers[n]}\n`).join("")}\n${signedNames.join(";")}\n${payload}`;
  const scope = `${day}/auto/s3/aws4_request`;
  const toSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256(canonical)].join("\n");
  const kSigning = hmac(hmac(hmac(hmac(`AWS4${sk}`, day), "auto"), "s3"), "aws4_request");
  const signature = createHmac("sha256", kSigning).update(toSign).digest("hex");

  const r = await fetch(`https://${host}${path}`, {
    method:"PUT",
    headers:{
      "Content-Type":contentType, "x-amz-content-sha256":payload, "x-amz-date":amzDate,
      Authorization:`AWS4-HMAC-SHA256 Credential=${ak}/${scope}, SignedHeaders=${signedNames.join(";")}, Signature=${signature}`,
    },
    body:buf,
    signal:AbortSignal.timeout(60000),
  });
  if (!r.ok) throw new Error(`R2 upload failed (HTTP ${r.status}) ${(await r.text().catch(() => "")).slice(0, 200)}`);
  return { url:`${pub.replace(/\/$/, "")}/${key.split("/").map(encodeURIComponent).join("/")}`, key };
}
