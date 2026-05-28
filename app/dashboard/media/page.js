"use client";
import { useState, useEffect, useRef } from "react";
import { relTime } from "@/lib/utils";

const C={g1:"#25d366",teal:"#00c9d4",amber:"#ffb300",red:"#f44336",
  card:"#111827",surf:"#0d1117",border:"#1c2a3f",tx:"#e8edf5",txs:"#8899b0",txd:"#445566"};

export default function Media() {
  const [media,setMedia]=useState([]);
  const [loading,setLoading]=useState(true);
  const [uploading,setUploading]=useState(false);
  const [toast,setToast]=useState(null);
  const fileRef=useRef();

  const showToast=(m,t="success")=>{setToast({m,t});setTimeout(()=>setToast(null),3500);};
  const load=()=>fetch("/api/media").then(r=>r.json()).then(d=>{setMedia(d.media||[]);setLoading(false);});
  useEffect(()=>{load();},[]);

  const upload=async e=>{
    const file=e.target.files[0];if(!file)return;
    setUploading(true);
    const fd=new FormData();fd.append("file",file);fd.append("name",file.name);
    const r=await fetch("/api/media/upload",{method:"POST",body:fd});
    if(r.ok){showToast("Uploaded!");load();}
    else showToast("Upload failed","error");
    setUploading(false);e.target.value="";
  };

  return (
    <div style={{padding:24}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div>
          <h1 style={{fontSize:20,fontWeight:800}}>🖼 Media Library</h1>
          <p style={{fontSize:13,color:C.txs,marginTop:2}}>{media.length} files · Images & PDFs for templates</p>
        </div>
        <input ref={fileRef} type="file" accept="image/*,.pdf,.doc,.docx" onChange={upload} style={{display:"none"}}/>
        <button onClick={()=>fileRef.current?.click()} disabled={uploading}
          style={{padding:"9px 18px",borderRadius:9,border:"none",fontWeight:700,fontSize:13,
            background:`linear-gradient(135deg,${C.g1},#1aad52)`,color:"#000",
            cursor:uploading?"not-allowed":"pointer",opacity:uploading?.6:1,
            display:"inline-flex",alignItems:"center",gap:6}}>
          {uploading?"⏳ Uploading…":"⬆ Upload File"}
        </button>
      </div>

      {loading?<p style={{color:C.txd,textAlign:"center",padding:40}}>Loading…</p>
      :media.length===0?(
        <div onClick={()=>fileRef.current?.click()} style={{
          border:`2px dashed ${C.border}`,borderRadius:14,padding:"60px 20px",
          textAlign:"center",cursor:"pointer"}}>
          <div style={{fontSize:48,marginBottom:12}}>🖼</div>
          <div style={{fontWeight:700,fontSize:16}}>No media files yet</div>
          <div style={{fontSize:13,color:C.txs,marginTop:6}}>Click to upload images or PDFs for your WhatsApp templates</div>
        </div>
      ):(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:14}}>
          <div onClick={()=>fileRef.current?.click()} style={{
            border:`2px dashed ${C.border}`,borderRadius:12,aspectRatio:"1",
            display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
            cursor:"pointer",background:C.surf}}>
            <div style={{fontSize:28,marginBottom:6}}>{uploading?"⏳":"+"}</div>
            <div style={{fontSize:12,color:C.txs,fontWeight:600}}>{uploading?"Uploading…":"Upload"}</div>
          </div>
          {media.map(m=>(
            <div key={m._id} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden"}}>
              <div style={{aspectRatio:"1",background:C.surf,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>
                {m.type==="image"
                  ?<img src={m.cloudinaryUrl} alt={m.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                  :<div style={{textAlign:"center"}}><div style={{fontSize:36}}>📄</div>
                    <div style={{fontSize:10,color:C.txd,fontWeight:700,textTransform:"uppercase"}}>{m.format}</div></div>}
              </div>
              <div style={{padding:10}}>
                <div style={{fontWeight:600,fontSize:12,overflow:"hidden",
                  textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:4}}>{m.name}</div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                  <span style={{fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:20,
                    background:`${m.type==="image"?C.teal:C.amber}18`,
                    color:m.type==="image"?C.teal:C.amber}}>{m.type}</span>
                  <span style={{fontSize:10,color:C.txd}}>{m.size?Math.round(m.size/1024)+"KB":""}</span>
                </div>
                <button onClick={()=>{navigator.clipboard.writeText(m.cloudinaryUrl);showToast("URL copied!");}}
                  style={{width:"100%",padding:"5px",borderRadius:6,border:`1px solid ${C.border}`,
                    background:"transparent",color:C.txd,fontSize:10,cursor:"pointer",fontWeight:600}}>
                  📋 Copy URL
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {toast&&(
        <div style={{position:"fixed",bottom:20,right:20,zIndex:999,padding:"11px 18px",
          borderRadius:10,fontWeight:700,fontSize:13,cursor:"pointer",
          background:toast.t==="success"?`${C.g1}ee`:`${C.red}ee`,
          color:toast.t==="error"?"#fff":"#000"}} onClick={()=>setToast(null)}>
          {toast.t==="success"?"✓":"✕"} {toast.m}
        </div>
      )}
    </div>
  );
}
