"use client";
import { useState, useRef } from "react";
import { TEMPLATES, parseCSV, downloadCSV } from "@/lib/utils";

const C={g1:"#25d366",teal:"#00c9d4",blue:"#2979ff",amber:"#ffb300",red:"#f44336",
  card:"#111827",surf:"#0d1117",border:"#1c2a3f",tx:"#e8edf5",txs:"#8899b0",txd:"#445566"};
const IS={width:"100%",background:C.surf,border:`1px solid ${C.border}`,borderRadius:10,
  padding:"10px 13px",color:C.tx,fontSize:13,outline:"none",boxSizing:"border-box"};
const Btn=({ch,onClick,disabled,sx={}})=>(
  <button onClick={onClick} disabled={disabled} style={{
    padding:"10px 20px",borderRadius:9,border:"none",fontWeight:700,fontSize:13,
    background:`linear-gradient(135deg,${C.g1},#1aad52)`,color:"#000",
    cursor:disabled?"not-allowed":"pointer",opacity:disabled?.4:1,
    display:"inline-flex",alignItems:"center",gap:6,...sx}}>
    {ch}
  </button>
);

export default function BulkSend() {
  const [step,setStep]=useState(0);
  const [tplId,setTplId]=useState("");
  const [csvRows,setCsvRows]=useState([]);
  const [csvErr,setCsvErr]=useState("");
  const [campName,setCampName]=useState("");
  const [delay,setDelay]=useState(1200);
  const [sending,setSending]=useState(false);
  const [campaignId,setCampaignId]=useState(null);
  const [campData,setCampData]=useState(null);
  const [toast,setToast]=useState(null);
  const fileRef=useRef();
  const pollRef=useRef();

  const approved=TEMPLATES.filter(t=>t.status==="APPROVED");
  const tpl=approved.find(t=>t.id===tplId);
  const showToast=(m,t="success")=>{setToast({m,t});setTimeout(()=>setToast(null),4000);};

  const getParams=row=>tpl.params.map((_,i)=>{
    const v=row[`param${i+1}`];if(v)return v;
    const extras=Object.keys(row).filter(h=>h!=="phone"&&h!=="name");
    return row[extras[i]]||"";
  });

  const handleFile=e=>{
    const file=e.target.files[0];if(!file)return;
    setCsvErr("");setCsvRows([]);
    const reader=new FileReader();
    reader.onload=ev=>{
      try{
        const{headers,rows}=parseCSV(ev.target.result);
        if(!headers.includes("phone")){setCsvErr('CSV must have a "phone" column');return;}
        if(!rows.length){setCsvErr("No data rows found");return;}
        setCsvRows(rows.filter(r=>r.phone?.trim()));
        setStep(2);
      }catch(err){setCsvErr("Parse error: "+err.message);}
    };
    reader.readAsText(file);e.target.value="";
  };

  const startBulk=async()=>{
    setSending(true);setStep(3);
    const contacts=csvRows.map(r=>({
      phone:r.phone.trim().replace(/^\+/,""),
      name:r.name||r.phone,
      params:getParams(r),
    }));
    const r=await fetch("/api/messages/bulk",{method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({name:campName||`Bulk ${tpl.name} ${new Date().toLocaleDateString()}`,
        templateName:tpl.name,templateLang:tpl.language||"en",contacts,delay})});
    const d=await r.json();
    if(r.ok){
      setCampaignId(d.campaignId);
      pollRef.current=setInterval(async()=>{
        const pr=await fetch(`/api/campaigns/${d.campaignId}`);
        const pd=await pr.json();
        if(pd.campaign){
          setCampData(pd.campaign);
          if(pd.campaign.status==="done"||pd.campaign.status==="stopped"){
            clearInterval(pollRef.current);setSending(false);
            showToast(`Done! ${pd.campaign.sent} sent, ${pd.campaign.failed} failed`,
              pd.campaign.failed>0?"warning":"success");
          }
        }
      },2500);
    }else{
      showToast(d.error||"Failed","error");setSending(false);setStep(2);
    }
  };

  const total=campData?.totalContacts||csvRows.length||1;
  const done=(campData?.sent||0)+(campData?.failed||0);
  const pct=Math.round((done/total)*100);

  const STEPS=["Template","Upload CSV","Preview","Sending"];

  return (
    <div style={{padding:24,maxWidth:900,margin:"0 auto"}}>
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
              background:step>i?C.g1:C.border,transition:"background .3s"}}/>}
          </div>
        ))}
      </div>

      {/* STEP 0 */}
      {step===0&&(
        <div>
          <p style={{fontSize:13,color:C.txs,marginBottom:16}}>
            Select an approved template. CSV columns will map to {"{{"}<span style={{color:C.blue}}>1</span>{"}}"} {"{{"}<span style={{color:C.blue}}>2</span>{"}}"} parameters.
          </p>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {approved.map(t=>(
              <div key={t.id} onClick={()=>setTplId(t.id)} style={{
                background:tplId===t.id?"rgba(37,211,102,.06)":C.card,
                border:`${tplId===t.id?2:1}px solid ${tplId===t.id?C.g1:C.border}`,
                borderRadius:12,padding:16,cursor:"pointer",transition:"all .15s"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div style={{flex:1,paddingRight:8}}>
                    <div style={{fontWeight:800,fontSize:13,fontFamily:"'JetBrains Mono',monospace",wordBreak:"break-all"}}>{t.name}</div>
                    <p style={{fontSize:12,color:C.txs,marginTop:5,lineHeight:1.5,
                      overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{t.body}</p>
                    {t.params.length>0&&(
                      <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:7}}>
                        {t.params.map((p,i)=>(
                          <span key={i} style={{fontSize:10,padding:"1px 8px",borderRadius:20,fontWeight:700,
                            background:`${C.blue}14`,color:C.blue}}>{`{{${i+1}}}`} {p}</span>
                        ))}
                      </div>
                    )}
                    {t.params.length===0&&<p style={{fontSize:11,color:C.txd,marginTop:5}}>No variables — same message for all</p>}
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

      {/* STEP 1 */}
      {step===1&&tpl&&(
        <div>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:18}}>
            <button onClick={()=>setStep(0)} style={{background:"none",border:"none",color:C.txs,fontSize:14,cursor:"pointer"}}>← Back</button>
            <div>
              <h2 style={{fontSize:15,fontWeight:800}}>Upload CSV</h2>
              <p style={{fontSize:12,color:C.txs}}>Template: <strong style={{color:C.g1}}>{tpl.name}</strong></p>
            </div>
          </div>
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:16,marginBottom:14}}>
            <p style={{fontSize:11,fontWeight:700,color:C.txs,textTransform:"uppercase",
              letterSpacing:".5px",marginBottom:10}}>Required CSV format</p>
            <div style={{overflowX:"auto"}}>
              <table style={{borderCollapse:"collapse",fontSize:12}}>
                <thead><tr>
                  {["phone *","name",...tpl.params.map((_,i)=>`param${i+1}`)].map(h=>(
                    <th key={h} style={{padding:"6px 12px",textAlign:"left",fontWeight:800,
                      background:"rgba(37,211,102,.1)",color:C.g1,border:`1px solid ${C.border}`}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody><tr>
                  {["918977761187","Mukunda",...tpl.params.map(p=>p+" value")].map((v,i)=>(
                    <td key={i} style={{padding:"6px 12px",border:`1px solid ${C.border}`,color:C.txs}}>{v}</td>
                  ))}
                </tr></tbody>
              </table>
            </div>
            <div style={{fontSize:11,color:C.txd,marginTop:10,lineHeight:1.8}}>
              {tpl.params.map((p,i)=>(
                <span key={i}><strong style={{color:C.blue}}>param{i+1}</strong> → {`{{${i+1}}}`} ({p}) &nbsp;</span>
              ))}
            </div>
          </div>

          <div style={{marginBottom:14}}>
            <label style={{display:"block",fontSize:11,fontWeight:700,color:C.txs,
              textTransform:"uppercase",letterSpacing:".5px",marginBottom:6}}>Campaign Name (optional)</label>
            <input style={IS} placeholder={`Bulk ${tpl.name} ${new Date().toLocaleDateString()}`}
              value={campName} onChange={e=>setCampName(e.target.value)}/>
          </div>
          <div style={{marginBottom:16}}>
            <label style={{display:"block",fontSize:11,fontWeight:700,color:C.txs,
              textTransform:"uppercase",letterSpacing:".5px",marginBottom:6}}>Delay between sends (ms)</label>
            <input style={IS} type="number" min={500} max={10000} value={delay}
              onChange={e=>setDelay(Number(e.target.value))}/>
            <p style={{fontSize:11,color:C.txd,marginTop:4}}>Keep ≥1000ms to avoid rate limits</p>
          </div>

          <button onClick={()=>downloadCSV(`${tpl.name}_sample.csv`,
            ["phone","name",...tpl.params.map((_,i)=>`param${i+1}`)],
            [{phone:"918977761187",name:"Mukunda",...Object.fromEntries(tpl.params.map((p,i)=>[`param${i+1}`,p+" value"]))}])}
            style={{width:"100%",padding:10,borderRadius:9,border:"none",
              background:`linear-gradient(135deg,${C.teal},#0097a7)`,
              color:"#000",fontWeight:700,fontSize:13,cursor:"pointer",marginBottom:14}}>
            ⬇ Download Sample CSV for "{tpl.name}"
          </button>

          <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile} style={{display:"none"}}/>
          <div onClick={()=>fileRef.current?.click()} style={{
            border:`2px dashed ${C.border}`,borderRadius:12,padding:"36px 20px",
            textAlign:"center",cursor:"pointer",transition:"border-color .15s"}}
            onDragOver={e=>{e.preventDefault();e.currentTarget.style.borderColor=C.g1;}}
            onDragLeave={e=>e.currentTarget.style.borderColor=C.border}
            onDrop={e=>{e.preventDefault();e.currentTarget.style.borderColor=C.border;
              const f=e.dataTransfer.files[0];if(!f)return;
              const ev={target:{files:[f],value:""}};handleFile(ev);}}>
            <div style={{fontSize:40,marginBottom:10}}>📁</div>
            <div style={{fontWeight:700,fontSize:15}}>Tap to upload CSV or drag & drop</div>
            <div style={{fontSize:13,color:C.txs,marginTop:4}}>Supports .csv and .txt files</div>
          </div>
          {csvErr&&<p style={{color:C.red,fontSize:13,fontWeight:600,marginTop:10}}>✕ {csvErr}</p>}
        </div>
      )}

      {/* STEP 2 */}
      {step===2&&tpl&&(
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div>
              <h2 style={{fontSize:15,fontWeight:800}}>Preview — {csvRows.length} recipients</h2>
              <p style={{fontSize:12,color:C.txs}}>Template: <strong style={{color:C.g1}}>{tpl.name}</strong></p>
            </div>
            <button onClick={()=>{setCsvRows([]);setStep(1);}} style={{
              background:"none",border:`1px solid ${C.border}`,borderRadius:8,
              color:C.txs,fontSize:13,padding:"6px 12px",cursor:"pointer"}}>← Re-upload</button>
          </div>

          <div style={{padding:"10px 14px",borderRadius:10,marginBottom:16,fontSize:13,
            background:"rgba(255,179,0,.06)",border:"1px solid rgba(255,179,0,.3)",color:C.amber}}>
            ⚠ This will send <strong>{csvRows.length} WhatsApp messages</strong> from your Flaxxa WAPI account.
            ~{Math.ceil(csvRows.length*delay/60000)} min at {delay}ms delay.
          </div>

          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,
            overflow:"hidden",marginBottom:18}}>
            <div style={{padding:"10px 16px",borderBottom:`1px solid ${C.border}`,
              fontWeight:700,fontSize:13,display:"flex",justifyContent:"space-between"}}>
              <span>Preview</span><span style={{color:C.txs,fontWeight:400}}>{csvRows.length} rows</span>
            </div>
            <div style={{maxHeight:320,overflowY:"auto"}}>
              {csvRows.slice(0,20).map((row,i)=>{
                const params=getParams(row);
                let preview=tpl.body;
                params.forEach((v,idx)=>{ preview=preview.replace(new RegExp(`\\{\\{${idx+1}\\}\\}`,"g"),v||`{{${idx+1}}}`); });
                return (
                  <div key={i} style={{padding:"12px 16px",borderBottom:`1px solid ${C.border}50`}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                      <span style={{fontWeight:700,fontSize:13}}>{row.name||row.phone}</span>
                      <span style={{fontSize:11,fontFamily:"'JetBrains Mono',monospace",color:C.txs}}>{row.phone}</span>
                    </div>
                    {params.length>0&&(
                      <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:6}}>
                        {params.map((v,idx)=>(
                          <span key={idx} style={{fontSize:10,padding:"1px 8px",borderRadius:20,
                            background:`${C.blue}12`,color:C.blue}}>{`{{${idx+1}}}`}: {v||<em style={{opacity:.5}}>empty</em>}</span>
                        ))}
                      </div>
                    )}
                    <p style={{fontSize:11,color:C.txd,lineHeight:1.5,
                      overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{preview}</p>
                  </div>
                );
              })}
              {csvRows.length>20&&<p style={{padding:"10px 16px",fontSize:12,color:C.txd,textAlign:"center"}}>+{csvRows.length-20} more rows</p>}
            </div>
          </div>

          <div style={{display:"flex",gap:10}}>
            <button onClick={()=>{setCsvRows([]);setStep(1);}} style={{
              padding:"10px 20px",borderRadius:9,border:`1px solid ${C.border}`,
              background:"transparent",color:C.txs,fontWeight:700,fontSize:13,cursor:"pointer"}}>
              ← Back
            </button>
            <Btn ch={`🚀 Send to ${csvRows.length} Contacts`} onClick={startBulk} sx={{flex:1,justifyContent:"center"}}/>
          </div>
        </div>
      )}

      {/* STEP 3 */}
      {step===3&&(
        <div>
          <h2 style={{fontSize:15,fontWeight:800,marginBottom:16}}>
            {sending?"⚡ Sending…":"✅ Campaign Complete!"}
          </h2>
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
              <div style={{padding:"10px 16px",borderBottom:`1px solid ${C.border}`,fontWeight:700,fontSize:13}}>Results</div>
              <div style={{maxHeight:300,overflowY:"auto"}}>
                {campData.results.filter(r=>r.status!=="pending").map((r,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                    padding:"10px 16px",borderBottom:`1px solid ${C.border}50`,
                    background:r.status==="failed"?"rgba(244,67,54,.04)":"rgba(37,211,102,.03)"}}>
                    <div>
                      <div style={{fontWeight:600,fontSize:13}}>{r.name||r.phone}</div>
                      <div style={{fontSize:11,color:C.txs,fontFamily:"'JetBrains Mono',monospace"}}>{r.phone}</div>
                    </div>
                    <span style={{fontSize:12,fontWeight:700,color:r.status==="failed"?C.red:C.g1}}>
                      {r.status==="failed"?("✕ "+r.error):"✓ Sent"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {!sending&&(
            <button onClick={()=>{setStep(0);setTplId("");setCsvRows([]);setCampData(null);setDone&&0;}}
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
          background:toast.t==="success"?`${C.g1}ee`:toast.t==="error"?`#f44336ee`:`${C.amber}ee`,
          color:toast.t==="error"?"#fff":"#000"}} onClick={()=>setToast(null)}>
          {toast.t==="success"?"✓":toast.t==="error"?"✕":"ℹ"} {toast.m}
        </div>
      )}
    </div>
  );
}
