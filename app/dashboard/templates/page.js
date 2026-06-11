"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

const C={g1:"#25d366",g2:"#1aad52",teal:"#00c9d4",blue:"#2979ff",
  amber:"#ffb300",red:"#f44336",purple:"#9c27b0",
  card:"#111827",surf:"#0d1117",border:"#1c2a3f",
  tx:"#e8edf5",txs:"#8899b0",txd:"#445566"};

function parseBody(s){try{const c=typeof s==="string"?JSON.parse(s):s;if(Array.isArray(c))return c.find(x=>x.type==="BODY")?.text||"";}catch{}return "";}
function parseParams(s){const b=parseBody(s);return[...b.matchAll(/\{\{(\d+)\}\}/g)].map(m=>`Param ${m[1]}`);}
function parseHeader(s){try{const c=typeof s==="string"?JSON.parse(s):s;if(Array.isArray(c))return c.find(x=>x.type==="HEADER")?.format||null;}catch{}return null;}
function parseButtons(s){try{const c=typeof s==="string"?JSON.parse(s):s;if(Array.isArray(c))return c.find(x=>x.type==="BUTTONS")?.buttons?.map(b=>b.text)||[];}catch{}return[];}
function normalize(t){
  if(t.components)return{id:t.id,name:t.name,status:t.status,category:t.category,
    language:t.language,body:parseBody(t.components),params:parseParams(t.components),
    header:parseHeader(t.components),buttons:parseButtons(t.components)};
  return t;
}

