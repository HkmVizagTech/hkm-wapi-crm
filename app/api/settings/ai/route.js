export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { aiEnvEnabled, getAiPause, setAiPause } from "@/lib/ai-switch";

async function state() {
  const envEnabled = aiEnvEnabled();
  const pause = await getAiPause({ fresh:true });
  return { envEnabled, ...pause, active: envEnabled && !pause.paused };
}

export async function GET() {
  try { return NextResponse.json(await state()); }
  catch (e) { return NextResponse.json({ error:e.message }, { status:500 }); }
}

// Body: { paused:true, hours?:number|null, reason?:string }  or  { paused:false }
export async function POST(req) {
  try {
    const { paused, hours=null, reason="" } = await req.json();
    await setAiPause({ paused:!!paused, hours, reason });
    const s = await state();
    console.log(s.paused
      ? `⏸ AI replies paused${s.pausedUntil ? ` until ${new Date(s.pausedUntil).toISOString()}` : " until resumed"}${reason ? ` (${reason})` : ""}`
      : "▶️ AI replies resumed");
    return NextResponse.json(s);
  } catch (e) {
    return NextResponse.json({ error:e.message }, { status:500 });
  }
}
