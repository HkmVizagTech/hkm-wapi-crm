export const dynamic = "force-dynamic";
import { NextResponse }        from "next/server";
import { connectDB }           from "@/lib/mongodb";
import Contact                 from "@/models/Contact";
import { processWithGemini }   from "@/lib/gemini";
import { generateDonationFollowUp } from "@/lib/gemini";

// GET: AI stats
export async function GET() {
  await connectDB();
  const stats = {
    total:       await Contact.countDocuments({}),
    interested:  await Contact.countDocuments({ aiStatus:"interested" }),
    needsHuman:  await Contact.countDocuments({ aiStatus:"needs_human" }),
    doNotContact:await Contact.countDocuments({ doNotContact:true }),
    aiEnabled:   !!process.env.GEMINI_API_KEY,
  };
  return NextResponse.json(stats);
}

// POST: Test AI or generate follow-up
export async function POST(req) {
  const { action, phone, message, contactName } = await req.json();
  
  if (action === "test") {
    const result = await processWithGemini(phone||"test", contactName||"Devotee", message||"Hare Krishna");
    return NextResponse.json(result);
  }

  if (action === "followup") {
    const msg = await generateDonationFollowUp(contactName, "Annadana Seva");
    return NextResponse.json({ message: msg });
  }

  return NextResponse.json({ error:"Unknown action" }, { status:400 });
}
