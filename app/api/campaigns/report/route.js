export const dynamic = "force-dynamic";
import { connectDB } from "@/lib/mongodb";
import Campaign      from "@/models/Campaign";

/*
  Read-only campaign report (counts only — no contact lists).

    /api/campaigns/report?q=amavasya
    /api/campaigns/report?q=amavasya&phones=9951141915,9xxxxxxxxx

  q       part of the campaign name (default: campaigns created in the last 2 days)
  phones  numbers to look up — shows which campaign they were in and what happened

  Per-contact lists stay on each campaign's own Export button.
*/

const MEANING = {
  "131026": "Not deliverable — number not on WhatsApp, very old app, or Meta chose not to deliver",
  "131049": "Meta per-user marketing limit — retry after a day or two",
  "131050": "Recipient stopped marketing messages from you",
  "130472": "Held back by a Meta experiment (not billed)",
  "131047": "24-hour window closed (only templates allowed)",
  "131053": "Media (image) could not be downloaded / unsupported",
  "131048": "Spam rate limit hit",
  "1008":   "Template parameter missing",
  "2012":   "Header format mismatch (image expected)",
};

const json = (x, status = 200) =>
  new Response(JSON.stringify(x, null, 2), { status, headers:{ "Content-Type":"application/json" } });

function variants(p) {
  let d = String(p || "").replace(/\D/g, "");
  if (d.startsWith("0")) d = d.slice(1);
  const ten = d.length === 12 && d.startsWith("91") ? d.slice(2) : d;
  return ten ? [...new Set([ten, "91" + ten, "+91" + ten, d])] : [];
}
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function GET(req) {
  try {
    const url    = new URL(req.url);
    const q      = (url.searchParams.get("q") || "").trim();
    const phones = (url.searchParams.get("phones") || "").split(/[,;]/).map(x => x.trim()).filter(Boolean);
    const match  = q ? { name:{ $regex:esc(q), $options:"i" } }
                     : { createdAt:{ $gte:new Date(Date.now() - 2 * 864e5) } };

    await connectDB();
    const col  = Campaign.collection;
    const opts = { allowDiskUse:true, maxTimeMS:90000 };

    const [byStatus, byError] = await Promise.all([
      col.aggregate([
        { $match:match },
        { $project:{ name:1, status:1, createdAt:1, "results.status":1 } },
        { $unwind:"$results" },
        { $group:{ _id:{ id:"$_id", name:"$name", state:"$status", at:"$createdAt", st:"$results.status" }, n:{ $sum:1 } } },
      ], opts).toArray(),
      col.aggregate([
        { $match:match },
        { $project:{ "results.status":1, "results.error":1 } },
        { $unwind:"$results" },
        { $match:{ "results.status":"failed" } },
        { $group:{ _id:"$results.error", n:{ $sum:1 } } },
      ], opts).toArray(),
    ]);

    // Per campaign
    const camps = new Map();
    for (const r of byStatus) {
      const k = String(r._id.id);
      if (!camps.has(k)) camps.set(k, { campaign:r._id.name, state:r._id.state, createdAt:r._id.at,
                                        contacts:0, pending:0, sent:0, delivered:0, read:0, failed:0 });
      const c = camps.get(k);
      c.contacts += r.n;
      if (r._id.st in c) c[r._id.st] += r.n;
    }
    const campaigns = [...camps.values()].sort((a, b) => a.campaign.localeCompare(b.campaign, undefined, { numeric:true }));
    const totals = campaigns.reduce((t, c) => {
      for (const k of ["contacts","pending","sent","delivered","read","failed"]) t[k] += c[k];
      return t;
    }, { contacts:0, pending:0, sent:0, delivered:0, read:0, failed:0 });
    const pct = n => totals.contacts ? `${(100 * n / totals.contacts).toFixed(1)}%` : "0%";

    // Failures grouped by error code
    const codes = new Map();
    for (const e of byError) {
      const text = String(e._id || "No reason given");
      const code = (text.match(/^\s*(\d{3,6})\b/) || [])[1] || text.slice(0, 80);
      const cur  = codes.get(code) || { code, meaning:MEANING[code] || text.slice(0, 160), count:0 };
      cur.count += e.n;
      codes.set(code, cur);
    }
    const failedBy = [...codes.values()].sort((a, b) => b.count - a.count)
      .map(x => ({ ...x, share:totals.failed ? `${(100 * x.count / totals.failed).toFixed(1)}% of failed` : "" }));

    // Phone lookups
    const phoneLookup = [];
    for (const p of phones) {
      const v = variants(p);
      const docs = v.length ? await col.aggregate([
        { $match:{ $and:[ match, { "results.phone":{ $in:v } } ] } },
        { $project:{ name:1, createdAt:1, results:{ $filter:{ input:"$results", cond:{ $in:["$$this.phone", v] } } } } },
      ], opts).toArray() : [];
      const found = docs.flatMap(d => d.results.map(r => ({
        campaign:d.name, status:r.status, error:r.error || "", sentAt:r.sentAt || null, messageId:r.wamid || "",
      })));
      phoneLookup.push({ phone:p, inCampaigns:found.length,
        result: found.length ? found : "Not in any of these campaigns — the number was not in the uploaded sheets" });
    }

    return json({
      filter: q ? `name contains "${q}"` : "created in the last 2 days",
      note: "Counts come from the CRM. Delivery reports Gupshup sent while the server was overloaded "
          + "(before the batching fix) were lost, so some contacts still show 'sent' although they were "
          + "delivered, read or failed. Gupshup's own report for the day is the exact source.",
      totals: { ...totals,
        summary: `sent OK ${totals.sent + totals.delivered + totals.read} (${pct(totals.sent + totals.delivered + totals.read)}) · `
               + `delivered/read confirmed ${totals.delivered + totals.read} (${pct(totals.delivered + totals.read)}) · `
               + `read ${totals.read} (${pct(totals.read)}) · failed ${totals.failed} (${pct(totals.failed)}) · `
               + `not sent ${totals.pending}` },
      failedBy,
      campaigns,
      ...(phones.length ? { phoneLookup } : {}),
    });
  } catch (e) {
    return json({ error:e.message }, 500);
  }
}
