export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { connectDB }    from "@/lib/mongodb";
import Media            from "@/models/Media";
import { createHash }   from "crypto";

export async function POST(req) {
  try {
    const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
    const API_KEY    = process.env.CLOUDINARY_API_KEY;
    const API_SECRET = process.env.CLOUDINARY_API_SECRET;

    if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
      return NextResponse.json({ error:"Cloudinary credentials not configured in Railway variables" }, { status:400 });
    }

    const fd   = await req.formData();
    const file = fd.get("file");
    const name = fd.get("name") || file?.name || "upload";

    if (!file) return NextResponse.json({ error:"No file provided" }, { status:400 });

    const type      = file.type.startsWith("image/") ? "image" : "document";
    const buf       = Buffer.from(await file.arrayBuffer());
    const b64       = buf.toString("base64");
    const dataUri   = `data:${file.type};base64,${b64}`;
    const timestamp = Math.floor(Date.now() / 1000);
    const folder    = "hkm-wapi";

    // Correct Cloudinary signature:
    // SHA1 of "folder=hkm-wapi&timestamp=<ts><api_secret>"
    const sigStr    = `folder=${folder}&timestamp=${timestamp}${API_SECRET}`;
    const signature = createHash("sha1").update(sigStr).digest("hex");

    const uploadForm = new FormData();
    uploadForm.append("file",      dataUri);
    uploadForm.append("folder",    folder);
    uploadForm.append("api_key",   API_KEY);
    uploadForm.append("timestamp", String(timestamp));
    uploadForm.append("signature", signature);

    const r = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`,
      { method:"POST", body:uploadForm }
    );

    const d = await r.json();
    if (!r.ok || d.error) {
      return NextResponse.json({ error:d.error?.message || "Cloudinary upload failed" }, { status:500 });
    }

    await connectDB();
    const media = await Media.create({
      name, type,
      cloudinaryUrl:      d.secure_url,
      cloudinaryPublicId: d.public_id,
      format:             d.format,
      size:               d.bytes,
    });

    return NextResponse.json({ media }, { status:201 });

  } catch(e) {
    console.error("Upload error:", e.message);
    return NextResponse.json({ error:e.message }, { status:500 });
  }
}
