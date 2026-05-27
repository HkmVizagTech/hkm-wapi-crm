import mongoose from "mongoose";

const MediaSchema = new mongoose.Schema({
  name:             { type: String, required: true },
  type:             { type: String, enum: ["image","document","video","audio"], required: true },
  cloudinaryUrl:    { type: String, required: true },
  cloudinaryPublicId: String,
  format:           String,
  size:             Number,
  usedInTemplates:  [String],
  uploadedBy:       String,
  uploadedAt:       { type: Date, default: Date.now },
});

export default mongoose.models.Media || mongoose.model("Media", MediaSchema);
