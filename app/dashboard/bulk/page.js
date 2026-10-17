// rebuilt:1781482518 build:20260615000949
"use client";
import { useState, useRef, useEffect } from "react";
import { Send, Upload, FileText, Image as ImageIcon, Video, Check, X, ArrowLeft, ArrowRight, Radio, Search, Download, Lightbulb, Bot, Rocket, Zap, TriangleAlert, CircleCheck, CircleX, Clock, Info, CalendarClock, Loader2, FileSpreadsheet, CirclePause } from "lucide-react";
import { PageHeader } from "@/components/ui";
import DataTable from "@/components/DataTable";
import InfiniteSentinel from "@/components/InfiniteSentinel";
import { useToast } from "@/components/Feedback";
import { parseCSV, downloadCSV, relTime, normalizePhone } from "@/lib/utils";

function parseBody(s) {
  try { const c=typeof s==="string"?JSON.parse(s):s; if(Array.isArray(c))return c.find(x=>x.type==="BODY")?.text||""; } catch{}return "";
}
function parseParams(s) {
  // Count by the highest {{n}} so repeated variables aren't double-counted
  const nums=[...parseBody(s).matchAll(/\{\{(\d+)\}\}/g)].map(m=>Number(m[1]));
  const max=nums.length?Math.max(...nums):0;
  return Array.from({length:max},(_,i)=>`Param ${i+1}`);
}
function parseHeader(s) {
  try { const c=typeof s==="string"?JSON.parse(s):s; if(Array.isArray(c))return c.find(x=>x.type==="HEADER")?.format||null; }catch{}return null;
}
function parseButtons(s) {
  try { const c=typeof s==="string"?JSON.parse(s):s; if(Array.isArray(c))return c.find(x=>x.type==="BUTTONS")?.buttons?.map(b=>b.text)||[]; }catch{}return [];
}
function normalizeTpl(t) {
  if (t.components) {
    return { id:t.id, name:t.name, status:t.status, category:t.category,
      language:t.language, body:parseBody(t.components),
      params:parseParams(t.components), header:parseHeader(t.components),
      buttons:parseButtons(t.components) };
  }
  return t;
}


const C = {
  g1:"#25d366", g2:"#1aad52", teal:"#00c9d4", blue:"#2979ff",
  amber:"#ffb300", red:"#f44336", purple:"#9c27b0",
  card:"#111827", surf:"#0d1117", border:"#1c2a3f",
  tx:"#e8edf5", txs:"#8899b0", txd:"#445566",
};
const IS = {
  width:"100%", background:C.surf, border:`1px solid ${C.border}`,
  borderRadius:10, padding:"10px 13px", color:C.tx, fontSize:13,
  outline:"none", boxSizing:"border-box", fontFamily:"inherit",
};
const Btn = ({ch,onClick,disabled,variant="primary",sx={},icon:Icon,right:Right}) => (
  <button onClick={onClick} disabled={disabled}
    className={`ui-btn ${variant==="ghost"?"ghost":"primary"}`}
    style={{padding:"10px 18px",fontSize:13,...sx}}>
    {Icon&&<Icon size={15}/>}{ch}{Right&&<Right size={15}/>}
  </button>
);
const hdrIcon = (f,size=16) => f==="IMAGE"?<ImageIcon size={size}/>:f==="DOCUMENT"?<FileText size={size}/>:<Video size={size}/>;
const Label = ({children}) => (
  <label style={{display:"block",fontSize:11,fontWeight:700,color:C.txs,
    textTransform:"uppercase",letterSpacing:".5px",marginBottom:6}}>{children}</label>
);
const IconRow = ({icon:Icon,color,children}) => (
  <span style={{display:"inline-flex",alignItems:"center",gap:6,color}}><Icon size={14}/>{children}</span>
);

const STEPS = ["Template","Upload CSV","Preview & Schedule","Sending"];

