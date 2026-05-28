import mongoose from "mongoose";
const S = new mongoose.Schema({
  contactPhone:{ type:String, required:true },
  contactName:String, type:String,
  body:String, templateName:String, params:[String],
  status:{ type:String, enum:["sent","delivered","read","failed"], default:"sent" },
  wamid:String, campaignId:{ type:mongoose.Schema.Types.ObjectId, ref:"Campaign" },
  sentAt:{ type:Date, default:Date.now },
});
S.index({ contactPhone:1, sentAt:-1 });
export default mongoose.models.Message || mongoose.model("Message", S);
