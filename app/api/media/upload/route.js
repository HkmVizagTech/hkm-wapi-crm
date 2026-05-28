export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { connectDB }    from "@/lib/mongodb";
import Media            from "@/models/Media";
import { v2 as cld }   from "cloudinary";
export async function POST(req) {
  await connectDB();
  cld.config({ cloud_name:process.env.CLOUDINARY_CLOUD_NAME,
    api_key:process.env.CLOUDINARY_API_KEY, api_secret:process.env.CLOUDINARY_API_SECRET });
  const fd   = await req.formData();
  const file = fd.get("file");
  const name = fd.get("name")||file.name;
  const type = file.type.startsWith("image/")?"image":"document";
  const buf  = Buffer.from(await file.arrayBuffer());
  const uri  = `data:${file.type};base64,${buf.toString("base64")}`;
  try {
    const r = await cld.uploader.upload(uri, { folder:"hkm-wapi", resource_type:"auto" });
    const m = await Media.create({ name, type, cloudinaryUrl:r.secure_url,
      cloudinaryPublicId:r.public_id, format:r.format, size:r.bytes });
    return NextResponse.json({ media:m }, { status:201 });
  } catch(e) { return NextResponse.json({ error:e.message }, { status:500 }); }
}
