import mongoose from "mongoose";
const S = new mongoose.Schema({
  name:      { type:String, required:true },
  url:       { type:String, required:true },
  secret:    String,           // optional — sent as X-Webhook-Secret header
  enabled:   { type:Boolean, default:true },
  events:    { type:[String], default:["all"] }, // all | message | status
  createdAt: { type:Date, default:Date.now },
  lastSentAt: Date,
  lastStatus: Number,          // last HTTP response code
});
export default mongoose.models.WebhookForward ||
  mongoose.model("WebhookForward", S);
