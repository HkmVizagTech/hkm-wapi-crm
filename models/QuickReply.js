import mongoose from "mongoose";
const S = new mongoose.Schema({
  shortcut:  { type:String, required:true },  // e.g. "/timings"
  title:     String,
  message:   { type:String, required:true },
  category:  String,
  createdAt: { type:Date, default:Date.now },
});
export default mongoose.models.QuickReply || mongoose.model("QuickReply", S);
