/**
 * Campaign Scheduler
 * Runs a cron job every minute to check for scheduled campaigns
 * and fire them at the right time.
 * 
 * This survives server restarts — on boot it re-registers all
 * pending scheduled campaigns from MongoDB.
 */

import cron     from "node-cron";
import mongoose from "mongoose";

let initialized = false;

async function getCampaignModel() {
  const { default: Campaign } = await import("../models/Campaign.js");
  return Campaign;
}

async function sendTemplate(phone, templateName, templateLang, params, mediaUrl, headerFormat) {
  const components = [];
  if (mediaUrl && headerFormat && mediaUrl.startsWith("http")) {
    const fmt = headerFormat.toUpperCase();
    const p = fmt==="IMAGE"    ? {type:"image",    image:    {link:mediaUrl}}
            : fmt==="DOCUMENT" ? {type:"document", document: {link:mediaUrl,filename:"Document"}}
            : fmt==="VIDEO"    ? {type:"video",    video:    {link:mediaUrl}}
            : null;
    if (p) components.push({type:"header", parameters:[p]});
  }
  if (params?.filter(v=>v).length) {
    components.push({type:"body", parameters:params.filter(v=>v).map(v=>({type:"text",text:String(v)}))});
  }
  const r = await fetch("https://wapi.flaxxa.com/api/v1/sendtemplatemessage", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({
      token:             process.env.FLAXXA_TOKEN,
      phone:             String(phone).replace(/^\+/,""),
      template_name:     templateName,
      template_language: templateLang||"en",
      components,
    }),
  });
  const d = await r.json().catch(()=>({}));
  const ok = r.ok && (d?.status==="success"||d?.message_id||d?.message_wamid);
  return { ok, wamid:d?.message_wamid||String(d?.message_id||""), error:d?.message||"" };
}

async function executeCampaign(campaignId) {
  const Campaign = await getCampaignModel();
  const campaign  = await Campaign.findById(campaignId);
  if (!campaign || campaign.status !== "scheduled") return;

  console.log(`🚀 Executing scheduled campaign: ${campaign.name}`);
  await Campaign.findByIdAndUpdate(campaignId, { status:"running" });

  // Auto-detect headerFormat from mediaUrl if not stored
  let headerFormat = campaign.headerFormat;
  if (!headerFormat && campaign.mediaUrl) {
    const url = campaign.mediaUrl.toLowerCase();
    if (url.match(/\.(jpg|jpeg|png|gif|webp)/)) headerFormat = "IMAGE";
    else if (url.match(/\.(mp4|mov|avi)/))       headerFormat = "VIDEO";
    else if (url.match(/\.(pdf|doc|docx)/))       headerFormat = "DOCUMENT";
    else headerFormat = "IMAGE"; // default
  }

  const contacts = campaign.results || [];
  for (let i = 0; i < contacts.length; i++) {
    const c = contacts[i];
    try {
      const { ok, wamid, error } = await sendTemplate(
        c.phone, campaign.templateName, campaign.templateLang,
        c.params||[], campaign.mediaUrl, headerFormat
      );
      if (ok) {
        await Campaign.findByIdAndUpdate(campaignId, {
          $set:{[`results.${i}.status`]:"sent",[`results.${i}.wamid`]:wamid,[`results.${i}.sentAt`]:new Date()},
          $inc:{sent:1},
        });
      } else {
        await Campaign.findByIdAndUpdate(campaignId, {
          $set:{[`results.${i}.status`]:"failed",[`results.${i}.error`]:error},
          $inc:{failed:1},
        });
      }
    } catch(e) {
      await Campaign.findByIdAndUpdate(campaignId, {
        $set:{[`results.${i}.status`]:"failed",[`results.${i}.error`]:e.message},
        $inc:{failed:1},
      }).catch(()=>{});
    }
    if (i < contacts.length - 1) {
      await new Promise(r => setTimeout(r, campaign.delay||1200));
    }
  }

  await Campaign.findByIdAndUpdate(campaignId, { status:"done", completedAt:new Date() });
  console.log(`✅ Campaign ${campaign.name} completed`);
}

export async function initScheduler() {
  if (initialized) return;
  initialized = true;

  console.log("⏰ Campaign scheduler started");

  // Run every minute: check for campaigns due to run
  cron.schedule("* * * * *", async () => {
    try {
      const Campaign = await getCampaignModel();
      const now      = new Date();

      // Find queued (immediate) campaigns
      const queued = await Campaign.find({ status: "queued" }).limit(3);

      // Find scheduled campaigns whose time has passed
      const scheduled = await Campaign.find({
        status:      "scheduled",
        scheduledAt: { $lte: now },
      }).limit(3);

      const due = [...queued, ...scheduled];

      if (due.length > 0) {
        console.log(`⏰ Processing ${due.length} campaign(s) (${queued.length} queued, ${scheduled.length} scheduled due)`);
        for (const campaign of due) {
          executeCampaign(campaign._id.toString()).catch(e => {
            console.error(`Campaign ${campaign._id} failed:`, e.message);
          });
        }
      }
    } catch(e) {
      console.error("Scheduler error:", e.message);
    }
  });

  // On startup: re-queue any campaigns that were scheduled but missed
  // (server was down when they were supposed to run)
  try {
    const Campaign = await getCampaignModel();
    const missed = await Campaign.find({
      $or: [
        { status: "queued" },
        { status: "scheduled", scheduledAt: { $lte: new Date() } },
      ]
    });
    if (missed.length > 0) {
      console.log(`⚠️  Found ${missed.length} missed campaign(s) — executing now`);
      for (const campaign of missed) {
        executeCampaign(campaign._id.toString()).catch(e => {
          console.error(`Missed campaign ${campaign._id} failed:`, e.message);
        });
      }
    }
  } catch(e) {
    console.error("Startup scheduler check failed:", e.message);
  }
}
