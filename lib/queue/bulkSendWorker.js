require("dotenv").config({ path: ".env.local" });
const Bull     = require("bull");
const mongoose = require("mongoose");

const REDIS_URL   = process.env.REDIS_URL   || "redis://localhost:6379";
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/hkm-wapi-crm";
const TOKEN       = process.env.FLAXXA_TOKEN;
const BASE        = "https://wapi.flaxxa.com";

// Connect MongoDB
mongoose.connect(MONGODB_URI).then(() => console.log("✅ MongoDB connected"));

const Campaign = require("../../models/Campaign");
const Message  = require("../../models/Message");

const queue = new Bull("bulk-send", REDIS_URL);

queue.process(async (job) => {
  const { campaignId, contacts, templateName, templateLang, params, delay } = job.data;

  const campaign = await Campaign.findById(campaignId);
  if (!campaign) throw new Error("Campaign not found");

  await Campaign.findByIdAndUpdate(campaignId, { status: "running" });

  let sent = 0, failed = 0;

  for (let i = 0; i < contacts.length; i++) {
    const contact   = contacts[i];
    const rowParams = contact.params || params || [];

    try {
      const components = rowParams.length
        ? [{ type: "body", parameters: rowParams.map(v => ({ type: "text", text: v })) }]
        : [];

      const res = await fetch(`${BASE}/api/v1/sendtemplatemessage`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          token:             TOKEN,
          phone:             contact.phone,
          template_name:     templateName,
          template_language: templateLang || "en",
          components,
        }),
      });

      const data = await res.json();
      const ok   = res.ok && (data?.status === "success" || data?.message_id || data?.message_wamid);
      const wamid = data?.message_wamid || String(data?.message_id || "");

      if (ok) sent++;
      else failed++;

      // Update result in campaign
      await Campaign.findByIdAndUpdate(campaignId, {
        $set: { [`results.${i}.status`]: ok ? "sent" : "failed",
                [`results.${i}.wamid`]:  wamid,
                [`results.${i}.error`]:  ok ? "" : (data?.message || "Unknown error"),
                [`results.${i}.sentAt`]: new Date() },
        $inc: { sent: ok ? 1 : 0, failed: ok ? 0 : 1 },
      });

      // Save to messages collection
      await Message.create({
        contactPhone: contact.phone,
        contactName:  contact.name,
        type:         "template",
        templateName,
        params:       rowParams,
        status:       ok ? "sent" : "failed",
        wamid,
        campaignId,
      });

      // Delay between sends
      if (i < contacts.length - 1) {
        await new Promise(r => setTimeout(r, delay || 1200));
      }

    } catch (err) {
      failed++;
      await Campaign.findByIdAndUpdate(campaignId, {
        $set: { [`results.${i}.status`]: "failed",
                [`results.${i}.error`]:  err.message },
        $inc: { failed: 1 },
      });
    }

    // Update job progress
    job.progress(Math.round(((i + 1) / contacts.length) * 100));
  }

  await Campaign.findByIdAndUpdate(campaignId, {
    status:      "done",
    completedAt: new Date(),
  });

  console.log(`✅ Campaign ${campaignId} done — ${sent} sent, ${failed} failed`);
  return { sent, failed };
});

queue.on("completed", (job, result) => {
  console.log(`Job ${job.id} completed:`, result);
});

queue.on("failed", (job, err) => {
  console.error(`Job ${job.id} failed:`, err.message);
});

console.log("🚀 Bulk send worker running…");
