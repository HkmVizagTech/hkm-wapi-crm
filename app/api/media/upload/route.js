import { uploadMedia } from "@/lib/cloudinary";
import { connectDB }   from "@/lib/mongodb";
import Media           from "@/models/Media";
import { NextResponse } from "next/server";

export async function POST(req) {
  await connectDB();
  const formData = await req.formData();
  const file     = formData.get("file");
  const name     = formData.get("name") || file.name;
  const type     = formData.get("type") || "image";

  const buffer  = Buffer.from(await file.arrayBuffer());
  const dataUri = `data:${file.type};base64,${buffer.toString("base64")}`;

  try {
    const uploaded = await uploadMedia(dataUri, "hkm-wapi");
    const media    = await Media.create({
      name, type,
      cloudinaryUrl:     uploaded.url,
      cloudinaryPublicId:uploaded.publicId,
      format: uploaded.format,
      size:   uploaded.size,
    });
    return NextResponse.json({ media }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
