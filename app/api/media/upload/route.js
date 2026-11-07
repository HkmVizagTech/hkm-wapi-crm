export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { connectDB }    from "@/lib/mongodb";
import Media            from "@/models/Media";
import { r2Put, r2Configured } from "@/lib/r2";

export async function POST(req) {
  try {
    if (!r2Configured()) {
      return NextResponse.json({ error:"Cloudflare R2 credentials not configured in Railway variables (CLOUDFLARE_*)" }, { status:400 });
    }

    const fd   = await req.formData();
    const file = fd.get("file");
    const name = fd.get("name") || file?.name || "upload";

    if (!file) return NextResponse.json({ error:"No file provided" }, { status:400 });

    const type = file.type.startsWith("image/") ? "image" : "document";
    const buf  = Buffer.from(await file.arrayBuffer());
    const ext  = (String(file.name || name).match(/\.([A-Za-z0-9]{1,5})$/)?.[1] || "").toLowerCase();
    const safe = String(file.name || name).replace(/\.[^.]+$/, "").replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "file";
    const key  = `hkm-wapi/${Date.now()}-${safe}${ext ? "." + ext : ""}`;

    let up;
    try {
      up = await r2Put(key, buf, file.type || "application/octet-stream");
    } catch (e) {
      return NextResponse.json({ error:e.message }, { status:500 });
    }

    await connectDB();
    // Field names keep their legacy "cloudinary*" spelling so existing Media records and the library UI keep working;
    // they now hold the Cloudflare R2 public URL and object key.
    const media = await Media.create({
      name, type,
      cloudinaryUrl:      up.url,
      cloudinaryPublicId: up.key,
      format:             ext,
      size:               buf.length,
    });

    return NextResponse.json({ media }, { status:201 });

  } catch(e) {
    console.error("Upload error:", e.message);
    return NextResponse.json({ error:e.message }, { status:500 });
  }
}
