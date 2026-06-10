import mongoose from "mongoose";
const R = new mongoose.Schema({ phone:String, name:String, params:[String] },{ _id:false });
const S = new mongoose.Schema({
  name:         { type:String, required:true },
  templateName: { type:String, required:true },
  templateLang: { type:String, default:"en" },
  recipients:   [R],
  delay:        { type:Number, default:1200 },
  scheduledAt:  { type:Date, required:true },
  timezone:     { type:String, default:"Asia/Kolkata" },
  status:       { type:String, enum:["scheduled","running","done","cancelled","failed"], default:"scheduled" },
  campaignId:   { type:mongoose.Schema.Types.ObjectId, ref:"Campaign" },
  totalContacts:{ type:Number, default:0 },
  createdAt:    { type:Date, default:Date.now },
  runAt:        Date,
});
S.index({ scheduledAt:1, status:1 });
export default mongoose.models.Scheduled || mongoose.model("Scheduled", S);
