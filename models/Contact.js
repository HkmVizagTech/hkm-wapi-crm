import mongoose from "mongoose";

const ContactSchema = new mongoose.Schema({
  name:             { type: String, required: true },
  phone:            { type: String, required: true },
  email:            String,
  tags:             [String],
  notes:            String,
  totalMessagesSent:{ type: Number, default: 0 },
  lastMessageAt:    Date,
  optedIn:          { type: Boolean, default: true },
  addedAt:          { type: Date, default: Date.now },
});

ContactSchema.index({ phone: 1 });
ContactSchema.index({ tags: 1 });

export default mongoose.models.Contact || mongoose.model("Contact", ContactSchema);
