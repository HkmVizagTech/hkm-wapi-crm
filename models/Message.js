import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema({
  contactPhone: { type: String, required: true },
  contactName:  String,
  direction:    { type: String, enum: ["outbound","inbound"], default: "outbound" },
  type:         { type: String, enum: ["text","template","media","document"], default: "text" },
  body:         String,
  templateName: String,
  params:       [String],
  mediaUrl:     String,
  status:       { type: String, enum: ["sent","delivered","read","failed"], default: "sent" },
  wamid:        String,
  campaignId:   { type: mongoose.Schema.Types.ObjectId, ref: "Campaign" },
  sentAt:       { type: Date, default: Date.now },
  deliveredAt:  Date,
  readAt:       Date,
});

MessageSchema.index({ contactPhone: 1, sentAt: -1 });
MessageSchema.index({ campaignId: 1 });
MessageSchema.index({ wamid: 1 });

export default mongoose.models.Message || mongoose.model("Message", MessageSchema);
