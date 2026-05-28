import mongoose from "mongoose";
const S = new mongoose.Schema({
  name:  { type:String, required:true },
  phone: { type:String, required:true },
  email: String, tags:[String], notes:String,
  totalMessagesSent:{ type:Number, default:0 },
  lastMessageAt: Date,
  addedAt:{ type:Date, default:Date.now },
});
S.index({ phone:1 }, { unique:true });
export default mongoose.models.Contact || mongoose.model("Contact", S);
