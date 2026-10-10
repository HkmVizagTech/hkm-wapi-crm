export const dynamic = "force-dynamic";
import { connectDB } from "@/lib/mongodb";
import Campaign      from "@/models/Campaign";

/*
  Download campaign contacts by delivery status as a CSV that can be uploaded
  straight back into Bulk Send (columns: phone, name, param1…paramN, campaign, status).

    /api/campaigns/export?q=amavasya&status=delivered

  q       part of the campaign name
  status  one or more of: delivered, sent, read, failed, pending   (default: delivered)
          delivered = WhatsApp confirmed delivery but no read receipt
          sent      = accepted, but no delivery report was saved (some of these were read)

  Each phone appears once, even if it was in several campaigns.
*/

const STATUSES = ["pending","sent","delivered","read","failed"];
const esc  = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const cell = v => {
  const s = String(v ?? "");
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const text = (msg, status) => new Response(msg, { status, headers:{ "Content-Type":"text/plain; charset=utf-8" } });

export async function GET(req) {
  const url = new URL(req.url);
  // Optional: if EXPORT_KEY is ever set in Railway, the link must include &key=…
  const key = process.env.EXPORT_KEY;
  if (key && url.searchParams.get("key") !== key) return text("Wrong or missing key.", 401);

  const q = (url.searchParams.get("q") || "").trim();
  if (!q) return text('Add ?q=<part of the campaign name>, e.g. q=amavasya', 400);
  const wanted = (url.searchParams.get("status") || "delivered").split(",").map(s => s.trim()).filter(s => STATUSES.includes(s));
  if (!wanted.length) return text(`status must be one of: ${STATUSES.join(", ")}`, 400);

  try {
    await connectDB();
    const rows = await Campaign.collection.aggregate([
      { $match:{ name:{ $regex:esc(q), $options:"i" } } },
      { $project:{ name:1, createdAt:1, results:{ $filter:{ input:"$results", cond:{ $in:["$$this.status", wanted] } } } } },
      { $unwind:"$results" },
      { $project:{ _id:0, campaign:"$name", createdAt:1,
                   phone:"$results.phone", name:"$results.name", params:"$results.params", status:"$results.status" } },
      { $sort:{ createdAt:1 } },
    ], { allowDiskUse:true, maxTimeMS:120000 }).toArray();

    const seen = new Set(), out = [];
    let maxParams = 0;
    for (const r of rows) {
      const p = String(r.phone || "").trim();
      if (!p || seen.has(p)) continue;
      seen.add(p);
      out.push(r);
      maxParams = Math.max(maxParams, (r.params || []).length);
    }

    const header = ["phone","name", ...Array.from({ length:maxParams }, (_, i) => `param${i+1}`), "campaign","status"];
    const lines  = [header.join(",")];
    for (const r of out) {
      const params = Array.from({ length:maxParams }, (_, i) => (r.params || [])[i] ?? "");
      lines.push([r.phone, r.name, ...params, r.campaign, r.status].map(cell).join(","));
    }

    const day  = new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);   // IST date
    const file = `${q.replace(/[^\w-]+/g, "_")}_${wanted.join("-")}_${day}.csv`.toLowerCase();
    console.log(`📤 Export ${file}: ${out.length} contacts`);
    return new Response(lines.join("\r\n"), {   // no BOM: Bulk Send must see "phone" as the first header
      headers:{
        "Content-Type":"text/csv; charset=utf-8",
        "Content-Disposition":`attachment; filename="${file}"`,
        "Cache-Control":"no-store",
      },
    });
  } catch (e) {
    return text("Export failed: " + e.message, 500);
  }
}
