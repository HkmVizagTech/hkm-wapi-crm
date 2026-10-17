"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { FileText, RefreshCw, Plus, Search, Link as LinkIcon, ChevronDown, ChevronUp, X } from "lucide-react";
import InfiniteSentinel from "@/components/InfiniteSentinel";
import { Modal } from "@/components/Feedback";
import { PageHeader, Card, Btn, Badge, EmptyState } from "@/components/ui";

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
  const [provider,  setProvider]  = useState("flaxxa");
  const [loading,   setLoading]   = useState(true);
  const [lastSync,  setLastSync]  = useState(null);
  const [search,    setSearch]    = useState("");
  const [catF,      setCatF]      = useState("ALL");
  const [statF,     setStatF]     = useState("ALL");
  const [expanded,  setExpanded]  = useState(null);
  const [shown,     setShown]     = useState(24);
  useEffect(()=>{ setShown(24); },[search,catF,statF,provider]);

  const fetchTpls = async (showLoad=true) => {
    if(showLoad) setLoading(true);
    try {
      const r=await fetch(`/api/templates?provider=${provider}`);
      const d=await r.json();
      if(d.templates?.length){setTemplates(d.templates.map(normalize));setLastSync(new Date());}
    } catch {}
    if(showLoad) setLoading(false);
  };

  useEffect(()=>{fetchTpls();},[provider]);

  const cats=["ALL",...new Set(templates.map(t=>t.category).filter(Boolean))];
  const list=templates.filter(t=>
    (catF==="ALL"||t.category===catF)&&
    (statF==="ALL"||t.status===statF)&&
    (!search||t.name?.toLowerCase().includes(search.toLowerCase())));
  const sc=s=>s==="APPROVED"?C.g1:s==="PENDING"?C.amber:C.red;

  return (
    <div className="page-wrap">
      <PageHeader icon={FileText} title="Templates"
        subtitle={<>{templates.filter(t=>t.status==="APPROVED").length} approved · {templates.length} total
          {lastSync&&<span style={{marginLeft:6,color:C.txd}}>· synced {lastSync.toLocaleTimeString()}</span>}</>}
        actions={<>
          <div style={{display:"flex",gap:2,background:C.surf,borderRadius:10,padding:3,
            border:`1px solid ${C.border}`}}>
            {[{v:"flaxxa",l:"Flaxxa"},{v:"gupshup",l:"Gupshup"}].map(p=>(
              <button key={p.v} onClick={()=>setProvider(p.v)} style={{
                padding:"6px 14px",borderRadius:8,border:"none",
                background:provider===p.v?`linear-gradient(135deg,${C.g1},${C.g2})`:"transparent",
                color:provider===p.v?"#04130a":C.txs,
                fontSize:12,fontWeight:700,cursor:"pointer"}}>
                {p.l}
              </button>
            ))}
          </div>
          <Btn icon={RefreshCw} loading={loading} onClick={()=>fetchTpls(true)}>{loading?"Syncing":"Sync"}</Btn>
          <Link href="/dashboard/templates/create" className="ui-btn primary" style={{textDecoration:"none"}}>
            <Plus size={15}/> Create
          </Link>
        </>}/>

      <div className="dt-toolbar ui-card" style={{marginBottom:14,borderRadius:14}}>
        <div className="dt-search">
          <Search size={15}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} type="search" name="tpl-search" autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder="Search templates"/>
          {search&&<button onClick={()=>setSearch("")} aria-label="Clear"><X size={14}/></button>}
        </div>
        <div className="chips" style={{maxWidth:"100%"}}>
          {cats.map(c=>(
            <button key={c} className={`chip ${catF===c?"on":""}`} onClick={()=>setCatF(c)}>
              {c==="ALL"?"All":c}<small>{c==="ALL"?templates.length:templates.filter(t=>t.category===c).length}</small></button>))}
        </div>
        <div className="chips" style={{maxWidth:"100%"}}>
          {["ALL","APPROVED","PENDING"].map(s=>(
            <button key={s} className={`chip ${statF===s?"on":""}`} onClick={()=>setStatF(s)}>
              {s==="ALL"?"All status":s[0]+s.slice(1).toLowerCase()}</button>))}
        </div>
      </div>

      {/* Template list */}
      {loading&&!templates.length?(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:12}}>
          {[0,1,2,3,4,5].map(i=><div key={i} className="skeleton" style={{height:170,borderRadius:14}}/>)}
        </div>
      ):(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,340px),1fr))",gap:14,alignItems:"stretch",gridAutoRows:"1fr"}}>
          {list.slice(0,shown).map(t=>(
            <div key={t.id} className="ui-card card-hover" style={{padding:14,display:"flex",flexDirection:"column",minWidth:0,
              borderLeft:`3px solid ${t.category==="MARKETING"?C.amber:C.teal}`}}>
              <div style={{display:"flex",justifyContent:"space-between",
                alignItems:"flex-start",marginBottom:10}}>
                <div style={{flex:1,paddingRight:8,minWidth:0}}>
                  <div style={{fontWeight:800,fontSize:12,
                    fontFamily:"'JetBrains Mono',monospace",
                    wordBreak:"break-all",marginBottom:6,color:"var(--tx)"}}>{t.name}</div>
                  <div style={{display:"flex",gap:5,flexWrap:"wrap",alignItems:"center"}}>
                    <Badge tone={t.category==="MARKETING"?"amber":"teal"}>{t.category}</Badge>
                    <span style={{fontSize:10,color:C.txd}}>{t.language}</span>
                    {t.header&&<Badge tone="blue">{String(t.header).replace(/:.+/,"")}</Badge>}
                  </div>
                </div>
                <Badge tone={t.status==="APPROVED"?"green":t.status==="PENDING"?"amber":"red"}>{t.status}</Badge>
              </div>
              <div style={{background:C.surf,borderRadius:10,padding:"10px 12px",marginBottom:10,
                border:`1px solid ${C.border}`,minHeight:96,flex:"1 1 auto"}}>
                <p style={{fontSize:12,color:C.txs,lineHeight:1.6,
                  whiteSpace:"pre-wrap",wordBreak:"break-word",margin:0,
                  display:"-webkit-box",WebkitLineClamp:4,WebkitBoxOrient:"vertical",overflow:"hidden"}}>
                  {t.body||<span style={{fontStyle:"italic"}}>No body text</span>}
                </p>
              </div>
              <div style={{marginTop:"auto"}}>
              {t.params?.length>0&&(
                <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:6}}>
                  {t.params.map((p,i)=>(
                    <Badge key={i} tone="blue">{`{{${i+1}}}`} {p}</Badge>
                  ))}
                </div>
              )}
              {t.buttons?.length>0&&(
                <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:6}}>
                  {t.buttons.map((b,i)=>(
                    <Badge key={i} tone="purple" icon={LinkIcon}>{b}</Badge>
                  ))}
                </div>
              )}
              {t.body?.length>120&&(
                <button onClick={()=>setExpanded(t)}
                  style={{fontSize:11,color:C.txs,background:"none",fontWeight:600,
                    border:"none",cursor:"pointer",padding:0,display:"inline-flex",alignItems:"center",gap:4}}>
                  <><ChevronDown size={13}/> Full body</>
                </button>
              )}
              </div>
            </div>
          ))}
          {list.length>shown&&<div style={{gridColumn:"1/-1"}}><InfiniteSentinel onVisible={()=>setShown(n=>n+24)} hasMore/></div>}
          {list.length===0&&(
            <div style={{gridColumn:"1/-1"}}>
              <EmptyState icon={FileText} title="No templates match" hint="Try a different search or filter"/>
            </div>
          )}
        </div>
      )}
      <Modal open={!!expanded} onClose={()=>setExpanded(null)} icon={FileText} title={expanded?.name||""} width={560}>
        {expanded&&(
          <div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
              <Badge tone={expanded.category==="MARKETING"?"amber":"teal"}>{expanded.category}</Badge>
              <Badge tone={expanded.status==="APPROVED"?"green":expanded.status==="PENDING"?"amber":"red"}>{expanded.status}</Badge>
              {expanded.language&&<Badge>{expanded.language}</Badge>}
              {expanded.header&&<Badge tone="blue">{String(expanded.header).replace(/:.+/,"")}</Badge>}
            </div>
            <div style={{background:C.surf,border:`1px solid ${C.border}`,borderRadius:12,padding:14}}>
              <p style={{fontSize:14,lineHeight:1.65,color:"var(--tx)",whiteSpace:"pre-wrap",wordBreak:"break-word",margin:0}}>{expanded.body}</p>
            </div>
            {expanded.params?.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:5,marginTop:12}}>
              {expanded.params.map((p,i)=><Badge key={i} tone="blue">{`{{${i+1}}}`} {p}</Badge>)}</div>}
            {expanded.buttons?.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:5,marginTop:8}}>
              {expanded.buttons.map((b,i)=><Badge key={i} tone="purple" icon={LinkIcon}>{b}</Badge>)}</div>}
          </div>
        )}
      </Modal>
    </div>
  );
}
