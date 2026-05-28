import mongoose from "mongoose";
const S = new mongoose.Schema({
  name:{ type:String, required:true },
  type:{ type:String, enum:["image","document","video","audio"] },
  cloudinaryUrl:{ type:String, required:true },
  cloudinaryPublicId:String, format:String, size:Number,
  uploadedAt:{ type:Date, default:Date.now },
});
export default mongoose.models.Media || mongoose.model("Media", S);