export default function BulkSend() {
  const [step,     setStep]     = useState(0);
  const [tplId,    setTplId]    = useState("");
  const [csvRows,  setCsvRows]  = useState([]);
  const [csvErr,   setCsvErr]   = useState("");
  const [campName, setCampName] = useState("");
  const [delay,    setDelay]    = useState(1200);
  const [mediaUrl, setMediaUrl] = useState("");
  const [schedule, setSchedule] = useState(false);
  const [schedDate,setSchedDate]= useState("");
  const [schedTime,setSchedTime]= useState("");
  const [sending,  setSending]  = useState(false);
  const [campId,   setCampId]   = useState(null);
  const [campData, setCampData] = useState(null);
  const toast = useToast();
  const [tplShown, setTplShown] = useState(30);
  const [aiState,  setAiState]  = useState(null);   // from /api/settings/ai
  const [pauseAi,  setPauseAi]  = useState(null);   // null = use default (on for 100+ recipients)
  const fileRef = useRef();

  const [allTemplates, setAllTemplates] = useState([]);
  const [tplLoading,   setTplLoading]   = useState(true);
  const [catFilter,    setCatFilter]    = useState("ALL");
  const [tplSearch,    setTplSearch]    = useState("");
  const [provider,     setProvider]     = useState("flaxxa");

  useEffect(() => {
    setTplLoading(true);
    setTplId("");
    setAllTemplates([]);
    fetch(`/api/templates?provider=${provider}`)
      .then(r=>r.json())
      .then(d=>{
        setAllTemplates(d.templates?.length ? d.templates.map(normalizeTpl) : []);
        setTplLoading(false);
      })
      .catch(()=>{ setAllTemplates([]); setTplLoading(false); });
  }, [provider]);

  const approvedAll = allTemplates.filter(t => t.status === "APPROVED");
  const cats     = ["ALL", ...new Set(approvedAll.map(t=>t.category).filter(Boolean))];
  const catCount = c => c === "ALL" ? approvedAll.length : approvedAll.filter(t=>t.category===c).length;
  const q        = tplSearch.trim().toLowerCase();
  const approved = approvedAll.filter(t =>
    (catFilter === "ALL" || t.category === catFilter) &&
    (!q || t.name?.toLowerCase().includes(q) || t.body?.toLowerCase().includes(q))
  );
  // Look up from the full list so the selection survives search/category changes
  const tpl        = approvedAll.find(t => t.id === tplId);
  const hasHeader  = tpl?.header && ["IMAGE","DOCUMENT","VIDEO"].includes(String(tpl.header));
  const headerFmt  = hasHeader ? String(tpl.header) : null;

  useEffect(() => {
    fetch("/api/settings/ai").then(r=>r.json()).then(d=>{ if(!d.error) setAiState(d); }).catch(()=>{});
  }, [step]);
  const aiWillReply  = !!aiState?.active;
  const pauseAiOn    = aiWillReply && (pauseAi ?? csvRows.length >= 100);

  // WhatsApp rejects WebP image headers (#131053)
  const isWebp = u => /(\.webp(\?|#|$))|([\/,]f_webp[\/,])/i.test(String(u||""));
  const mediaBlocked = hasHeader && headerFmt==="IMAGE" && isWebp(mediaUrl);

  const showToast = (m,t="success") => toast(m,t);
  useEffect(()=>{ setTplShown(30); },[catFilter,tplSearch,provider]);

  const getParams = row => (tpl?.params||[]).map((_,i) => {
    const v = row[`param${i+1}`];
    if (v) return v;
    const extras = Object.keys(row).filter(h=>h!=="phone"&&h!=="name");
    return row[extras[i]] || "";
  });

  const handleFile = e => {
    const file = e.target.files[0]; if (!file) return;
    setCsvErr(""); setCsvRows([]);
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const { headers, rows } = parseCSV(ev.target.result);
        if (!headers.includes("phone")) { setCsvErr('CSV must have a "phone" column'); return; }
        if (!rows.length) { setCsvErr("No data rows found"); return; }
        const validRows = rows.filter(r => r.phone?.trim());
        if (!validRows.length) { setCsvErr("No rows with a phone number found"); return; }

        // ── Template variable checks — WhatsApp rejects any message with a missing/empty variable ──
        const need = tpl?.params?.length || 0;
        if (need > 0) {
          const extraCols = headers.filter(h => h!=="phone" && h!=="name");
          const hasCol = i => headers.includes(`param${i+1}`) || !!extraCols[i];
          const missingCols = Array.from({length:need},(_,i)=>i).filter(i=>!hasCol(i));
          if (missingCols.length) {
            setCsvErr(`Template "${tpl.name}" needs ${need} value${need>1?"s":""} ({{1}}${need>1?`…{{${need}}}`:""}), but your CSV has no column for ${missingCols.map(i=>`{{${i+1}}}`).join(", ")}. Add column${missingCols.length>1?"s":""} ${missingCols.map(i=>`param${i+1}`).join(", ")} — or download the sample CSV for this template.`);
            return;
          }
          const blanks = [];
          validRows.forEach((r, idx) => {
            const vals = getParams(r);
            const empty = vals.map((v,i)=>String(v||"").trim() ? null : `{{${i+1}}}`).filter(Boolean);
            if (empty.length) blanks.push(`row ${idx+2} (${r.phone.trim()}): ${empty.join(", ")}`);
          });
          if (blanks.length) {
            setCsvErr(`${blanks.length} row${blanks.length>1?"s have":" has"} empty template values — WhatsApp will reject ${blanks.length>1?"them":"it"}. Fill these in or remove the rows: ${blanks.slice(0,5).join("; ")}${blanks.length>5?` …and ${blanks.length-5} more`:""}`);
            return;
          }
        }
        // Deduplicate — keep first occurrence of each phone
        const seen = new Set();
        const unique = [];
        let dupeCount = 0;
        for (const r of validRows) {
          const phone = r.phone.trim().replace(/^\+/,"");
          if (seen.has(phone)) { dupeCount++; }
          else { seen.add(phone); unique.push(r); }
        }
        if (dupeCount > 0) {
          // Shown as a toast because the page moves on to the preview step
          showToast(`Removed ${dupeCount} duplicate phone number(s) — ${unique.length} unique contacts`, "warn");
        }
        setCsvRows(unique);
        setStep(2);
      } catch(err) { setCsvErr("Parse error: " + err.message); }
    };
    reader.readAsText(file); e.target.value = "";
  };

  const startBulk = async () => {
    if (mediaBlocked) {
      showToast("WhatsApp doesn't accept WebP images — use a JPG/PNG link","error");
      return;
    }
    if (hasHeader && mediaUrl && mediaUrl.startsWith("data:")) {
      showToast("Please upload the image to Media Library first","error");
      setSending(false); setStep(2); return;
    }

    let scheduledAt = null;
    if (schedule && schedDate && schedTime) {
      const localDt = new Date(`${schedDate}T${schedTime}:00`);
      if (localDt <= new Date(Date.now() + 2*60*1000)) {
        showToast("Schedule time must be at least 2 minutes in the future","error");
        setSending(false); return;
      }
      scheduledAt = localDt.toISOString();
    }

    setSending(true); setStep(3);

    // Everything is inside try so any error returns to the preview step
    // instead of leaving the page stuck on "Saving batches…"
    try {
      const allContacts = csvRows.map(r => ({
        phone:  normalizePhone(r.phone),
        name:   r.name || r.phone,
        params: getParams(r),
      }));

      const campBaseName = campName || `Bulk ${tpl.name} ${new Date().toLocaleDateString()}`;
      const CHUNK  = 2000;
      const chunks = [];
      for (let i = 0; i < allContacts.length; i += CHUNK)
        chunks.push(allContacts.slice(i, i + CHUNK));

      setCampData({ status:"saving", totalContacts:allContacts.length, sent:0, failed:0 });

      const campaignIds = [];

      for (let ci = 0; ci < chunks.length; ci++) {
        const chunk     = chunks[ci];
        const chunkName = chunks.length > 1
          ? `${campBaseName} (Part ${ci+1}/${chunks.length})`
          : campBaseName;

        showToast(`Saving batch ${ci+1}/${chunks.length}…`);

        const r = await fetch("/api/messages/bulk", {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body: JSON.stringify({
            name: chunkName, templateName:tpl.name,
            templateLang:tpl.language||"en", contacts:chunk,
            delay, mediaUrl:mediaUrl?.startsWith("http")?mediaUrl:"",
            headerFormat:headerFmt, scheduledAt, provider,
          }),
        });

        const d = await r.json().catch(()=>({}));
        if (!r.ok) {
          showToast(d.error||`Batch ${ci+1} failed`,"error");
          setSending(false); setStep(2); return;
        }
        campaignIds.push(d.campaignId);
      }

      // Pause AI auto-replies so replies to this campaign don't flood the server.
      // Covers 24h after the send time (scheduled campaigns: 24h after the scheduled time).
      if (pauseAiOn) {
        const startMs = scheduledAt ? new Date(scheduledAt).getTime() : Date.now();
        const hours   = Math.ceil((startMs - Date.now())/3600000) + 24;
        try {
          const pr = await fetch("/api/settings/ai",{method:"POST",headers:{"Content-Type":"application/json"},
            body:JSON.stringify({paused:true,hours,reason:`Bulk campaign: ${campBaseName}`})});
          const pd = await pr.json();
          if (pr.ok) setAiState(pd); else throw new Error(pd.error||"failed");
        } catch(pe) { showToast("Campaign saved, but pausing AI failed: "+pe.message+" — pause it in Settings","error"); }
      }

      // All saved — show status based on type
      const isScheduled = !!scheduledAt;
      const total = allContacts.length;
      const batches = chunks.length;

      setCampData({
        status: isScheduled ? "scheduled" : "queued",
        totalContacts: total, sent:0, failed:0,
      });
      setSending(false);

      if (isScheduled) {
        showToast(`Scheduled ${total.toLocaleString()} contacts in ${batches} batch${batches>1?"es":""}`);
      } else {
        showToast(`${batches} batch${batches>1?"es":""} queued! Server will send ${total.toLocaleString()} messages now.`);
      }

    } catch(e) {
      showToast("Error: " + e.message,"error");
      setSending(false); setStep(2);
    }
  };

  const total = campData?.totalContacts || csvRows.length || 1;
  const done  = (campData?.sent||0) + (campData?.failed||0);
  const pct   = Math.round((done/total)*100);

  // Min datetime for schedule (now + 5 min)
  const minDateTime = new Date(Date.now() + 5*60000).toISOString().slice(0,16);
  const minDate     = minDateTime.slice(0,10);
  const minTime     = minDateTime.slice(11,16);

  return (
    <div className="page-wrap" style={{maxWidth:"min(1180px,100%)"}}>
      <PageHeader icon={Send} title="Bulk Send" subtitle="Send template messages to multiple contacts via CSV"/>

      {/* Step bar */}
      <div className="ui-card" style={{display:"flex",alignItems:"center",padding:"16px 18px",marginBottom:20}}>
        {STEPS.map((s,i)=>(
          <div key={s} style={{display:"flex",alignItems:"center",flex:i<3?1:0}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:28,height:28,borderRadius:"50%",display:"flex",alignItems:"center",flexShrink:0,
                justifyContent:"center",fontSize:12,fontWeight:800,
                background:step>=i?`linear-gradient(135deg,${C.g1},${C.g2})`:C.surf,
                border:step>=i?"none":`1px solid ${C.border}`,
                boxShadow:step===i?`0 0 0 4px ${C.g1}22`:"none",
                color:step>=i?"#04130a":C.txd}}>{step>i?<Check size={15} strokeWidth={3}/>:i+1}</div>
              <span className={step===i?"":"step-lbl"} style={{fontSize:12,fontWeight:700,whiteSpace:"nowrap",
                color:step>=i?C.tx:C.txd}}>{s}</span>
            </div>
            {i<3&&<div style={{flex:1,height:2,margin:"0 10px",minWidth:10,borderRadius:2,
              background:step>i?C.g1:C.border}}/>}
          </div>
        ))}
        <style>{`@media(max-width:640px){.step-lbl{display:none}}`}</style>
      </div>

      {/* STEP 0 — Pick template */}
      {step===0&&(
        <div>
          {/* Provider selector — must be chosen first because templates differ per provider */}
          <div style={{marginBottom:16}}>
            <label style={{display:"block",fontSize:11,fontWeight:700,color:C.txs,
              textTransform:"uppercase",letterSpacing:".5px",marginBottom:8}}>
              <IconRow icon={Radio}>Sending Provider</IconRow>
            </label>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {[
                {id:"flaxxa",  label:"Flaxxa WAPI",  sub:"+91 90631 72108"},
                {id:"gupshup", label:"Gupshup",      sub:"+91 70751 76108"},
              ].map(p=>(
                <div key={p.id} onClick={()=>setProvider(p.id)} style={{
                  flex:"1 1 200px",padding:"12px 14px",borderRadius:12,cursor:"pointer",
                  border:`2px solid ${provider===p.id?C.g1:C.border}`,
                  background:provider===p.id?`${C.g1}08`:C.surf,
                  transition:"all .15s"}}>
                  <div style={{fontWeight:800,fontSize:13,color:provider===p.id?C.g1:C.tx,display:"flex",alignItems:"center",gap:6}}>
                    {provider===p.id&&<Check size={14} strokeWidth={3}/>}{p.label}
                  </div>
                  <div style={{fontSize:11,color:C.txs,marginTop:2}}>{p.sub}</div>
                </div>
              ))}
            </div>
          </div>
          {tplLoading && (
            <div>
              <p style={{fontSize:13,color:C.txs,marginBottom:12,display:"flex",alignItems:"center",gap:8}}>
                <Loader2 size={15} color={C.g1} style={{animation:"spin .8s linear infinite"}}/>
                Loading templates from {provider==="gupshup"?"Gupshup":"Flaxxa"}…
              </p>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {[0,1,2,3].map(i=><div key={i} className="skeleton" style={{height:64,borderRadius:12}}/>)}
              </div>
            </div>
          )}
          {!tplLoading && <>
            <p style={{fontSize:13,color:C.txs,marginBottom:12}}>
              Select an approved template. CSV columns map to {"{{"}<span style={{color:C.blue}}>1</span>{"}}"} {"{{"}<span style={{color:C.blue}}>2</span>{"}}"} parameters.
              <span style={{color:C.txd}}> Tip: double-click a template to continue straight away.</span>
            </p>
            <div style={{position:"relative",marginBottom:10}}>
              <Search size={15} color={C.txd} style={{position:"absolute",left:13,top:"50%",transform:"translateY(-50%)"}}/>
              <input style={{width:"100%",background:C.surf,border:`1px solid ${C.border}`,
                borderRadius:10,padding:"10px 34px 10px 38px",color:C.tx,fontSize:13,outline:"none",
                boxSizing:"border-box"}}
                type="search" name="bulk-tpl-search" autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder="Search by template name or message text…"
                value={tplSearch} onChange={e=>setTplSearch(e.target.value)}/>
              {tplSearch&&(
                <button onClick={()=>setTplSearch("")} title="Clear search" style={{
                  position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",
                  background:"none",border:"none",color:C.txs,cursor:"pointer",padding:4,display:"flex"}}><X size={14}/></button>
              )}
            </div>
            <div style={{display:"flex",gap:4,overflowX:"auto",paddingBottom:4,marginBottom:10}}>
              {cats.map(c=>(
                <button key={c} onClick={()=>setCatFilter(c)} style={{
                  padding:"6px 13px",borderRadius:20,border:`1px solid ${catFilter===c?"transparent":C.border}`,flexShrink:0,
                  background:catFilter===c?`linear-gradient(135deg,${C.g1},${C.g2})`:C.surf,
                  color:catFilter===c?"#04130a":C.txs,
                  fontSize:11,fontWeight:700,cursor:"pointer"}}>
                  {c} <span style={{opacity:.65}}>({catCount(c)})</span>
                </button>
              ))}
            </div>
            <div style={{fontSize:11,color:C.txd,marginBottom:8}}>
              Showing {approved.length} of {approvedAll.length} approved templates
            </div>

            {/* Scrollable list — keeps the page short no matter how many templates exist */}
            <div style={{maxHeight:"min(560px, 55vh)",overflowY:"auto",
              border:`1px solid ${C.border}`,borderRadius:14,padding:8,background:C.surf}}>
              {approved.length===0&&(
                <p style={{textAlign:"center",color:C.txd,padding:24,fontSize:13}}>
                  <FileText size={22} style={{display:"block",margin:"0 auto 8px"}}/>
                  No templates match{tplSearch?` "${tplSearch}"`:""}
                </p>
              )}
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {approved.slice(0,tplShown).map(t=>{
                  const sel = tplId===t.id;
                  return (
                    <div key={t.id} onClick={()=>setTplId(t.id)}
                      onDoubleClick={()=>{setTplId(t.id);setStep(1);}}
                      style={{
                        background:sel?"rgba(37,211,102,.06)":C.card,
                        border:`${sel?2:1}px solid ${sel?C.g1:C.border}`,
                        borderRadius:12,padding:"11px 13px",cursor:"pointer",transition:"all .15s"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap"}}>
                            <span style={{fontWeight:800,fontSize:13,fontFamily:"'JetBrains Mono',monospace",wordBreak:"break-all"}}>{t.name}</span>
                            {t.header&&["IMAGE","DOCUMENT","VIDEO"].includes(String(t.header))&&(
                              <span className="ui-badge blue">
                                {hdrIcon(String(t.header),11)}{t.header==="IMAGE"?"IMAGE":t.header==="DOCUMENT"?"DOC":"VIDEO"}
                              </span>
                            )}
                            {t.params.length>0&&(
                              <span className="ui-badge purple">
                                {t.params.length} var{t.params.length>1?"s":""}
                              </span>
                            )}
                          </div>
                          <p style={{fontSize:12,color:C.txs,lineHeight:1.5,
                            overflow:"hidden",display:"-webkit-box",WebkitLineClamp:sel?4:1,WebkitBoxOrient:"vertical"}}>
                            {t.body}
                          </p>
                          {sel&&(
                            <div style={{display:"flex",justifyContent:"flex-end",marginTop:8}}>
                              <Btn ch="Use this template" right={ArrowRight} onClick={e=>{e.stopPropagation();setStep(1);}}
                                sx={{padding:"7px 14px",fontSize:12}}/>
                            </div>
                          )}
                        </div>
                        <div style={{width:20,height:20,borderRadius:"50%",flexShrink:0,
                          border:`2px solid ${sel?C.g1:C.border}`,
                          background:sel?C.g1:"transparent",
                          display:"flex",alignItems:"center",justifyContent:"center",
                          color:"#04130a"}}>
                          {sel&&<Check size={12} strokeWidth={3.5}/>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <InfiniteSentinel onVisible={()=>setTplShown(n=>n+30)} hasMore={approved.length>tplShown}/>
            </div>
          </>}

          {/* Sticky action bar — Next is always visible, no scrolling needed */}
          <div style={{position:"sticky",bottom:0,zIndex:5,marginTop:14,
            padding:"12px 14px",borderRadius:14,
            background:C.card,border:`1px solid ${tpl?C.g1:C.border}`,
            boxShadow:"0 -8px 24px rgba(0,0,0,.45)",
            display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
            <div style={{minWidth:0,flex:1}}>
              {tpl?(
                <>
                  <div style={{fontSize:10,fontWeight:700,color:C.txs,textTransform:"uppercase",letterSpacing:".5px"}}>Selected template</div>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginTop:2}}>
                    <span style={{fontWeight:800,fontSize:13,color:C.g1,fontFamily:"'JetBrains Mono',monospace",
                      overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{tpl.name}</span>
                    <button onClick={()=>setTplId("")} title="Clear selection" style={{
                      background:"none",border:"none",color:C.txd,cursor:"pointer",padding:2,flexShrink:0,display:"flex"}}><X size={14}/></button>
                  </div>
                </>
              ):(
                <span style={{fontSize:13,color:C.txd}}>Select a template to continue</span>
              )}
            </div>
            <Btn ch="Next: Upload CSV" right={ArrowRight} onClick={()=>tplId&&setStep(1)} disabled={!tplId}/>
          </div>
        </div>
      )}

      {/* STEP 1 — Upload CSV */}
      {step===1&&tpl&&(
        <div>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:18}}>
            <button onClick={()=>setStep(0)} className="ui-btn ghost sm"><ArrowLeft size={14}/> Back</button>
            <div>
              <h2 style={{fontSize:15,fontWeight:800}}>Upload CSV</h2>
              <p style={{fontSize:12,color:C.txs}}>Template: <strong style={{color:C.g1}}>{tpl.name}</strong></p>
            </div>
          </div>

          {/* Image header upload */}
          {hasHeader&&(
            <div className="ui-card" style={{border:`1px solid ${C.blue}55`,
              padding:16,marginBottom:14}}>
              <div style={{fontWeight:700,fontSize:14,marginBottom:4,display:"flex",alignItems:"center",gap:8}}>
                <span style={{color:C.blue,display:"flex"}}>{hdrIcon(headerFmt,18)}</span> {headerFmt} Header Required
              </div>
              <p style={{fontSize:12,color:C.txs,marginBottom:10,lineHeight:1.5}}>
                This template has a <strong style={{color:C.blue}}>{headerFmt}</strong> header.
                Provide a public URL for the {headerFmt.toLowerCase()} to send with every message.
              </p>
              <div style={{marginBottom:8}}>
                <label style={{display:"block",fontSize:11,fontWeight:700,color:C.txs,
                  textTransform:"uppercase",letterSpacing:".5px",marginBottom:6}}>
                  {headerFmt} URL (public HTTPS link)
                </label>
                <input style={IS} value={mediaUrl} onChange={e=>setMediaUrl(e.target.value)}
                  placeholder={
                    headerFmt==="IMAGE"    ? "https://res.cloudinary.com/your-cloud/image/upload/..." :
                    headerFmt==="DOCUMENT" ? "https://example.com/receipt.pdf" :
                    "https://example.com/video.mp4"
                  }/>
              {headerFmt==="IMAGE" && isWebp(mediaUrl) && (
                <div style={{marginTop:8,padding:"8px 12px",borderRadius:8,
                  background:"rgba(244,67,54,.1)",border:"1px solid rgba(244,67,54,.3)",
                  color:"#f44336",fontSize:12,fontWeight:600}}>
                  <X size={13} style={{verticalAlign:"-2px",marginRight:4}}/>WhatsApp doesn't accept WebP images. Use a JPG or PNG link — on Cloudinary just change
                  {" "}<code>.webp</code> to <code>.jpg</code> at the end of the URL.
                </div>
              )}
              {mediaUrl && mediaUrl.startsWith("data:") && (
                <div style={{marginTop:8,padding:"8px 12px",borderRadius:8,
                  background:"rgba(244,67,54,.1)",border:"1px solid rgba(244,67,54,.3)",
                  color:"#f44336",fontSize:12,fontWeight:600}}>
                  <X size={13} style={{verticalAlign:"-2px",marginRight:4}}/>This is a local file (base64). Please upload it to{" "}
                  <a href="/dashboard/media" target="_blank" style={{color:"#f44336"}}>
                    Media Library
                  </a>{" "}
                  first to get a Cloudinary URL.
                </div>
              )}
              </div>
              {headerFmt==="IMAGE"&&mediaUrl&&(
                <div style={{borderRadius:8,overflow:"hidden",border:`1px solid ${C.border}`,
                  display:"inline-block"}}>
                  <img src={mediaUrl} alt="preview"
                    style={{maxHeight:120,maxWidth:300,display:"block",objectFit:"cover"}}
                    onError={e=>e.target.style.display="none"}/>
                </div>
              )}
              <p style={{fontSize:11,color:C.txd,marginTop:8,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                <Lightbulb size={13}/> Upload images to Media Library first to get a Cloudinary URL{" "}
                <a href="/dashboard/media" target="_blank" style={{color:C.teal}}>Media Library</a>
              </p>
            </div>
          )}

          {/* CSV format */}
          <div className="ui-card" style={{padding:16,marginBottom:14}}>
            <p style={{fontSize:11,fontWeight:700,color:C.txs,textTransform:"uppercase",
              letterSpacing:".5px",marginBottom:10}}>Required CSV format</p>
            <div style={{overflowX:"auto",marginBottom:10}}>
              <table className="ui-table" style={{width:"auto",fontSize:12}}>
                <thead><tr>
                  {["phone *","name",...(tpl.params||[]).map((_,i)=>`param${i+1}`)].map(h=>(
                    <th key={h} style={{padding:"6px 12px",textAlign:"left",fontWeight:800,
                      background:"rgba(37,211,102,.1)",color:C.g1,border:`1px solid ${C.border}`}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody><tr>
                  {["918977761187","Mukunda",...(tpl.params||[]).map(p=>p+" value")].map((v,i)=>(
                    <td key={i} style={{padding:"6px 12px",border:`1px solid ${C.border}`,color:C.txs}}>{v}</td>
                  ))}
                </tr></tbody>
              </table>
            </div>
          </div>

          <div style={{marginBottom:14}}>
            <label style={{display:"block",fontSize:11,fontWeight:700,color:C.txs,
              textTransform:"uppercase",letterSpacing:".5px",marginBottom:6}}>Campaign Name</label>
            <input style={IS} placeholder={`Bulk ${tpl.name} ${new Date().toLocaleDateString()}`}
              value={campName} onChange={e=>setCampName(e.target.value)}/>
          </div>

          {/* Provider (locked to the picked template — change it on the Template step) */}
          <div style={{marginBottom:14,padding:"10px 14px",borderRadius:10,
            background:C.card,border:`1px solid ${C.border}`,display:"flex",
            justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:6}}>
            <span style={{fontSize:12,color:C.txs}}><IconRow icon={Radio}>Sending via</IconRow></span>
            <span style={{fontWeight:800,fontSize:13,color:C.g1}}>
              {provider==="gupshup"?"Gupshup · +91 70751 76108":"Flaxxa WAPI · +91 90631 72108"}
            </span>
          </div>

          <div style={{marginBottom:16}}>
            <label style={{display:"block",fontSize:11,fontWeight:700,color:C.txs,
              textTransform:"uppercase",letterSpacing:".5px",marginBottom:6}}>Delay (ms)</label>
            <input style={IS} type="number" min={500} value={delay}
              onChange={e=>setDelay(Number(e.target.value))}/>
            <p style={{fontSize:11,color:C.txd,marginTop:4}}>Keep ≥1000ms to avoid rate limits</p>
          </div>

          <button onClick={()=>downloadCSV(`${tpl.name}_sample.csv`,
            ["phone","name",...(tpl.params||[]).map((_,i)=>`param${i+1}`)],
            [{phone:"918977761187",name:"Mukunda",...Object.fromEntries((tpl.params||[]).map((p,i)=>[`param${i+1}`,p+" value"]))}])}
            className="ui-btn" style={{width:"100%",padding:10,marginBottom:14}}>
            <Download size={15}/> Download Sample CSV
          </button>

          <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile} style={{display:"none"}}/>
          <div onClick={()=>fileRef.current?.click()} style={{
            border:`2px dashed ${C.border}`,borderRadius:14,padding:"36px 20px",
            textAlign:"center",cursor:"pointer",background:C.surf,transition:"border-color .15s"}}
            onDragOver={e=>{e.preventDefault();e.currentTarget.style.borderColor=C.g1;}}
            onDragLeave={e=>e.currentTarget.style.borderColor=C.border}
            onDrop={e=>{e.preventDefault();e.currentTarget.style.borderColor=C.border;
              const f=e.dataTransfer.files[0];if(!f)return;
              const ev={target:{files:[f],value:""}};handleFile(ev);}}>
            <div style={{width:52,height:52,margin:"0 auto 10px",borderRadius:14,display:"flex",alignItems:"center",
              justifyContent:"center",background:`${C.g1}14`,color:C.g1}}><Upload size={24}/></div>
            <div style={{fontWeight:700,fontSize:14}}>Tap to upload CSV or drag & drop</div>
            <div style={{fontSize:12,color:C.txs,marginTop:4}}>Supports .csv and .txt</div>
          </div>
          {csvErr&&<p style={{color:C.red,fontSize:13,fontWeight:600,marginTop:10,display:"flex",gap:7,alignItems:"flex-start",
            padding:"10px 14px",borderRadius:10,background:"rgba(244,67,54,.08)",border:"1px solid rgba(244,67,54,.3)"}}><CircleX size={16} style={{flexShrink:0,marginTop:1}}/><span>{csvErr}</span></p>}
        </div>
      )}

      {/* STEP 2 — Preview & Schedule */}
      {step===2&&tpl&&(
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8}}>
            <div>
              <h2 style={{fontSize:15,fontWeight:800}}>Preview & Schedule</h2>
              <p style={{fontSize:12,color:C.txs}}>{csvRows.length} recipients · <strong style={{color:C.g1}}>{tpl.name}</strong></p>
            </div>
            <button onClick={()=>{setCsvRows([]);setStep(1);}} className="ui-btn sm"><ArrowLeft size={14}/> Re-upload</button>
          </div>

          {/* Image header preview */}
          {hasHeader&&mediaUrl&&(
            <div className="ui-card" style={{
              padding:14,marginBottom:14,display:"flex",alignItems:"center",gap:12}}>
              {headerFmt==="IMAGE"?(
                <img src={mediaUrl} alt="header" style={{width:60,height:60,borderRadius:8,objectFit:"cover"}}
                  onError={e=>e.target.style.display="none"}/>
              ):(
                <div style={{width:60,height:60,borderRadius:8,background:C.surf,
                  display:"flex",alignItems:"center",justifyContent:"center",color:C.blue}}>
                  {hdrIcon(headerFmt,26)}
                </div>
              )}
              <div>
                <div style={{fontWeight:700,fontSize:13}}>{headerFmt} Header</div>
                <div style={{fontSize:11,color:C.txs,wordBreak:"break-all"}}>{mediaUrl.slice(0,50)}…</div>
              </div>
            </div>
          )}

          {/* Schedule toggle */}
          <div className="ui-card" style={{
            padding:16,marginBottom:14}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:schedule?14:0,gap:8,flexWrap:"wrap"}}>
              <div>
                <div style={{fontWeight:700,fontSize:14,display:"flex",alignItems:"center",gap:8}}><CalendarClock size={16} color={C.g1}/> Schedule Send</div>
                <div style={{fontSize:12,color:C.txs,marginTop:2}}>Send at a specific date & time</div>
              </div>
              <button onClick={()=>setSchedule(s=>!s)} style={{
                display:"inline-flex",alignItems:"center",gap:6,padding:"6px 16px",borderRadius:20,border:`1px solid ${schedule?C.g1:C.border}`,
                background:schedule?`${C.g1}18`:"transparent",
                color:schedule?C.g1:C.txs,fontSize:12,fontWeight:700,cursor:"pointer"}}>
                {schedule?<><Check size={13} strokeWidth={3}/> Scheduled</>:"Send Now"}
              </button>
            </div>
            {schedule&&(
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div>
                  <label style={{display:"block",fontSize:11,fontWeight:700,color:C.txs,
                    textTransform:"uppercase",letterSpacing:".5px",marginBottom:6}}>Date</label>
                  <input style={IS} type="date" min={minDate}
                    value={schedDate} onChange={e=>setSchedDate(e.target.value)}/>
                </div>
                <div>
                  <label style={{display:"block",fontSize:11,fontWeight:700,color:C.txs,
                    textTransform:"uppercase",letterSpacing:".5px",marginBottom:6}}>Time (IST)</label>
                  <input style={IS} type="time"
                    min={schedDate===minDate?minTime:undefined}
                    value={schedTime} onChange={e=>setSchedTime(e.target.value)}/>
                </div>
                {schedDate&&schedTime&&(
                  <div style={{gridColumn:"span 2",padding:"10px 14px",borderRadius:8,
                    background:`${C.g1}08`,border:`1px solid ${C.g1}20`,
                    fontSize:13,color:C.g1,fontWeight:600,display:"flex",gap:7,alignItems:"center"}}>
                    <CircleCheck size={15} style={{flexShrink:0}}/><span>Will send on {new Date(`${schedDate}T${schedTime}`).toLocaleString("en-IN",
                      {dateStyle:"full",timeStyle:"short"})}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* AI auto-reply load protection */}
          {aiState && (
            <div className="ui-card" style={{border:`1px solid ${aiWillReply?C.amber+"55":C.border}`,
              padding:"12px 16px",marginBottom:14}}>
              {aiWillReply ? (
                <label style={{display:"flex",gap:10,alignItems:"flex-start",cursor:"pointer"}}>
                  <input type="checkbox" checked={pauseAiOn} onChange={e=>setPauseAi(e.target.checked)}
                    style={{marginTop:3,accentColor:C.g1,width:16,height:16}}/>
                  <div>
                    <div style={{fontWeight:700,fontSize:13,display:"flex",alignItems:"center",gap:7}}><CirclePause size={15} color={C.amber}/> Pause AI auto-replies for 24 hours after sending</div>
                    <div style={{fontSize:12,color:C.txs,marginTop:2,lineHeight:1.5}}>
                      AI replies are currently <strong style={{color:C.g1}}>ON</strong>. Every reply to this campaign would trigger an AI call —
                      with {csvRows.length.toLocaleString()} recipients that can overload the server. Replies still land in the Inbox for staff.
                      Resume any time in Settings.
                    </div>
                  </div>
                </label>
              ) : (
                <div style={{fontSize:12,color:C.txs,display:"flex",gap:8,alignItems:"flex-start"}}>
                  <Bot size={15} color={C.amber} style={{flexShrink:0,marginTop:1}}/><span>AI auto-replies are <strong style={{color:C.amber}}>{aiState.envEnabled?"PAUSED":"OFF"}</strong>
                  {aiState.paused&&aiState.pausedUntil?` until ${new Date(aiState.pausedUntil).toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short"})}`:""}
                  {" "}— replies to this campaign will go to the Inbox only.</span>
                </div>
              )}
            </div>
          )}

          {/* Warning */}
          <div style={{padding:"10px 14px",borderRadius:10,marginBottom:16,fontSize:13,
            background:"rgba(255,179,0,.06)",border:"1px solid rgba(255,179,0,.3)",color:C.amber,
            display:"flex",gap:8,alignItems:"flex-start"}}>
            <TriangleAlert size={16} style={{flexShrink:0,marginTop:1}}/>
            <span>This will send <strong>{csvRows.length} WhatsApp messages</strong>.
            ~{Math.ceil(csvRows.length*delay/60000)} min at {delay}ms delay.</span>
          </div>

          {/* Recipients preview */}
          <div className="ui-card" style={{
            overflow:"hidden",marginBottom:18}}>
            <div style={{padding:"10px 16px",borderBottom:`1px solid ${C.border}`,
              fontWeight:700,fontSize:13,display:"flex",justifyContent:"space-between"}}>
              <span>Recipients Preview</span>
              <span style={{color:C.txs,fontWeight:400}}>{csvRows.length} rows</span>
            </div>
            <DataTable dense clientPage={50} maxHeight={340} rows={csvRows} rowKey={(r,i)=>i}
              footer={`${csvRows.length.toLocaleString("en-IN")} recipients`}
              columns={[
                {key:"name",label:"Recipient",primary:true,render:r=><span style={{fontWeight:700,display:"block",maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.name||r.phone}</span>},
                {key:"phone",label:"Phone",mono:true},
                {key:"msg",label:"Message preview",render:row=>{
                  let preview=tpl.body;
                  getParams(row).forEach((v,idx)=>{preview=preview.replace(new RegExp(`\\{\\{${idx+1}\\}\\}`,"g"),v||`{{${idx+1}}}`);});
                  return <span style={{fontSize:11.5,color:C.txs,lineHeight:1.5,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",maxWidth:520,wordBreak:"break-word"}}>{preview}</span>;}},
              ]}/>
          </div>

          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            <Btn ch="Back" icon={ArrowLeft} variant="ghost" onClick={()=>{setCsvRows([]);setStep(1);}}/>
            <Btn
              icon={schedule&&schedDate&&schedTime?CalendarClock:Rocket}
              ch={schedule&&schedDate&&schedTime
                ? `Schedule for ${schedDate} ${schedTime}`
                : `Send to ${csvRows.length} Contacts Now`}
              onClick={startBulk}
              disabled={hasHeader&&!mediaUrl||mediaBlocked||(schedule&&(!schedDate||!schedTime))}
              sx={{flex:"1 1 200px",justifyContent:"center"}}/>
          </div>
          {hasHeader&&!mediaUrl&&(
            <p style={{fontSize:12,color:C.red,marginTop:8,textAlign:"center"}}>
              <TriangleAlert size={13} style={{verticalAlign:"-2px",marginRight:4}}/>This template requires a {headerFmt} URL — add it in Step 2
            </p>
          )}
        </div>
      )}

      {/* STEP 3 — Sending / Results */}
      {step===3&&(
        <div>
          <h2 style={{fontSize:16,fontWeight:800,marginBottom:16,display:"flex",alignItems:"center",gap:8}}>
            {campData?.status==="scheduled" ? <><CalendarClock size={18} color={C.g1}/> Campaign Scheduled!</>
             : campData?.status==="queued"  ? <><CircleCheck size={18} color={C.g1}/> Campaign Queued!</>
             : campData?.status==="done"    ? <><CircleCheck size={18} color={C.g1}/> Campaign Complete!</>
             : sending ? <><Loader2 size={18} color={C.g1} style={{animation:"spin .8s linear infinite"}}/> Saving batches…</>
             : <><CircleCheck size={18} color={C.g1}/> Done!</>}
          </h2>
          {sending && campData?.totalContacts > 100 && (
            <div style={{padding:"10px 14px",borderRadius:9,marginBottom:14,fontSize:13,
              background:"rgba(41,121,255,.08)",border:"1px solid rgba(41,121,255,.25)",
              color:"#2979ff",lineHeight:1.6,display:"flex",gap:8,alignItems:"flex-start"}}>
              <Info size={16} style={{flexShrink:0,marginTop:2}}/><span>This is a large campaign ({campData?.totalContacts?.toLocaleString()} messages).
              It's running in the background on the server — you can safely close this page
              and check progress in <strong>Campaigns</strong>.
              Estimated time: ~{Math.ceil((campData?.totalContacts||0)*1.2/3600)} hours.</span>
            </div>
          )}

          {campData?.status==="queued"&&(
            <div className="ui-card" style={{border:`1px solid ${C.g1}`,
              padding:24,marginBottom:16,textAlign:"center"}}>
              <div style={{width:52,height:52,margin:"0 auto 10px",borderRadius:14,display:"flex",alignItems:"center",
                justifyContent:"center",background:`${C.g1}14`,color:C.g1}}><Zap size={26}/></div>
              <div style={{fontWeight:800,fontSize:16,color:C.g1,marginBottom:6}}>Sending Now!</div>
              <div style={{fontSize:13,color:C.txs,lineHeight:1.6}}>
                <strong style={{color:C.tx}}>{campData?.totalContacts?.toLocaleString()} messages</strong> are queued.<br/>
                The server is sending them in the background.<br/>
                <a href="/dashboard/campaigns" style={{color:C.g1,fontWeight:700}}>
                  View progress in Campaigns <ArrowRight size={13} style={{verticalAlign:"-2px"}}/>
                </a>
              </div>
            </div>
          )}
          {campData?.status==="scheduled"&&(
            <div className="ui-card" style={{border:`1px solid ${C.g1}`,padding:24,marginBottom:16,textAlign:"center"}}>
              <div style={{width:52,height:52,margin:"0 auto 10px",borderRadius:14,display:"flex",alignItems:"center",
                justifyContent:"center",background:`${C.g1}14`,color:C.g1}}><CalendarClock size={26}/></div>
              <div style={{fontWeight:800,fontSize:16,color:C.g1,marginBottom:6}}>Campaign Scheduled!</div>
              <div style={{fontSize:13,color:C.txs}}>
                Will automatically send to <strong style={{color:C.tx}}>{csvRows.length} contacts</strong> at<br/>
                <strong style={{color:C.tx,fontSize:15}}>{schedDate} {schedTime}</strong>
              </div>
              <div style={{fontSize:12,color:C.txd,marginTop:10}}>
                View progress in <a href="/dashboard/campaigns" style={{color:C.g1}}>Campaigns <ArrowRight size={12} style={{verticalAlign:"-2px"}}/></a>
              </div>
            </div>
          )}

          {campData?.status!=="scheduled"&&(
            <>
              <div className="ui-card" style={{padding:20,marginBottom:16}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                  <span style={{fontWeight:700}}>{done} / {total} processed</span>
                  <span style={{fontWeight:800,fontSize:20,color:C.g1}}>{pct}%</span>
                </div>
                <div style={{height:10,borderRadius:5,overflow:"hidden",background:C.surf,marginBottom:12}}>
                  <div style={{height:"100%",width:`${pct}%`,borderRadius:5,
                    background:`linear-gradient(90deg,${C.g1},${C.teal})`,transition:"width .4s"}}/>
                </div>
                <div style={{display:"flex",gap:20,fontSize:13,flexWrap:"wrap"}}>
                  <span style={{fontWeight:700,color:C.g1,display:"inline-flex",alignItems:"center",gap:5}}><Check size={14} strokeWidth={3}/> {campData?.sent||0} sent</span>
                  <span style={{fontWeight:700,color:C.red,display:"inline-flex",alignItems:"center",gap:5}}><X size={14} strokeWidth={3}/> {campData?.failed||0} failed</span>
                </div>
              </div>

              {campData?.results&&(
                <div className="ui-card" style={{overflow:"hidden",marginBottom:16}}>
                  <div style={{padding:"10px 16px",borderBottom:`1px solid ${C.border}`,fontWeight:700,fontSize:13,
                    display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span>Results</span>
                    {!sending&&(
                      <button onClick={()=>downloadCSV(`results_${tpl?.name}.csv`,
                        ["phone","name","status","wamid","error"],
                        campData.results.map(r=>({phone:r.phone,name:r.name||"",
                          status:r.status,wamid:r.wamid||"",error:r.error||""})))}
                        className="ui-btn sm">
                        <Download size={13}/> Export CSV
                      </button>
                    )}
                  </div>
                  <DataTable dense clientPage={50} maxHeight={360}
                    rows={campData.results.filter(r=>r.status!=="pending")} rowKey={(r,i)=>i}
                    footer={`${campData.results.filter(r=>r.status!=="pending").length.toLocaleString("en-IN")} results`}
                    columns={[
                      {key:"name",label:"Contact",primary:true,render:r=><span style={{fontWeight:600,display:"block",maxWidth:220,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.name||r.phone}</span>},
                      {key:"phone",label:"Phone",mono:true},
                      {key:"status",label:"Status",render:r=>(
                        <span style={{fontSize:12,fontWeight:700,color:r.status==="failed"?C.red:C.g1,display:"inline-flex",alignItems:"center",gap:5,wordBreak:"break-word"}}>
                          {r.status==="failed"?<><X size={13}/>{r.error}</>:<><Check size={13} strokeWidth={3}/> Sent</>}
                        </span>)},
                    ]}/>
                </div>
              )}
            </>
          )}

          {!sending&&(
            <button onClick={()=>{setStep(0);setTplId("");setCsvRows([]);setCampData(null);setMediaUrl("");setSchedule(false);setSchedDate("");setSchedTime("");}}
              className="ui-btn ghost" style={{width:"100%",padding:10}}>
              <ArrowLeft size={15}/> Start New Campaign
            </button>
          )}
        </div>
      )}

    </div>
  );
}
