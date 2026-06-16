export const dynamic = "force-dynamic";
import { NextResponse }   from "next/server";
import { connectDB }      from "@/lib/mongodb";
import WebhookForward     from "@/models/WebhookForward";

export async function POST(req) {
  await connectDB();
  const { id } = await req.json();
  const fwd = await WebhookForward.findById(id);
  if (!fwd) return NextResponse.json({ error:"Not found" }, { status:404 });

  const testPayload = {
    type: "test",
    source: "HKM Vizag CRM",
    timestamp: new Date().toISOString(),
    message: "This is a test webhook from HKM Vizag CRM",
  };

  const headers = { "Content-Type":"application/json", "X-Source":"HKM-Vizag-CRM" };
  if (fwd.secret) headers["X-Webhook-Secret"] = fwd.secret;

  try {
    const r = await fetch(fwd.url, {
      method:"POST", headers,
      body: JSON.stringify(testPayload),
      signal: AbortSignal.timeout(10000),
    });
    await WebhookForward.findByIdAndUpdate(id, {
      lastSentAt: new Date(), lastStatus: r.status,
    });
    return NextResponse.json({ ok:r.ok, status:r.status });
  } catch(e) {
    return NextResponse.json({ ok:false, error:e.message }, { status:500 });
  }
}
