import mongoose from "mongoose";
const S = new mongoose.Schema({
  name:      { type:String, required:true },
  email:     { type:String, required:true, unique:true, lowercase:true },
  password:  { type:String, required:true },
  role:      { type:String, enum:["admin","viewer"], default:"viewer" },
  active:    { type:Boolean, default:true },
  createdAt: { type:Date, default:Date.now },
  lastLogin: Date,
});
export default mongoose.models.User || mongoose.model("User", S);
