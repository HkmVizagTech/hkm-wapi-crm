import mongoose from "mongoose";

// Singleton cache of the live facts pulled from the hkmsite2.0-server API
// (see lib/site-knowledge.js). `text` is the pre-formatted block injected
// into the AI prompt; `raw` keeps the actual API responses around so
// offlineFallback() can read specific fields (e.g. contact.address)
// without re-parsing the formatted text.
const S = new mongoose.Schema({
  key:       { type:String, default:"main", unique:true },
  text:      { type:String },
  raw:       { type: mongoose.Schema.Types.Mixed },
  fetchedAt: { type:Date },
  lastError: { type:String },
});

export default mongoose.models.SiteKnowledge || mongoose.model("SiteKnowledge", S);
