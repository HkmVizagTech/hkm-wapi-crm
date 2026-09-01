import mongoose from "mongoose";

const NoteSchema = new mongoose.Schema({
  text:      String,
  author:    String,  // agent name
  createdAt: { type:Date, default:Date.now },
}, { _id:true });

const S = new mongoose.Schema({
  phone:        { type:String, required:true, unique:true, index:true },
  name:         String,

  // Assignment
  assignedTo:   String,       // agent email/name, null = unassigned
  assignedAt:   Date,

  // Status
  status:       { type:String, enum:["open","pending","resolved","snoozed"], default:"open", index:true },
  priority:     { type:String, enum:["low","normal","high","urgent"], default:"normal" },

  // Labels
  labels:       { type:[String], default:[] },

  // AI
  aiMode:       { type:String, enum:["auto","draft","human"], default:"auto" },

  // Internal notes (agent-only)
  notes:        [NoteSchema],

  // Tracking
  lastMessageAt:    Date,
  lastMessageText:  String,
  lastMessageDir:   String,   // inbound|outbound
  unreadCount:      { type:Number, default:0 },
  firstResponseAt:  Date,     // for SLA
  resolvedAt:       Date,
  resolvedBy:       String,

  createdAt:    { type:Date, default:Date.now },
});

S.index({ status:1, assignedTo:1, lastMessageAt:-1 });
export default mongoose.models.Conversation || mongoose.model("Conversation", S);
