export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

export async function GET(req) {
  const url = req.nextUrl || new URL(req.url);
  const base = url.origin;

  return NextResponse.json({
    db:            !!process.env.MONGODB_URI,
    aiEnabled:     process.env.AI_ENABLED === "true",
    gemini:        !!process.env.GEMINI_API_KEY,
    geminiModel:   process.env.GEMINI_MODEL || "gemini-flash-latest",
    gupshup: {
      configured:  !!process.env.GUPSHUP_APIKEY,
      source:      process.env.GUPSHUP_SOURCE || "",
      app:         !!process.env.GUPSHUP_APPNAME,
    },
    flaxxa:        !!process.env.FLAXXA_TOKEN,
    cloudinary:    !!process.env.CLOUDINARY_CLOUD_NAME,
    campaigner:    !!process.env.CAMPAIGNER_API_URL,
    webhooks: {
      gupshup: `${base}/api/webhooks/gupshup`,
      flaxxa:  `${base}/api/webhooks/flaxxa`,
    },
  });
}