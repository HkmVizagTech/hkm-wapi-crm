import mongoose from "mongoose";
const S = new mongoose.Schema({
  name:  { type:String, required:true },
  phone: { type:String, required:true, unique:true },
  email: String,
  tags:[String],
  notes:String,
  totalMessagesSent:{ type:Number, default:0 },
  lastMessageAt: Date,
  addedAt:{ type:Date, default:Date.now },

  // AI Assistant fields — aiStatus: new|interested|needs_human|donated|completed
  aiMode:           { type:String, enum:["auto","draft","human"], default:"auto" },
  aiStatus:         { type:String, default:"new" },
  doNotContact:     { type:Boolean, default:false },
  interestedIn:     String,
  lastInterestAt:   Date,
  escalatedAt:      Date,
  escalationReason: String,
});

export default mongoose.models.Contact || mongoose.model("Contact", S);
