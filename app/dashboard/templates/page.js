"use client";
import { useState, useEffect } from "react";
import { TEMPLATES }           from "@/lib/utils";
import Link                    from "next/link";

const C = {
  g1:"#25d366", g2:"#1aad52", teal:"#00c9d4", blue:"#2979ff",
  amber:"#ffb300", red:"#f44336", purple:"#9c27b0",
  card:"#111827", surf:"#0d1117", border:"#1c2a3f",
  tx:"#e8edf5", txs:"#8899b0", txd:"#445566",
};

function parseBody(components) {
  try {
    const c = typeof components === "string" ? JSON.parse(components) : components;
    if (Array.isArray(c)) return c.find(x => x.type==="BODY")?.text || "";
  } catch {}
  return "";
}

function parseParams(components) {
  const body = parseBody(components);
  if (!body) return [];
  return [...body.matchAll(/\{\{(\d+)\}\}/g)].map(m => `Param ${m[1]}`);
}

function parseHeader(components) {
  try {
    const c = typeof components === "string" ? JSON.parse(components) : components;
    if (Array.isArray(c)) return c.find(x => x.type==="HEADER")?.format || null;
  } catch {}
  return null;
}

function parseButtons(components) {
  try {
    const c = typeof components === "string" ? JSON.parse(components) : components;
    if (Array.isArray(c)) return c.find(x => x.type==="BUTTONS")?.buttons?.map(b=>b.text) || [];
  } catch {}
  return [];
}

// Normalize template from either source (Flaxxa API or hardcoded)
function normalizeTemplate(t) {
  // If from Flaxxa API — has components as JSON string
  if (t.components && (typeof t.components === "string" || Array.isArray(t.components))) {
    return {
      id:       t.id,
      name:     t.name,
      status:   t.status,
      category: t.category,
      language: t.language,
      body:     parseBody(t.components),
      params:   parseParams(t.components),
      header:   parseHeader(t.components),
      buttons:  parseButtons(t.components),
    };
  }
  // Already normalized (hardcoded)
  return {
    id:       t.id,
    name:     t.name,
    status:   t.status,
    category: t.category,
    language: t.language,
    body:     t.body || "",
    params:   t.params || [],
    header:   t.header || null,
    buttons:  t.buttons || [],
  };
}

