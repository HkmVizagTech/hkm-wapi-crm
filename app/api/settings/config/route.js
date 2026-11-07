export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

export async function GET(req) {
  const proto = req.headers?.get?.("x-forwarded-proto") || "https";
  const host  = req.headers?.get?.("host") || req.nextUrl?.host || "localhost:3000";
  const base  = `${proto}://${host}`;

  return NextResponse.json({
    version:       (await import("@/lib/version.js")).BUILD_VERSION,
    db:            !!process.env.MONGODB_URI,
    aiEnabled:     process.env.AI_ENABLED === "true",
    gemini:        !!process.env.GEMINI_API_KEY,
    geminiModel:   process.env.GEMINI_MODEL || "gemini-3.6-flash",
    gupshup: {
      configured:  !!process.env.GUPSHUP_APIKEY,
      source:      process.env.GUPSHUP_SOURCE || "",
      app:         !!process.env.GUPSHUP_APPNAME,
    },
    flaxxa:        !!process.env.FLAXXA_TOKEN,
    r2:            !!(process.env.CLOUDFLARE_R2_BUCKET && process.env.CLOUDFLARE_R2_PUBLIC_URL),
    campaigner:    !!process.env.CAMPAIGNER_API_URL,
    webhooks: {
      gupshup: `${base}/api/webhooks/gupshup`,
      flaxxa:  `${base}/api/webhooks/flaxxa`,
    },
  });
}