"use client";
import { useState }  from "react";
import { TEMPLATES } from "@/lib/utils";

const C={g1:"#25d366",teal:"#00c9d4",blue:"#2979ff",amber:"#ffb300",red:"#f44336",purple:"#9c27b0",
  card:"#111827",surf:"#0d1117",border:"#1c2a3f",tx:"#e8edf5",txs:"#8899b0",txd:"#445566"};

export default function Templates() {
  const [search,setSearch]=useState("");
  const [catF,setCatF]=useState("ALL");
  const [exp,setExp]=useState(null);
  const cats=["ALL",...new Set(TEMPLATES.map(t=>t.category))];
  const list=TEMPLATES.filter(t=>
    (catF==="ALL"||t.category===catF)&&
    (!search||t.name.toLowerCase().includes(search.toLowerCase())));
  const sc=s=>s==="APPROVED"?C.g1:s==="PENDING"?C.amber:C.red;

  return (
    <div style={{padding:24}}>
      <div style={{marginBottom:20}}>
        <h1 style={{fontSize:20,fontWeight:800}}>📋 Templates</h1>
        <p style={{fontSize:13,color:C.txs,marginTop:2}}>
          {TEMPLATES.filter(t=>t.status==="APPROVED").length} approved · {TEMPLATES.length} total
        </p>
      </div>
      <div style={{display:"flex",gap:10,marginBottom:18,flexWrap:"wrap"}}>
        <input style={{flex:1,minWidth:200,background:C.surf,border:`1px solid ${C.border}`,
          borderRadius:10,padding:"9px 13px",color:C.tx,fontSize:13,outline:"none"}}
          placeholder="🔍 Search templates…" value={search} onChange={e=>setSearch(e.target.value)}/>
        <div style={{display:"flex",gap:3,background:C.surf,borderRadius:10,padding:3,
          border:`1px solid ${C.border}`}}>
          {cats.map(c=>(
            <button key={c} onClick={()=>setCatF(c)} style={{
              padding:"6px 14px",borderRadius:7,border:"none",
              background:catF===c?C.g1:"transparent",
              color:catF===c?"#000":C.txs,fontSize:12,fontWeight:700,cursor:"pointer"}}>
              {c}
            </button>
          ))}
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:14}}>
        {list.map(t=>(
          <div key={t.id} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,
            padding:16,borderLeft:`4px solid ${t.category==="MARKETING"?C.amber:C.teal}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
              <div style={{flex:1,paddingRight:8}}>
                <div style={{fontWeight:800,fontSize:12,fontFamily:"'JetBrains Mono',monospace",
                  wordBreak:"break-all",marginBottom:5}}>{t.name}</div>
                <div style={{display:"flex",gap:5,flexWrap:"wrap",alignItems:"center"}}>
                  <span style={{fontSize:10,fontWeight:700,padding:"1px 7px",borderRadius:20,
                    background:`${t.category==="MARKETING"?C.amber:C.teal}18`,
                    color:t.category==="MARKETING"?C.amber:C.teal}}>{t.category}</span>
                  <span style={{fontSize:10,color:C.txd}}>{t.language}</span>
                  {t.header&&<span style={{fontSize:10,fontWeight:700,padding:"1px 7px",borderRadius:20,
                    background:`${C.blue}18`,color:C.blue}}>{String(t.header).replace(/:.+/,"")}</span>}
                </div>
              </div>
              <span style={{fontSize:10,fontWeight:800,padding:"2px 8px",borderRadius:20,flexShrink:0,
                background:`${sc(t.status)}18`,color:sc(t.status)}}>{t.status}</span>
            </div>
            <div style={{background:C.surf,borderRadius:8,padding:10,marginBottom:10,
              border:`1px solid ${C.border}`,maxHeight:exp===t.id?"none":"72px",overflow:"hidden"}}>
              <p style={{fontSize:12,color:C.txs,lineHeight:1.6,whiteSpace:"pre-wrap",wordBreak:"break-word"}}>{t.body}</p>
            </div>
            {t.params.length>0&&(
              <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:8}}>
                {t.params.map((p,i)=>(
                  <span key={i} style={{fontSize:10,padding:"2px 8px",borderRadius:20,fontWeight:700,
                    background:`${C.blue}14`,color:C.blue}}>{`{{${i+1}}}`} {p}</span>
                ))}
              </div>
            )}
            {(t.buttons||[]).map((b,i)=>(
              <span key={i} style={{fontSize:10,padding:"2px 8px",borderRadius:20,fontWeight:700,
                marginRight:4,background:`${C.purple}14`,color:C.purple}}>🔗 {b}</span>
            ))}
            <button onClick={()=>setExp(exp===t.id?null:t.id)}
              style={{fontSize:11,color:C.txd,background:"none",border:"none",
                cursor:"pointer",marginTop:6,padding:0}}>
              {exp===t.id?"↑ Less":"↓ Full body"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
