"use client";
import { useState, useEffect, useRef } from "react";
import { PageHeader, Button, Card, Badge, Spinner } from "@/components/ui";
import { Toast } from "@/components/ui";
import { useToast } from "@/hooks/useToast";
import { relativeTime } from "@/lib/utils";

export default function MediaPage() {
  const [media,    setMedia]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [uploading,setUploading]= useState(false);
  const [filter,   setFilter]   = useState("all");
  const fileRef = useRef();
  const { toast, showToast, clearToast } = useToast();

  useEffect(() => { loadMedia(); }, []);

  const loadMedia = async () => {
    setLoading(true);
    const res = await fetch("/api/media");
    const d   = await res.json();
    setMedia(d.media || []);
    setLoading(false);
  };

  const handleUpload = async e => {
    const file = e.target.files[0]; if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    form.append("name", file.name);
    form.append("type", file.type.startsWith("image/") ? "image" : "document");
    const res = await fetch("/api/media/upload", { method:"POST", body:form });
    if (res.ok) { showToast("Uploaded successfully!"); loadMedia(); }
    else { showToast("Upload failed", "error"); }
    setUploading(false);
    e.target.value = "";
  };

  const filtered = filter === "all" ? media : media.filter(m => m.type === filter);

  return (
    <div className="p-6 fade-up">
      <PageHeader
        title="🖼 Media Library"
        subtitle={`${media.length} files · Images & PDFs for WhatsApp templates`}
        actions={<>
          <input ref={fileRef} type="file" accept="image/*,.pdf,.doc,.docx" onChange={handleUpload} className="hidden"/>
          <Button onClick={()=>fileRef.current?.click()} disabled={uploading}>
            {uploading ? <><Spinner size={14} color="#000"/> Uploading…</> : "⬆ Upload File"}
          </Button>
        </>}
      />

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5 p-1 rounded-xl w-fit" style={{ background:"#0d1117", border:"1px solid #1c2a3f" }}>
        {["all","image","document"].map(f => (
          <button key={f} onClick={()=>setFilter(f)}
            className="px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all"
            style={{ background:filter===f?"#25d366":"transparent", color:filter===f?"#000":"#8899b0" }}>
            {f === "all" ? `All (${media.length})` : f === "image" ? `Images (${media.filter(m=>m.type==="image").length})` : `Documents (${media.filter(m=>m.type==="document").length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size={32}/></div>
      ) : filtered.length === 0 ? (
        <div onClick={()=>fileRef.current?.click()}
          className="border-2 border-dashed rounded-xl p-16 text-center cursor-pointer transition-colors hover:border-[#25d366]/40"
          style={{ borderColor:"#1c2a3f" }}>
          <div className="text-5xl mb-4">🖼</div>
          <div className="font-bold text-base">No media files yet</div>
          <div className="text-sm mt-1" style={{ color:"#8899b0" }}>Click to upload images or PDFs for your WhatsApp templates</div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {/* Upload card */}
          <div onClick={()=>fileRef.current?.click()}
            className="border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors hover:border-[#25d366]/40 aspect-square"
            style={{ borderColor:"#1c2a3f" }}>
            <div className="text-3xl mb-2">{uploading ? "" : "+"}</div>
            {uploading ? <Spinner/> : <div className="text-xs font-semibold" style={{ color:"#8899b0" }}>Upload</div>}
          </div>

          {filtered.map(m => (
            <div key={m._id} className="rounded-xl border overflow-hidden group" style={{ borderColor:"#1c2a3f", background:"#111827" }}>
              {/* Preview */}
              <div className="aspect-square relative overflow-hidden" style={{ background:"#0d1117" }}>
                {m.type === "image" ? (
                  <img src={m.cloudinaryUrl} alt={m.name}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"/>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center">
                    <div className="text-4xl mb-2">📄</div>
                    <span className="text-xs font-bold uppercase" style={{ color:"#445566" }}>{m.format}</span>
                  </div>
                )}
              </div>
              {/* Info */}
              <div className="p-2.5">
                <div className="font-semibold text-xs truncate" title={m.name}>{m.name}</div>
                <div className="flex items-center justify-between mt-1">
                  <Badge color={m.type==="image"?"#00c9d4":"#ffb300"} >{m.type}</Badge>
                  <span className="text-xs" style={{ color:"#445566" }}>
                    {m.size ? `${Math.round(m.size/1024)}KB` : ""}
                  </span>
                </div>
                <div className="text-xs mt-1" style={{ color:"#445566" }}>{relativeTime(m.uploadedAt)}</div>
                {/* Copy URL button */}
                <button onClick={()=>{navigator.clipboard.writeText(m.cloudinaryUrl);showToast("URL copied!");}}
                  className="mt-2 text-xs font-semibold w-full text-left truncate transition-colors hover:text-[#25d366]"
                  style={{ color:"#445566" }}>
                  📋 Copy URL
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast}/>}
    </div>
  );
}
