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
      return NextResponse.json({ error:"Cloudinary credentials missing in Railway variables" }, { status:400 });
    }

    const fd   = await req.formData();
    const file = fd.get("file");
    if (!file) return NextResponse.json({ error:"No file provided" }, { status:400 });

    const name = fd.get("name") || file.name || "upload";
    const type = file.type.startsWith("image/") ? "image" : "document";

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const b64   = Buffer.from(bytes).toString("base64");
    const dataUri = `data:${file.type};base64,${b64}`;

    // Build Cloudinary signature (SHA1 for upload API)
    const timestamp = Math.floor(Date.now() / 1000);
    const toSign    = `folder=hkm-wapi&timestamp=${timestamp}${API_SECRET}`;
    const signature = createHash("sha1").update(toSign).digest("hex");

    // Upload via multipart form
    const form = new FormData();
    form.append("file",      dataUri);
    form.append("folder",    "hkm-wapi");
    form.append("api_key",   API_KEY);
    form.append("timestamp", String(timestamp));
    form.append("signature", signature);

    const r = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`,
      { method:"POST", body:form }
    );

    const d = await r.json();

    if (!r.ok || d.error) {
      console.error("Cloudinary error:", d.error);
      return NextResponse.json({
        error: d.error?.message || "Cloudinary upload failed",
        detail: d
      }, { status:500 });
    }

    // Save to MongoDB
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
    console.error("Upload error:", e);
    return NextResponse.json({ error: e.message }, { status:500 });
  }
}