export default function Templates() {
  const [templates,  setTemplates]  = useState(TEMPLATES.map(normalizeTemplate));
  const [loading,    setLoading]    = useState(false);
  const [lastSync,   setLastSync]   = useState(null);
  const [syncErr,    setSyncErr]    = useState("");
  const [search,     setSearch]     = useState("");
  const [catF,       setCatF]       = useState("ALL");
  const [statF,      setStatF]      = useState("ALL");
  const [expanded,   setExpanded]   = useState(null);

  // Try to fetch live templates on mount
  useEffect(() => { fetchTemplates(false); }, []);

  const fetchTemplates = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setSyncErr("");
    try {
      const r = await fetch("/api/templates");
      const d = await r.json();
      if (r.ok && d.templates?.length) {
        setTemplates(d.templates.map(normalizeTemplate));
        setLastSync(new Date());
      } else {
        setSyncErr(d.error || "Failed to fetch from Flaxxa");
        // Keep existing templates
      }
    } catch(e) {
      setSyncErr("Network error: " + e.message);
    }
    if (showLoading) setLoading(false);
  };

  const cats = ["ALL", ...new Set(templates.map(t => t.category).filter(Boolean))];
  const list = templates.filter(t =>
    (catF  === "ALL" || t.category === catF) &&
    (statF === "ALL" || t.status   === statF) &&
    (!search || t.name?.toLowerCase().includes(search.toLowerCase()) ||
                t.body?.toLowerCase().includes(search.toLowerCase()))
  );

  const sc = s => s==="APPROVED" ? C.g1 : s==="PENDING" ? C.amber : C.red;
  const approved = templates.filter(t => t.status==="APPROVED").length;

  return (
    <div style={{padding:24}}>
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
        <div>
          <h1 style={{fontSize:20,fontWeight:800}}>📋 Templates</h1>
          <div style={{display:"flex",alignItems:"center",gap:10,marginTop:4}}>
            <span style={{fontSize:13,color:C.txs}}>
              {approved} approved · {templates.length} total
            </span>
            {lastSync && (
              <span style={{fontSize:11,color:C.txd}}>
                Last synced: {lastSync.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
        <div style={{display:"flex",gap:10}}>
          {/* Refresh button */}
          <button onClick={()=>fetchTemplates(true)} disabled={loading}
            style={{padding:"9px 16px",borderRadius:9,border:`1px solid ${C.border}`,
              background:loading?C.surf:`linear-gradient(135deg,${C.teal},#0097a7)`,
              color:loading?C.txs:"#000",fontWeight:700,fontSize:13,cursor:"pointer",
              display:"inline-flex",alignItems:"center",gap:6,
              opacity:loading?.7:1}}>
            {loading ? (
              <>
                <div style={{width:13,height:13,border:`2px solid ${C.border}`,
                  borderTopColor:C.teal,borderRadius:"50%",animation:"spin .7s linear infinite"}}/>
                Syncing…
              </>
            ) : "↻ Sync from Flaxxa"}
          </button>
          {/* Create template button */}
          <Link href="/dashboard/templates/create" style={{
            padding:"9px 18px",borderRadius:9,textDecoration:"none",fontWeight:700,fontSize:13,
            background:`linear-gradient(135deg,${C.g1},${C.g2})`,color:"#000",
            display:"inline-flex",alignItems:"center",gap:6}}>
            + Create Template
          </Link>
        </div>
      </div>

      {/* Sync error */}
      {syncErr && (
        <div style={{padding:"10px 14px",borderRadius:9,marginBottom:14,fontSize:13,
          background:`${C.amber}10`,border:`1px solid ${C.amber}30`,color:C.amber}}>
          ⚠ {syncErr} — showing cached templates
        </div>
      )}

      {/* Filters */}
      <div style={{display:"flex",gap:10,marginBottom:18,flexWrap:"wrap"}}>
        <input style={{flex:1,minWidth:200,background:C.surf,border:`1px solid ${C.border}`,
          borderRadius:10,padding:"9px 13px",color:C.tx,fontSize:13,outline:"none"}}
          placeholder="🔍 Search by name or body text…"
          value={search} onChange={e=>setSearch(e.target.value)}/>

        {/* Category filter */}
        <div style={{display:"flex",gap:3,background:C.surf,borderRadius:10,
          padding:3,border:`1px solid ${C.border}`}}>
          {cats.map(c=>(
            <button key={c} onClick={()=>setCatF(c)} style={{
              padding:"6px 12px",borderRadius:7,border:"none",cursor:"pointer",
              background:catF===c?C.g1:"transparent",
              color:catF===c?"#000":C.txs,fontSize:12,fontWeight:700}}>
              {c}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div style={{display:"flex",gap:3,background:C.surf,borderRadius:10,
          padding:3,border:`1px solid ${C.border}`}}>
          {["ALL","APPROVED","PENDING","REJECTED"].map(s=>(
            <button key={s} onClick={()=>setStatF(s)} style={{
              padding:"6px 12px",borderRadius:7,border:"none",cursor:"pointer",
              background:statF===s?(s==="APPROVED"?`${C.g1}25`:s==="PENDING"?`${C.amber}25`:s==="REJECTED"?`${C.red}25`:C.border):"transparent",
              color:s==="APPROVED"?C.g1:s==="PENDING"?C.amber:s==="REJECTED"?C.red:C.txs,
              fontSize:12,fontWeight:700}}>
              {s==="ALL"?"ALL":s}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <p style={{fontSize:12,color:C.txd,marginBottom:14}}>
        Showing {list.length} of {templates.length} templates
      </p>

      {/* Grid */}
      {list.length===0 ? (
        <div style={{textAlign:"center",padding:"60px 20px",color:C.txd}}>
          <div style={{fontSize:36,marginBottom:10}}>📋</div>
          <p style={{color:C.txs,fontWeight:600}}>No templates match</p>
        </div>
      ) : (
        <div style={{display:"grid",
          gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:14}}>
          {list.map(t=>(
            <div key={t.id} style={{background:C.card,border:`1px solid ${C.border}`,
              borderRadius:12,padding:16,position:"relative",
              borderLeft:`4px solid ${t.category==="MARKETING"?C.amber:C.teal}`}}>

              {/* Status badge */}
              <div style={{position:"absolute",top:12,right:12}}>
                <span style={{fontSize:10,fontWeight:800,padding:"2px 8px",borderRadius:20,
                  background:`${sc(t.status)}18`,color:sc(t.status)}}>
                  {t.status}
                </span>
              </div>

              {/* Name + category */}
              <div style={{paddingRight:70,marginBottom:10}}>
                <div style={{fontWeight:800,fontSize:12,
                  fontFamily:"'JetBrains Mono',monospace",
                  wordBreak:"break-all",marginBottom:5}}>{t.name}</div>
                <div style={{display:"flex",gap:5,flexWrap:"wrap",alignItems:"center"}}>
                  <span style={{fontSize:10,fontWeight:700,padding:"1px 7px",borderRadius:20,
                    background:`${t.category==="MARKETING"?C.amber:C.teal}18`,
                    color:t.category==="MARKETING"?C.amber:C.teal}}>
                    {t.category||"UTILITY"}
                  </span>
                  <span style={{fontSize:10,color:C.txd}}>{t.language}</span>
                  {t.header&&(
                    <span style={{fontSize:10,fontWeight:700,padding:"1px 7px",borderRadius:20,
                      background:`${C.blue}18`,color:C.blue}}>
                      {String(t.header).replace(/:.+/,"")}
                    </span>
                  )}
                </div>
              </div>

              {/* Body */}
              <div style={{background:C.surf,borderRadius:8,padding:10,marginBottom:8,
                border:`1px solid ${C.border}`,
                maxHeight:expanded===t.id?"none":"72px",overflow:"hidden"}}>
                {t.body ? (
                  <p style={{fontSize:12,color:C.txs,lineHeight:1.6,
                    whiteSpace:"pre-wrap",wordBreak:"break-word",margin:0}}>
                    {t.body}
                  </p>
                ) : (
                  <p style={{fontSize:11,color:C.txd,fontStyle:"italic",margin:0}}>No body text</p>
                )}
              </div>

              {/* Params */}
              {t.params?.length>0&&(
                <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:6}}>
                  {t.params.map((p,i)=>(
                    <span key={i} style={{fontSize:10,padding:"2px 8px",borderRadius:20,
                      fontWeight:700,background:`${C.blue}14`,color:C.blue}}>
                      {`{{${i+1}}}`} {p}
                    </span>
                  ))}
                </div>
              )}

              {/* Buttons */}
              {t.buttons?.length>0&&(
                <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:6}}>
                  {t.buttons.map((b,i)=>(
                    <span key={i} style={{fontSize:10,padding:"2px 8px",borderRadius:20,
                      fontWeight:700,background:`${C.purple}14`,color:C.purple}}>
                      🔗 {b}
                    </span>
                  ))}
                </div>
              )}

              {/* Expand */}
              {t.body?.length>100&&(
                <button onClick={()=>setExpanded(expanded===t.id?null:t.id)}
                  style={{fontSize:11,color:C.txd,background:"none",border:"none",
                    cursor:"pointer",padding:0,marginTop:2}}>
                  {expanded===t.id?"↑ Show less":"↓ Show full body"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