export default function Templates() {
  const [templates, setTemplates] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [lastSync,  setLastSync]  = useState(null);
  const [search,    setSearch]    = useState("");
  const [catF,      setCatF]      = useState("ALL");
  const [statF,     setStatF]     = useState("ALL");
  const [expanded,  setExpanded]  = useState(null);

  const fetchTpls = async (showLoad=true) => {
    if(showLoad) setLoading(true);
    try {
      const r=await fetch("/api/templates");
      const d=await r.json();
      if(d.templates?.length){setTemplates(d.templates.map(normalize));setLastSync(new Date());}
    } catch {}
    if(showLoad) setLoading(false);
  };

  useEffect(()=>{fetchTpls();},[]);

  const cats=["ALL",...new Set(templates.map(t=>t.category).filter(Boolean))];
  const list=templates.filter(t=>
    (catF==="ALL"||t.category===catF)&&
    (statF==="ALL"||t.status===statF)&&
    (!search||t.name?.toLowerCase().includes(search.toLowerCase())));
  const sc=s=>s==="APPROVED"?C.g1:s==="PENDING"?C.amber:C.red;

  return (
    <div style={{padding:16}}>
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",
        alignItems:"flex-start",marginBottom:14}}>
        <div>
          <h1 style={{fontSize:18,fontWeight:800}}>📋 Templates</h1>
          <p style={{fontSize:12,color:C.txs,marginTop:2}}>
            {templates.filter(t=>t.status==="APPROVED").length} approved · {templates.length} total
            {lastSync&&<span style={{marginLeft:6,color:C.txd}}>· {lastSync.toLocaleTimeString()}</span>}
          </p>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>fetchTpls(true)} disabled={loading}
            style={{padding:"8px 12px",borderRadius:9,border:`1px solid ${C.border}`,
              background:loading?C.surf:`linear-gradient(135deg,${C.teal},#0097a7)`,
              color:loading?C.txs:"#000",fontWeight:700,fontSize:12,cursor:"pointer",
              display:"inline-flex",alignItems:"center",gap:5}}>
            {loading?(
              <><div style={{width:11,height:11,border:`2px solid ${C.border}`,
                borderTopColor:C.teal,borderRadius:"50%",animation:"spin .7s linear infinite"}}/>
              Syncing</>
            ):"↻ Sync"}
          </button>
          <Link href="/dashboard/templates/create" style={{
            padding:"8px 12px",borderRadius:9,textDecoration:"none",fontWeight:700,fontSize:12,
            background:`linear-gradient(135deg,${C.g1},${C.g2})`,color:"#000"}}>
            + Create
          </Link>
        </div>
      </div>

      {/* Search */}
      <input style={{width:"100%",background:C.surf,border:`1px solid ${C.border}`,
        borderRadius:10,padding:"9px 13px",color:C.tx,fontSize:13,outline:"none",
        boxSizing:"border-box",marginBottom:10}}
        placeholder="🔍 Search templates…"
        value={search} onChange={e=>setSearch(e.target.value)}/>

      {/* Filters - horizontal scroll */}
      <div style={{display:"flex",gap:4,overflowX:"auto",paddingBottom:4,marginBottom:14}}>
        {cats.map(c=>(
          <button key={c} onClick={()=>setCatF(c)} style={{
            padding:"5px 12px",borderRadius:20,border:"none",flexShrink:0,
            background:catF===c?C.g1:C.border,
            color:catF===c?"#000":C.txs,fontSize:11,fontWeight:700,cursor:"pointer"}}>
            {c}
          </button>
        ))}
        {["ALL","APPROVED","PENDING"].map(s=>(
          <button key={s} onClick={()=>setStatF(s)} style={{
            padding:"5px 12px",borderRadius:20,border:"none",flexShrink:0,cursor:"pointer",
            background:statF===s?(s==="APPROVED"?`${C.g1}25`:s==="PENDING"?`${C.amber}25`:C.border):"transparent",
            color:s==="APPROVED"?C.g1:s==="PENDING"?C.amber:C.txs,
            fontSize:11,fontWeight:700}}>
            {s==="ALL"?"All Status":s}
          </button>
        ))}
      </div>

      {/* Template list */}
      {loading&&!templates.length?(
        <p style={{color:C.txd,textAlign:"center",padding:40}}>Loading from Flaxxa…</p>
      ):(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {list.map(t=>(
            <div key={t.id} style={{background:C.card,border:`1px solid ${C.border}`,
              borderRadius:12,padding:14,
              borderLeft:`4px solid ${t.category==="MARKETING"?C.amber:C.teal}`}}>
              <div style={{display:"flex",justifyContent:"space-between",
                alignItems:"flex-start",marginBottom:8}}>
                <div style={{flex:1,paddingRight:8,minWidth:0}}>
                  <div style={{fontWeight:800,fontSize:12,
                    fontFamily:"'JetBrains Mono',monospace",
                    wordBreak:"break-all",marginBottom:4}}>{t.name}</div>
                  <div style={{display:"flex",gap:5,flexWrap:"wrap",alignItems:"center"}}>
                    <span style={{fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:20,
                      background:`${t.category==="MARKETING"?C.amber:C.teal}18`,
                      color:t.category==="MARKETING"?C.amber:C.teal}}>{t.category}</span>
                    <span style={{fontSize:9,color:C.txd}}>{t.language}</span>
                    {t.header&&<span style={{fontSize:9,fontWeight:700,padding:"1px 6px",
                      borderRadius:20,background:`${C.blue}18`,color:C.blue}}>
                      {String(t.header).replace(/:.+/,"")}
                    </span>}
                  </div>
                </div>
                <span style={{fontSize:9,fontWeight:800,padding:"2px 7px",
                  borderRadius:20,flexShrink:0,
                  background:`${sc(t.status)}18`,color:sc(t.status)}}>
                  {t.status}
                </span>
              </div>
              <div style={{background:C.surf,borderRadius:8,padding:10,marginBottom:8,
                border:`1px solid ${C.border}`,
                maxHeight:expanded===t.id?"none":"68px",overflow:"hidden"}}>
                <p style={{fontSize:12,color:C.txs,lineHeight:1.6,
                  whiteSpace:"pre-wrap",wordBreak:"break-word",margin:0}}>
                  {t.body||<span style={{fontStyle:"italic"}}>No body text</span>}
                </p>
              </div>
              {t.params?.length>0&&(
                <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:6}}>
                  {t.params.map((p,i)=>(
                    <span key={i} style={{fontSize:9,padding:"2px 7px",borderRadius:20,
                      fontWeight:700,background:`${C.blue}14`,color:C.blue}}>
                      {`{{${i+1}}}`} {p}
                    </span>
                  ))}
                </div>
              )}
              {t.buttons?.length>0&&(
                <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:6}}>
                  {t.buttons.map((b,i)=>(
                    <span key={i} style={{fontSize:9,padding:"2px 7px",borderRadius:20,
                      fontWeight:700,background:`${C.purple}14`,color:C.purple}}>
                      🔗 {b}
                    </span>
                  ))}
                </div>
              )}
              {t.body?.length>120&&(
                <button onClick={()=>setExpanded(expanded===t.id?null:t.id)}
                  style={{fontSize:11,color:C.txd,background:"none",
                    border:"none",cursor:"pointer",padding:0}}>
                  {expanded===t.id?"↑ Less":"↓ Full body"}
                </button>
              )}
            </div>
          ))}
          {list.length===0&&(
            <div style={{textAlign:"center",padding:40,color:C.txd}}>
              <div style={{fontSize:32,marginBottom:8}}>📋</div>
              <p style={{color:C.txs}}>No templates match</p>
            </div>
          )}
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
