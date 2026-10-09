import mongoose from "mongoose";
const R = new mongoose.Schema({
  phone:String, name:String, params:[String],
  status:{ type:String, enum:["pending","sent","delivered","read","failed"], default:"pending" },
  wamid:String, error:String, sentAt:Date,
},{ _id:false });

const S = new mongoose.Schema({
  name:         { type:String, required:true },
  templateName: { type:String, required:true },
  templateLang: { type:String, default:"en" },
  mediaUrl:     String,
  totalContacts:{ type:Number, default:0 },
  sent:         { type:Number, default:0 },
  delivered:    { type:Number, default:0 },
  failed:       { type:Number, default:0 },
  read:         { type:Number, default:0 },   // was $inc'd by webhooks but missing from schema, so never saved
  status:       { type:String, enum:["scheduled","queued","running","done","stopped"], default:"queued" },
  delay:        { type:Number, default:1200 },
  headerFormat:  String,
  provider:       { type:String, enum:["flaxxa","gupshup"], default:"flaxxa" },
  defaultParams:  [String],
  scheduledAt:  Date,
  results:      [R],
  createdAt:    { type:Date, default:Date.now },
  completedAt:  Date,
  heartbeatAt:  Date,   // updated while sending; lets a restarted server resume a campaign safely
});

// Delivery webhooks look campaigns up by message ID — without this index every
// status event scans every campaign's results array (tens of thousands per bulk send).
S.index({ "results.wamid":1 });
S.index({ status:1, scheduledAt:1 });

export default mongoose.models.Campaign || mongoose.model("Campaign", S);
