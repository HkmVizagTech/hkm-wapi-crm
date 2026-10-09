import mongoose from "mongoose";

// Small key/value store for settings that must change at runtime
// (without a Railway redeploy) — e.g. key "ai" holds the AI-reply pause switch.
const S = new mongoose.Schema({
  key:       { type:String, required:true, unique:true },
  value:     { type: mongoose.Schema.Types.Mixed },
  updatedAt: { type:Date, default:Date.now },
});

export default mongoose.models.AppSetting || mongoose.model("AppSetting", S);
