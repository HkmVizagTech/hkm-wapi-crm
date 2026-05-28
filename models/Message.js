import mongoose from "mongoose";
const S = new mongoose.Schema({
  contactPhone: { type:String, required:true },
  contactName:  String,
  direction:    { type:String, enum:["outbound","inbound"], default:"outbound" },
  type:         { type:String, default:"text" },
  body:         String,
  templateName: String,
  params:       [String],
  status:       { type:String, enum:["sent","delivered","read","failed","received"], default:"sent" },
  wamid:        String,
  campaignId:   { type:mongoose.Schema.Types.ObjectId, ref:"Campaign" },
  sentAt:       { type:Date, default:Date.now },
  deliveredAt:  Date,
  readAt:       Date,
});
S.index({ contactPhone:1, sentAt:-1 });
S.index({ wamid:1 }, { unique:true, sparse:true });
export default mongoose.models.Message || mongoose.model("Message", S);
