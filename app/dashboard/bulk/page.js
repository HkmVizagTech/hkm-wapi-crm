// rebuilt:1781482518 build:20260615000949
"use client";
import { useState, useRef, useEffect } from "react";
import { parseCSV, downloadCSV, relTime } from "@/lib/utils";

function parseBody(s) {
  try { const c=typeof s==="string"?JSON.parse(s):s; if(Array.isArray(c))return c.find(x=>x.type==="BODY")?.text||""; } catch{}return "";
}
function parseParams(s) {
  const b=parseBody(s); return [...b.matchAll(/\{\{(\d+)\}\}/g)].map(m=>`Param ${m[1]}`);
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
const Btn = ({ch,onClick,disabled,variant="primary",sx={}}) => {
  const bg = variant==="primary" ? `linear-gradient(135deg,${C.g1},${C.g2})`
           : variant==="teal"    ? `linear-gradient(135deg,${C.teal},#0097a7)`
           : "transparent";
  const col  = variant==="ghost" ? C.txs : "#000";
  const bdr  = variant==="ghost" ? `1px solid ${C.border}` : "none";
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding:"10px 20px", borderRadius:9, border:bdr, fontWeight:700, fontSize:13,
      background:bg, color:col, cursor:disabled?"not-allowed":"pointer",
      opacity:disabled?.4:1, display:"inline-flex", alignItems:"center", gap:6, ...sx}}>
      {ch}
    </button>
  );
};

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
  const [toast,    setToast]    = useState(null);
  const fileRef = useRef();

  const [allTemplates, setAllTemplates] = useState([]);
  const [tplLoading,   setTplLoading]   = useState(true);
  const [catFilter,    setCatFilter]    = useState("ALL");
  const [tplSearch,    setTplSearch]    = useState("");

  useEffect(() => {
    fetch("/api/templates")
      .then(r=>r.json())
      .then(d=>{
        if(d.templates?.length) setAllTemplates(d.templates.map(normalizeTpl));
        setTplLoading(false);
      })
      .catch(()=>setTplLoading(false));
  }, []);

  const cats     = ["ALL", ...new Set(allTemplates.filter(t=>t.status==="APPROVED").map(t=>t.category).filter(Boolean))];
  const approved = allTemplates.filter(t =>
    t.status === "APPROVED" &&
    (catFilter === "ALL" || t.category === catFilter) &&
    (!tplSearch || t.name?.toLowerCase().includes(tplSearch.toLowerCase()))
  );
  const tpl        = approved.find(t => t.id === tplId);
  const hasHeader  = tpl?.header && ["IMAGE","DOCUMENT","VIDEO"].includes(String(tpl.header));
  const headerFmt  = hasHeader ? String(tpl.header) : null;

  const showToast = (m,t="success") => { setToast({m,t}); setTimeout(()=>setToast(null),4000); };

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
          setCsvErr(`Found ${dupeCount} duplicate phone number(s) — removed automatically. ${unique.length} unique contacts will be sent.`);
        }
        setCsvRows(unique);
        setStep(2);
      } catch(err) { setCsvErr("Parse error: " + err.message); }
    };
    reader.readAsText(file); e.target.value = "";
  };

  const startBulk = async () => {
    if (hasHeader && mediaUrl && mediaUrl.startsWith("data:")) {
      showToast("Please upload the image to Media Library first","error");
      setSending(false); setStep(2); return;
    }

    // Build scheduledAt
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

    // Normalize all contacts
    const allContacts = csvRows.map(r => ({
      phone:  normalizePhone(r.phone),
      name:   r.name || r.phone,
      params: getParams(r),
    }));

    const campBaseName = campName || `Bulk ${tpl.name} ${new Date().toLocaleDateString()}`;

    // Split into chunks of 5000
    const CHUNK   = 2000;
    const chunks  = [];
    for (let i = 0; i < allContacts.length; i += CHUNK) {
      chunks.push(allContacts.slice(i, i + CHUNK));
    }

    try {
      const campaignIds = [];

      for (let ci = 0; ci < chunks.length; ci++) {
        const chunk     = chunks[ci];
        const chunkName = chunks.length > 1
          ? `${campBaseName} (Part ${ci+1}/${chunks.length})`
          : campBaseName;

        const r = await fetch("/api/messages/bulk", {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body: JSON.stringify({
            name:         chunkName,
            templateName: tpl.name,
            templateLang: tpl.language || "en",
            contacts:     chunk,
            delay,
            mediaUrl:     mediaUrl?.startsWith("http") ? mediaUrl : "",
            headerFormat: headerFmt,
            scheduledAt,  // ALL chunks get same scheduledAt
          }),
        });

        const d = await r.json().catch(()=>({}));

        if (!r.ok) {
          showToast(d.error || `Part ${ci+1} failed: ${r.status}`,"error");
          setSending(false); setStep(2); return;
        }

        campaignIds.push(d.campaignId);
        setCampId(d.campaignId);

        // If scheduled — all chunks saved, done
        if (d.status === "scheduled") {
          if (ci === chunks.length - 1) {
            setCampData({
              status:"scheduled",
              totalContacts: allContacts.length,
              sent:0, failed:0, results:[],
            });
            setSending(false);
            showToast(
              chunks.length > 1
                ? `Scheduled ${chunks.length} batches (${allContacts.length.toLocaleString()} contacts) for ${schedDate} ${schedTime}`
                : `Scheduled! ${allContacts.length.toLocaleString()} contacts for ${schedDate} ${schedTime}`
            );
          }
          continue; // move to next chunk
        }
      }

      // If scheduled — we're done
      if (scheduledAt) return;

      // Running — poll last campaign
      const lastId = campaignIds[campaignIds.length - 1];
      if (!lastId) { setSending(false); return; }

      if (allContacts.length > 100) {
        showToast(`Campaign started! ${allContacts.length.toLocaleString()} messages sending in background`);
      }

      setCampData({
        status:"running",
        totalContacts: allContacts.length,
        sent:0, failed:0, results:[],
      });

      const poll = setInterval(async () => {
        try {
          const pr = await fetch(`/api/campaigns/${lastId}`);
          const pd = await pr.json();
          if (pd.campaign) {
            setCampData(pd.campaign);
            if (pd.campaign.status==="done"||pd.campaign.status==="stopped") {
              clearInterval(poll);
              setSending(false);
              showToast(
                `Done! ${pd.campaign.sent} sent, ${pd.campaign.failed} failed`,
                pd.campaign.failed > 0 ? "warning" : "success"
              );
            }
          }
        } catch {}
      }, 3000);

    } catch(e) {
      showToast("Error: " + e.message, "error");
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
    <div style={{padding:24, maxWidth:900, margin:"0 auto"}}>
      <div style={{marginBottom:24}}>
        <h1 style={{fontSize:20,fontWeight:800}}>📤 Bulk Send</h1>
        <p style={{fontSize:13,color:C.txs,marginTop:2}}>Send template messages to multiple contacts via CSV</p>
      </div>

      {/* Step bar */}
      <div style={{display:"flex",alignItems:"center",marginBottom:28}}>
        {STEPS.map((s,i)=>(
          <div key={s} style={{display:"flex",alignItems:"center",flex:i<3?1:0}}>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
              <div style={{width:28,height:28,borderRadius:"50%",display:"flex",alignItems:"center",
                justifyContent:"center",fontSize:12,fontWeight:800,
                background:step>i?C.g1:step===i?C.g1:C.border,
                color:step>=i?"#000":C.txd}}>{step>i?"✓":i+1}</div>
              <span style={{fontSize:10,fontWeight:700,whiteSpace:"nowrap",
                color:step>=i?C.g1:C.txd}}>{s}</span>
            </div>
            {i<3&&<div style={{flex:1,height:2,margin:"0 6px",marginBottom:16,
              background:step>i?C.g1:C.border}}/>}
          </div>
        ))}
      </div>

      {/* STEP 0 — Pick template */}
      {step===0&&(
        <div>
          {tplLoading && (
        <div style={{textAlign:"center",padding:40,color:C.txd}}>
          <div style={{width:28,height:28,margin:"0 auto 10px",border:`3px solid ${C.border}`,
            borderTopColor:C.g1,borderRadius:"50%",animation:"spin .7s linear infinite"}}/>
          <p style={{fontSize:13}}>Loading templates from Flaxxa…</p>
        </div>
      )}
      {!tplLoading && <>
        <p style={{fontSize:13,color:C.txs,marginBottom:12}}>
          Select an approved template. CSV columns map to {"{{"}<span style={{color:C.blue}}>1</span>{"}}"} {"{{"}<span style={{color:C.blue}}>2</span>{"}}"} parameters.
        </p>
        <input style={{width:"100%",background:C.surf,border:`1px solid ${C.border}`,
          borderRadius:10,padding:"9px 13px",color:C.tx,fontSize:13,outline:"none",
          boxSizing:"border-box",marginBottom:10}}
          placeholder="🔍 Search templates…"
          value={tplSearch} onChange={e=>setTplSearch(e.target.value)}/>
        <div style={{display:"flex",gap:4,overflowX:"auto",paddingBottom:4,marginBottom:14}}>
          {cats.map(c=>(
            <button key={c} onClick={()=>setCatFilter(c)} style={{
              padding:"5px 12px",borderRadius:20,border:"none",flexShrink:0,
              background:catFilter===c?C.g1:C.surf,
              color:catFilter===c?"#000":C.txs,
              fontSize:11,fontWeight:700,cursor:"pointer"}}>
              {c}
            </button>
          ))}
        </div>
        {approved.length===0&&(
          <p style={{textAlign:"center",color:C.txd,padding:20,fontSize:13}}>
            No templates match
          </p>
        )}
      </>}
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {approved.map(t=>(
              <div key={t.id} onClick={()=>setTplId(t.id)} style={{
                background:tplId===t.id?"rgba(37,211,102,.06)":C.card,
                border:`${tplId===t.id?2:1}px solid ${tplId===t.id?C.g1:C.border}`,
                borderRadius:12,padding:16,cursor:"pointer",transition:"all .15s"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div style={{flex:1,paddingRight:8}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
                      <span style={{fontWeight:800,fontSize:13,fontFamily:"'JetBrains Mono',monospace",wordBreak:"break-all"}}>{t.name}</span>
                      {t.header&&["IMAGE","DOCUMENT","VIDEO"].includes(String(t.header))&&(
                        <span style={{fontSize:10,fontWeight:700,padding:"1px 7px",borderRadius:20,
                          background:`${C.blue}18`,color:C.blue,flexShrink:0}}>
                          {t.header==="IMAGE"?"🖼 IMAGE":t.header==="DOCUMENT"?"📄 DOC":"🎥 VIDEO"}
                        </span>
                      )}
                    </div>
                    <p style={{fontSize:12,color:C.txs,lineHeight:1.5,marginBottom:6,
                      overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>
                      {t.body}
                    </p>
                    {t.params.length>0&&(
                      <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                        {t.params.map((p,i)=>(
                          <span key={i} style={{fontSize:10,padding:"1px 8px",borderRadius:20,fontWeight:700,
                            background:`${C.blue}14`,color:C.blue}}>{`{{${i+1}}}`} {p}</span>
                        ))}
                      </div>
                    )}
                    {t.params.length===0&&<p style={{fontSize:11,color:C.txd}}>No variables — same message for all</p>}
                  </div>
                  <div style={{width:20,height:20,borderRadius:"50%",flexShrink:0,
                    border:`2px solid ${tplId===t.id?C.g1:C.border}`,
                    background:tplId===t.id?C.g1:"transparent",
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:11,color:"#000",fontWeight:800}}>
                    {tplId===t.id?"✓":""}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{marginTop:20,display:"flex",justifyContent:"flex-end"}}>
            <Btn ch="Next: Upload CSV →" onClick={()=>tplId&&setStep(1)} disabled={!tplId}/>
          </div>
        </div>
      )}

      {/* STEP 1 — Upload CSV */}
      {step===1&&tpl&&(
        <div>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:18}}>
            <button onClick={()=>setStep(0)} style={{background:"none",border:"none",
              color:C.txs,fontSize:14,cursor:"pointer"}}>← Back</button>
            <div>
              <h2 style={{fontSize:15,fontWeight:800}}>Upload CSV</h2>
              <p style={{fontSize:12,color:C.txs}}>Template: <strong style={{color:C.g1}}>{tpl.name}</strong></p>
            </div>
          </div>

          {/* Image header upload */}
          {hasHeader&&(
            <div style={{background:C.card,border:`2px solid ${C.blue}40`,borderRadius:12,
              padding:16,marginBottom:14}}>
              <div style={{fontWeight:700,fontSize:14,marginBottom:4,display:"flex",alignItems:"center",gap:8}}>
                {headerFmt==="IMAGE"?"🖼":headerFmt==="DOCUMENT"?"📄":"🎥"} {headerFmt} Header Required
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
              {mediaUrl && mediaUrl.startsWith("data:") && (
                <div style={{marginTop:8,padding:"8px 12px",borderRadius:8,
                  background:"rgba(244,67,54,.1)",border:"1px solid rgba(244,67,54,.3)",
                  color:"#f44336",fontSize:12,fontWeight:600}}>
                  ✕ This is a local file (base64). Please upload it to{" "}
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
              <p style={{fontSize:11,color:C.txd,marginTop:8}}>
                💡 Upload images to Media Library first to get a Cloudinary URL →{" "}
                <a href="/dashboard/media" target="_blank" style={{color:C.teal}}>Media Library</a>
              </p>
            </div>
          )}

          {/* CSV format */}
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:16,marginBottom:14}}>
            <p style={{fontSize:11,fontWeight:700,color:C.txs,textTransform:"uppercase",
              letterSpacing:".5px",marginBottom:10}}>Required CSV format</p>
            <div style={{overflowX:"auto",marginBottom:10}}>
              <table style={{borderCollapse:"collapse",fontSize:12}}>
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
            style={{width:"100%",padding:10,borderRadius:9,border:"none",marginBottom:14,
              background:`linear-gradient(135deg,${C.teal},#0097a7)`,
              color:"#000",fontWeight:700,fontSize:13,cursor:"pointer"}}>
            ⬇ Download Sample CSV
          </button>

          <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile} style={{display:"none"}}/>
          <div onClick={()=>fileRef.current?.click()} style={{
            border:`2px dashed ${C.border}`,borderRadius:12,padding:"32px 20px",
            textAlign:"center",cursor:"pointer"}}
            onDragOver={e=>{e.preventDefault();e.currentTarget.style.borderColor=C.g1;}}
            onDragLeave={e=>e.currentTarget.style.borderColor=C.border}
            onDrop={e=>{e.preventDefault();e.currentTarget.style.borderColor=C.border;
              const f=e.dataTransfer.files[0];if(!f)return;
              const ev={target:{files:[f],value:""}};handleFile(ev);}}>
            <div style={{fontSize:38,marginBottom:8}}>📁</div>
            <div style={{fontWeight:700,fontSize:14}}>Tap to upload CSV or drag & drop</div>
            <div style={{fontSize:12,color:C.txs,marginTop:4}}>Supports .csv and .txt</div>
          </div>
          {csvErr&&<p style={{color:C.red,fontSize:13,fontWeight:600,marginTop:10}}>✕ {csvErr}</p>}
        </div>
      )}

      {/* STEP 2 — Preview & Schedule */}
      {step===2&&tpl&&(
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div>
              <h2 style={{fontSize:15,fontWeight:800}}>Preview & Schedule</h2>
              <p style={{fontSize:12,color:C.txs}}>{csvRows.length} recipients · <strong style={{color:C.g1}}>{tpl.name}</strong></p>
            </div>
            <button onClick={()=>{setCsvRows([]);setStep(1);}} style={{
              background:"none",border:`1px solid ${C.border}`,borderRadius:8,
              color:C.txs,fontSize:13,padding:"6px 12px",cursor:"pointer"}}>← Re-upload</button>
          </div>

          {/* Image header preview */}
          {hasHeader&&mediaUrl&&(
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,
              padding:14,marginBottom:14,display:"flex",alignItems:"center",gap:12}}>
              {headerFmt==="IMAGE"?(
                <img src={mediaUrl} alt="header" style={{width:60,height:60,borderRadius:8,objectFit:"cover"}}
                  onError={e=>e.target.style.display="none"}/>
              ):(
                <div style={{width:60,height:60,borderRadius:8,background:C.surf,
                  display:"flex",alignItems:"center",justifyContent:"center",fontSize:28}}>
                  {headerFmt==="DOCUMENT"?"📄":"🎥"}
                </div>
              )}
              <div>
                <div style={{fontWeight:700,fontSize:13}}>{headerFmt} Header</div>
                <div style={{fontSize:11,color:C.txs,wordBreak:"break-all"}}>{mediaUrl.slice(0,50)}…</div>
              </div>
            </div>
          )}

          {/* Schedule toggle */}
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,
            padding:16,marginBottom:14}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:schedule?14:0}}>
              <div>
                <div style={{fontWeight:700,fontSize:14}}>⏰ Schedule Send</div>
                <div style={{fontSize:12,color:C.txs,marginTop:2}}>Send at a specific date & time</div>
              </div>
              <button onClick={()=>setSchedule(s=>!s)} style={{
                padding:"6px 16px",borderRadius:20,border:`1px solid ${schedule?C.g1:C.border}`,
                background:schedule?`${C.g1}18`:"transparent",
                color:schedule?C.g1:C.txs,fontSize:12,fontWeight:700,cursor:"pointer"}}>
                {schedule?"✓ Scheduled":"Send Now"}
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
                    fontSize:13,color:C.g1,fontWeight:600}}>
                    ✓ Will send on {new Date(`${schedDate}T${schedTime}`).toLocaleString("en-IN",
                      {dateStyle:"full",timeStyle:"short"})}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Warning */}
          <div style={{padding:"10px 14px",borderRadius:10,marginBottom:16,fontSize:13,
            background:"rgba(255,179,0,.06)",border:"1px solid rgba(255,179,0,.3)",color:C.amber}}>
            ⚠ This will send <strong>{csvRows.length} WhatsApp messages</strong>.
            ~{Math.ceil(csvRows.length*delay/60000)} min at {delay}ms delay.
          </div>

          {/* Recipients preview */}
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,
            overflow:"hidden",marginBottom:18}}>
            <div style={{padding:"10px 16px",borderBottom:`1px solid ${C.border}`,
              fontWeight:700,fontSize:13,display:"flex",justifyContent:"space-between"}}>
              <span>Recipients Preview</span>
              <span style={{color:C.txs,fontWeight:400}}>{csvRows.length} rows</span>
            </div>
            <div style={{maxHeight:280,overflowY:"auto"}}>
              {csvRows.slice(0,20).map((row,i)=>{
                const params=getParams(row);
                let preview=tpl.body;
                params.forEach((v,idx)=>{preview=preview.replace(new RegExp(`\\{\\{${idx+1}\\}\\}`,"g"),v||`{{${idx+1}}}`);});
                return (
                  <div key={i} style={{padding:"11px 16px",borderBottom:`1px solid ${C.border}50`}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                      <span style={{fontWeight:700,fontSize:13}}>{row.name||row.phone}</span>
                      <span style={{fontSize:11,fontFamily:"'JetBrains Mono',monospace",color:C.txs}}>{row.phone}</span>
                    </div>
                    {params.length>0&&(
                      <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:5}}>
                        {params.map((v,idx)=>(
                          <span key={idx} style={{fontSize:10,padding:"1px 8px",borderRadius:20,
                            background:`${C.blue}12`,color:C.blue}}>{`{{${idx+1}}}`}: {v||<em style={{opacity:.5}}>empty</em>}</span>
                        ))}
                      </div>
                    )}
                    <p style={{fontSize:11,color:C.txd,lineHeight:1.5,
                      overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>
                      {preview}
                    </p>
                  </div>
                );
              })}
              {csvRows.length>20&&<p style={{padding:"10px 16px",fontSize:12,color:C.txd,textAlign:"center"}}>+{csvRows.length-20} more rows</p>}
            </div>
          </div>

          <div style={{display:"flex",gap:10}}>
            <Btn ch="← Back" variant="ghost" onClick={()=>{setCsvRows([]);setStep(1);}}/>
            <Btn
              ch={schedule&&schedDate&&schedTime
                ? `⏰ Schedule for ${schedDate} ${schedTime}`
                : `🚀 Send to ${csvRows.length} Contacts Now`}
              onClick={startBulk}
              disabled={hasHeader&&!mediaUrl||(schedule&&(!schedDate||!schedTime))}
              sx={{flex:1,justifyContent:"center"}}/>
          </div>
          {hasHeader&&!mediaUrl&&(
            <p style={{fontSize:12,color:C.red,marginTop:8,textAlign:"center"}}>
              ⚠ This template requires a {headerFmt} URL — add it in Step 2
            </p>
          )}
        </div>
      )}

      {/* STEP 3 — Sending / Results */}
      {step===3&&(
        <div>
          <h2 style={{fontSize:15,fontWeight:800,marginBottom:16}}>
            {campData?.status==="scheduled" ? "⏰ Campaign Scheduled!"
             : campData?.status==="done"    ? "✅ Campaign Complete!"
             : sending ? `⚡ Sending… (${campData?.totalContacts?.toLocaleString()||csvRows.length} messages)`
             : "✅ Done!"}
          </h2>
          {sending && campData?.totalContacts > 100 && (
            <div style={{padding:"10px 14px",borderRadius:9,marginBottom:14,fontSize:13,
              background:"rgba(41,121,255,.08)",border:"1px solid rgba(41,121,255,.25)",
              color:"#2979ff",lineHeight:1.6}}>
              ℹ This is a large campaign ({campData?.totalContacts?.toLocaleString()} messages).
              It's running in the background on the server — you can safely close this page
              and check progress in <strong>Campaigns</strong>.
              Estimated time: ~{Math.ceil((campData?.totalContacts||0)*1.2/3600)} hours.
            </div>
          )}

          {campData?.status==="scheduled"&&(
            <div style={{background:C.card,border:`1px solid ${C.g1}`,borderRadius:12,padding:20,marginBottom:16,textAlign:"center"}}>
              <div style={{fontSize:40,marginBottom:10}}>⏰</div>
              <div style={{fontWeight:800,fontSize:16,color:C.g1,marginBottom:6}}>Campaign Scheduled!</div>
              <div style={{fontSize:13,color:C.txs}}>
                Will automatically send to <strong style={{color:C.tx}}>{csvRows.length} contacts</strong> at<br/>
                <strong style={{color:C.tx,fontSize:15}}>{schedDate} {schedTime}</strong>
              </div>
              <div style={{fontSize:12,color:C.txd,marginTop:10}}>
                View progress in <a href="/dashboard/campaigns" style={{color:C.g1}}>Campaigns →</a>
              </div>
            </div>
          )}

          {campData?.status!=="scheduled"&&(
            <>
              <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:20,marginBottom:16}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                  <span style={{fontWeight:700}}>{done} / {total} processed</span>
                  <span style={{fontWeight:800,fontSize:20,color:C.g1}}>{pct}%</span>
                </div>
                <div style={{height:10,borderRadius:5,overflow:"hidden",background:C.surf,marginBottom:12}}>
                  <div style={{height:"100%",width:`${pct}%`,borderRadius:5,
                    background:`linear-gradient(90deg,${C.g1},${C.teal})`,transition:"width .4s"}}/>
                </div>
                <div style={{display:"flex",gap:20,fontSize:13}}>
                  <span style={{fontWeight:700,color:C.g1}}>✓ {campData?.sent||0} sent</span>
                  <span style={{fontWeight:700,color:C.red}}>✕ {campData?.failed||0} failed</span>
                </div>
              </div>

              {campData?.results&&(
                <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden",marginBottom:16}}>
                  <div style={{padding:"10px 16px",borderBottom:`1px solid ${C.border}`,fontWeight:700,fontSize:13,
                    display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span>Results</span>
                    {!sending&&(
                      <button onClick={()=>downloadCSV(`results_${tpl?.name}.csv`,
                        ["phone","name","status","wamid","error"],
                        campData.results.map(r=>({phone:r.phone,name:r.name||"",
                          status:r.status,wamid:r.wamid||"",error:r.error||""})))}
                        style={{background:"none",border:`1px solid ${C.border}`,borderRadius:6,
                          color:C.txs,fontSize:12,padding:"4px 10px",cursor:"pointer",fontWeight:600}}>
                        ⬇ Export CSV
                      </button>
                    )}
                  </div>
                  <div style={{maxHeight:300,overflowY:"auto"}}>
                    {campData.results.filter(r=>r.status!=="pending").map((r,i)=>(
                      <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                        padding:"10px 16px",borderBottom:`1px solid ${C.border}50`,
                        background:r.status==="failed"?"rgba(244,67,54,.04)":"rgba(37,211,102,.02)"}}>
                        <div>
                          <div style={{fontWeight:600,fontSize:13}}>{r.name||r.phone}</div>
                          <div style={{fontSize:11,fontFamily:"'JetBrains Mono',monospace",color:C.txs}}>{r.phone}</div>
                        </div>
                        <span style={{fontSize:12,fontWeight:700,color:r.status==="failed"?C.red:C.g1}}>
                          {r.status==="failed"?"✕ "+r.error:"✓ Sent"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {!sending&&(
            <button onClick={()=>{setStep(0);setTplId("");setCsvRows([]);setCampData(null);setMediaUrl("");setSchedule(false);setSchedDate("");setSchedTime("");}}
              style={{width:"100%",padding:10,borderRadius:9,border:`1px solid ${C.border}`,
                background:"transparent",color:C.txs,fontWeight:700,fontSize:13,cursor:"pointer"}}>
              ← Start New Campaign
            </button>
          )}
        </div>
      )}

      {toast&&(
        <div style={{position:"fixed",bottom:20,right:20,zIndex:999,padding:"11px 18px",
          borderRadius:10,fontWeight:700,fontSize:13,cursor:"pointer",
          background:toast.t==="success"?`${C.g1}ee`:toast.t==="error"?`${C.red}ee`:`${C.amber}ee`,
          color:toast.t==="error"?"#fff":"#000"}} onClick={()=>setToast(null)}>
          {toast.t==="success"?"✓":toast.t==="error"?"✕":"⏰"} {toast.m}
        </div>
      )}
    </div>
  );
}
