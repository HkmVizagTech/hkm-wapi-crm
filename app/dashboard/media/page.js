"use client";
import { useState, useEffect, useRef } from "react";
import { relTime } from "@/lib/utils";
import { Image as ImageIcon, Upload, FileText, Copy, Plus, ExternalLink } from "lucide-react";
import { PageHeader, Btn, Badge, EmptyState, Spinner } from "@/components/ui";
import InfiniteSentinel from "@/components/InfiniteSentinel";
import { Modal, useToast } from "@/components/Feedback";

const PAGE = 24;
const fmtSize = b => !b ? "—" : b < 1048576 ? Math.round(b/1024) + " KB" : (b/1048576).toFixed(1) + " MB";

export default function Media() {
  const toast = useToast();
  const [media,    setMedia]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [uploading,setUploading]= useState(false);
  const [shown,    setShown]    = useState(PAGE);
  const [sel,      setSel]      = useState(null);
  const fileRef = useRef();

  const load=()=>fetch("/api/media").then(r=>r.json()).then(d=>{
    setMedia(d.media||[]);setLoading(false);
  }).catch(()=>setLoading(false));
  useEffect(()=>{load();},[]);

  const upload=async e=>{
    const file=e.target.files[0];if(!file)return;
    setUploading(true);
    try{
      const fd=new FormData();fd.append("file",file);fd.append("name",file.name);
      const r=await fetch("/api/media/upload",{method:"POST",body:fd});
      const d=await r.json();
      if(r.ok){toast("Uploaded");load();}
      else toast(d.error||"Upload failed","error");
    }catch{toast("Upload failed","error");}
    setUploading(false);e.target.value="";
  };

  const copy=async m=>{
    try{await navigator.clipboard.writeText(m.cloudinaryUrl);toast("URL copied");}
    catch{toast("Could not copy URL","error");}
  };

  const grid={display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(230px,100%),1fr))",gap:16};
  const visible=media.slice(0,shown);

  return (
    <div className="page-wrap">
      <input ref={fileRef} type="file" accept="image/*,.pdf,.doc,.docx"
        onChange={upload} style={{display:"none"}}/>
      <PageHeader icon={ImageIcon} title="Media Library" subtitle={`${media.length} files`}
        actions={<Btn variant="primary" icon={Upload} loading={uploading}
          onClick={()=>fileRef.current?.click()}>{uploading?"Uploading…":"Upload"}</Btn>}/>

      {loading?(
        <div style={grid}>
          {[0,1,2,3,4,5].map(i=><div key={i} className="skeleton" style={{aspectRatio:"1",borderRadius:14}}/>)}
        </div>
      ):media.length===0?(
        <div onClick={()=>fileRef.current?.click()} className="ui-card" style={{
          border:"2px dashed var(--line)",cursor:"pointer"}}>
          <EmptyState icon={ImageIcon} title="No media yet" hint="Click to upload images or PDFs"/>
        </div>
      ):(
        <>
        <div style={grid}>
          <div onClick={()=>fileRef.current?.click()} style={{
            border:"2px dashed var(--line2)",borderRadius:14,minHeight:200,
            display:"flex",flexDirection:"column",alignItems:"center",
            justifyContent:"center",cursor:"pointer",background:"var(--panel)"}}>
            <div style={{marginBottom:6,color:"var(--brand)",display:"flex"}}>{uploading?<Spinner size={22}/>:<Plus size={24}/>}</div>
            <div style={{fontSize:11,color:"var(--tx2)",fontWeight:600}}>{uploading?"Uploading…":"Upload"}</div>
          </div>

          {visible.map(m=>(
            <div key={m._id} className="card-hover" onClick={()=>setSel(m)} style={{background:"var(--card)",
              border:"1px solid var(--line)",borderRadius:12,overflow:"hidden",cursor:"pointer",minWidth:0}}>
              <div style={{aspectRatio:"4 / 5",background:"var(--panel)",overflow:"hidden",position:"relative",
                display:"flex",alignItems:"center",justifyContent:"center"}}>
                {m.type==="image"?(<>
                  {/* soft blurred backdrop + the full image (never cropped) */}
                  <img src={m.cloudinaryUrl} alt="" aria-hidden loading="lazy"
                    style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",filter:"blur(22px) brightness(.45)",transform:"scale(1.15)"}}/>
                  <img src={m.cloudinaryUrl} alt={m.name} loading="lazy"
                    style={{position:"relative",width:"100%",height:"100%",objectFit:"contain"}}/></>
                ):(
                  <div style={{textAlign:"center"}}>
                    <div style={{display:"flex",justifyContent:"center",color:"#ffb300",marginBottom:4}}><FileText size={32}/></div>
                    <div style={{fontSize:10,color:"var(--tx3)",fontWeight:700,textTransform:"uppercase"}}>{m.format}</div>
                  </div>
                )}
              </div>
              <div style={{padding:"12px 14px"}}>
                <div title={m.name} style={{fontWeight:600,fontSize:13,overflow:"hidden",
                  textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:6}}>{m.name}</div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6,gap:6}}>
                  <Badge tone={m.type==="image"?"teal":"amber"}>{m.type}</Badge>
                  <span style={{fontSize:11,color:"var(--tx3)",whiteSpace:"nowrap"}}>{[m.size?fmtSize(m.size):"",m.uploadedAt?relTime(m.uploadedAt):""].filter(Boolean).join(" · ")}</span>
                </div>
                <Btn size="sm" icon={Copy} style={{width:"100%"}} onClick={e=>{e.stopPropagation();copy(m);}}>Copy URL</Btn>
              </div>
            </div>
          ))}
        </div>
        <InfiniteSentinel onVisible={()=>setShown(n=>n+PAGE)} hasMore={shown<media.length}
          endLabel={`All ${media.length} files shown`}/>
        </>
      )}

      <Modal open={!!sel} onClose={()=>setSel(null)} title={sel?.name||"Preview"} icon={sel?.type==="image"?ImageIcon:FileText} width={680}
        footer={sel&&<>
          <a className="ui-btn" href={sel.cloudinaryUrl} target="_blank" rel="noreferrer" style={{textDecoration:"none"}}><ExternalLink size={15}/>Open</a>
          <Btn variant="primary" icon={Copy} onClick={()=>copy(sel)}>Copy URL</Btn>
        </>}>
        {sel&&<>
          <div style={{background:"var(--panel)",border:"1px solid var(--line)",borderRadius:12,display:"flex",
            alignItems:"center",justifyContent:"center",minHeight:180,overflow:"hidden",marginBottom:14}}>
            {sel.type==="image"
              ? <img src={sel.cloudinaryUrl} alt={sel.name} style={{maxWidth:"100%",maxHeight:"calc(var(--vh100) * .5)",objectFit:"contain"}}/>
              : <div style={{textAlign:"center",padding:30,color:"#ffb300"}}><FileText size={56}/>
                  <div style={{fontSize:12,color:"var(--tx3)",fontWeight:700,textTransform:"uppercase",marginTop:6}}>{sel.format}</div></div>}
          </div>
          {[["Name",sel.name],["Type",<Badge key="t" tone={sel.type==="image"?"teal":"amber"}>{sel.type}{sel.format?` · ${sel.format}`:""}</Badge>],
            ["Size",fmtSize(sel.size)],["Uploaded",sel.uploadedAt?new Date(sel.uploadedAt).toLocaleString("en-IN",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}):"—"]].map(([l,v])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",gap:12,padding:"9px 0",borderBottom:"1px solid var(--line)",fontSize:13}}>
              <span style={{color:"var(--tx3)",flexShrink:0}}>{l}</span>
              <span style={{minWidth:0,overflowWrap:"anywhere",textAlign:"right",fontWeight:600}}>{v}</span>
            </div>))}
          <div className="mono" style={{marginTop:12,fontSize:11,color:"var(--tx2)",background:"var(--panel)",border:"1px solid var(--line)",
            borderRadius:8,padding:"8px 10px",overflowWrap:"anywhere"}}>{sel.cloudinaryUrl}</div>
        </>}
      </Modal>
    </div>
  );
}
