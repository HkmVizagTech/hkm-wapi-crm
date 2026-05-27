import mongoose from "mongoose";

const ResultSchema = new mongoose.Schema({
  phone:    String,
  name:     String,
  params:   [String],
  status:   { type: String, enum: ["sent","delivered","read","failed","pending"], default: "pending" },
  wamid:    String,
  error:    String,
  sentAt:   Date,
}, { _id: false });

const CampaignSchema = new mongoose.Schema({
  name:          { type: String, required: true },
  templateId:    String,
  templateName:  { type: String, required: true },
  templateLang:  { type: String, default: "en" },
  mediaUrl:      String,
  totalContacts: { type: Number, default: 0 },
  sent:          { type: Number, default: 0 },
  delivered:     { type: Number, default: 0 },
  failed:        { type: Number, default: 0 },
  status:        { type: String, enum: ["queued","running","done","stopped"], default: "queued" },
  delay:         { type: Number, default: 1200 },
  results:       [ResultSchema],
  createdBy:     String,
  createdAt:     { type: Date, default: Date.now },
  completedAt:   Date,
});

export default mongoose.models.Campaign || mongoose.model("Campaign", CampaignSchema);
