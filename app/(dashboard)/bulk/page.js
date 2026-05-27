"use client";
import { useState, useRef } from "react";
import { Button, Input, Card, PageHeader, Spinner, Badge } from "@/components/ui";
import { Toast } from "@/components/ui";
import { useToast }  from "@/hooks/useToast";
import { TEMPLATES, parseCSV, downloadCSV } from "@/lib/utils";

const STEPS = ["Template", "Upload CSV", "Preview", "Sending"];

export default function BulkSendPage() {
  const [step,    setStep]    = useState(0);
  const [tplId,   setTplId]   = useState("");
  const [csvRows, setCsvRows] = useState([]);
  const [csvErr,  setCsvErr]  = useState("");
  const [delay,   setDelay]   = useState(1200);
  const [campName,setCampName]= useState("");
  const [running, setRunning] = useState(false);
  const [done,    setDone]    = useState(0);
  const [results, setResults] = useState([]);
  const fileRef = useRef();
  const abort   = useRef(false);
  const { toast, showToast, clearToast } = useToast();

  const approved = TEMPLATES.filter(t => t.status === "APPROVED");
  const tpl      = approved.find(t => t.id === tplId);

  /* ── Download sample CSV ── */
  const downloadSample = () => {
    if (!tpl) return;
    const headers = ["phone","name",...tpl.params.map((_,i)=>`param${i+1}`)];
    downloadCSV(`${tpl.name}_sample.csv`, headers, [
      { phone:"918977761187", name:"Mukunda",  ...Object.fromEntries(tpl.params.map((p,i)=>[`param${i+1}`,`${p} value`])) },
      { phone:"919876543210", name:"Giridhar", ...Object.fromEntries(tpl.params.map((p,i)=>[`param${i+1}`,`${p} value`])) },
    ]);
    showToast("Sample CSV downloaded!");
  };

  /* ── Handle file upload ── */
  const handleFile = e => {
    const file = e.target.files[0]; if (!file) return;
    setCsvErr(""); setCsvRows([]);
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const { headers, rows } = parseCSV(ev.target.result);
        if (!headers.includes("phone")) { setCsvErr('CSV must have a "phone" column'); return; }
        if (!rows.length) { setCsvErr("No data rows found"); return; }
        setCsvRows(rows.filter(r => r.phone?.trim()));
        setStep(2);
      } catch(err) { setCsvErr("Parse error: " + err.message); }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  /* ── Get param values for a CSV row ── */
  const getParams = row => tpl.params.map((_, i) => {
    const v = row[`param${i+1}`];
    if (v) return v;
    const extras = Object.keys(row).filter(h => h !== "phone" && h !== "name");
    return row[extras[i]] || "";
  });

  /* ── Start bulk send (via API → Bull queue) ── */
  const startBulk = async () => {
    if (!tpl || !csvRows.length) return;
    setRunning(true); setResults([]); setDone(0); setStep(3);
    abort.current = false;

    const contacts = csvRows.map(r => ({
      phone:  r.phone.trim().replace(/^\+/,""),
      name:   r.name || r.phone,
      params: getParams(r),
    }));

    try {
      const res = await fetch("/api/messages/bulk", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          name:         campName || `Bulk ${tpl.name} ${new Date().toLocaleDateString()}`,
          templateName: tpl.name,
          templateLang: tpl.language || "en",
          contacts,
          delay,
        }),
      });
      const d = await res.json();
      if (res.ok) {
        showToast(`Campaign queued! ID: ${d.campaignId}`);
        // Poll campaign status
        pollCampaign(d.campaignId);
      } else {
        showToast(d.error || "Failed to start", "error");
        setRunning(false);
      }
    } catch(e) {
      showToast("Network error: " + e.message, "error");
      setRunning(false);
    }
  };

  const pollCampaign = async (id) => {
    const interval = setInterval(async () => {
      try {
        const res  = await fetch(`/api/campaigns/${id}`);
        const data = await res.json();
        const camp = data.campaign;
        if (!camp) return;
        setDone(camp.sent + camp.failed);
        setResults(camp.results?.filter(r => r.status !== "pending") || []);
        if (camp.status === "done" || camp.status === "stopped") {
          clearInterval(interval);
          setRunning(false);
          showToast(`Done! ${camp.sent} sent, ${camp.failed} failed`, camp.failed > 0 ? "warning" : "success");
        }
      } catch { clearInterval(interval); setRunning(false); }
    }, 2000);
  };

  const pct = csvRows.length ? Math.round((done / csvRows.length) * 100) : 0;

  const downloadResults = () => {
    downloadCSV(`results_${tpl?.name}.csv`,
      ["phone","name","status","detail"],
      results.map(r => ({ phone:r.phone, name:r.name, status:r.status, detail:r.wamid||r.error||"" }))
    );
  };

  /* ── Step indicator ── */
  const StepBar = () => (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((s, i) => (
        <div key={s} className="flex items-center" style={{ flex: i < STEPS.length - 1 ? 1 : "initial" }}>
          <div className="flex flex-col items-center gap-1">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold flex-shrink-0"
              style={{
                background: step > i ? "#25d366" : step === i ? "#25d366" : "#1c2a3f",
                color:      step >= i ? "#000" : "#445566",
              }}>
              {step > i ? "✓" : i+1}
            </div>
            <span className="text-xs font-bold whitespace-nowrap"
              style={{ color: step >= i ? "#25d366" : "#445566" }}>{s}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div className="flex-1 h-0.5 mx-2 mb-4 transition-all"
              style={{ background: step > i ? "#25d366" : "#1c2a3f" }}/>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="p-6 fade-up max-w-4xl mx-auto">
      <PageHeader title="📤 Bulk Send" subtitle="Send template messages to multiple contacts via CSV upload"/>
      <StepBar/>

      {/* STEP 0: Pick template */}
      {step === 0 && (
        <div>
          <h2 className="font-bold text-base mb-1">Select a Template</h2>
          <p className="text-sm mb-5" style={{ color:"#8899b0" }}>
            CSV columns will map to the template's {"{{"}<span style={{color:"#2979ff"}}>1</span>{"}}"} {"{{"}<span style={{color:"#2979ff"}}>2</span>{"}}"} parameters.
          </p>
          <div className="space-y-3">
            {approved.map(t => (
              <div key={t.id} onClick={() => setTplId(t.id)}
                className="rounded-xl border p-4 cursor-pointer transition-all hover:border-[#25d366]/50"
                style={{
                  background:   tplId === t.id ? "rgba(37,211,102,0.06)" : "#111827",
                  borderColor:  tplId === t.id ? "#25d366" : "#1c2a3f",
                  borderWidth:  tplId === t.id ? 2 : 1,
                }}>
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="font-extrabold text-sm break-all" style={{ fontFamily:"'JetBrains Mono',monospace" }}>{t.name}</div>
                    <div className="flex gap-2 mt-1.5 flex-wrap">
                      <Badge color={t.category==="MARKETING"?"#ffb300":"#00c9d4"}>{t.category}</Badge>
                      {t.header && <Badge color="#2979ff">{String(t.header).replace(/:.+/,"")}</Badge>}
                    </div>
                    <p className="text-xs mt-2 line-clamp-2 leading-relaxed" style={{ color:"#8899b0" }}>{t.body}</p>
                    {t.params.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {t.params.map((p,i) => (
                          <span key={i} className="text-xs px-2 py-0.5 rounded-full font-bold"
                            style={{ background:"rgba(41,121,255,0.12)", color:"#2979ff" }}>
                            {`{{${i+1}}}`} {p}
                          </span>
                        ))}
                      </div>
                    )}
                    {t.params.length === 0 && (
                      <p className="text-xs mt-1" style={{ color:"#445566" }}>No variables — same message for all</p>
                    )}
                  </div>
                  <div className="w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center"
                    style={{
                      borderColor: tplId===t.id ? "#25d366" : "#1c2a3f",
                      background:  tplId===t.id ? "#25d366" : "transparent",
                    }}>
                    {tplId===t.id && <span className="text-black text-xs font-black">✓</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex justify-end">
            <Button onClick={()=>tplId&&setStep(1)} disabled={!tplId}>
              Next: Upload CSV →
            </Button>
          </div>
        </div>
      )}

      {/* STEP 1: Upload CSV */}
      {step === 1 && tpl && (
        <div>
          <div className="flex items-center gap-3 mb-5">
            <button onClick={()=>setStep(0)} className="text-sm font-semibold" style={{ color:"#8899b0" }}>← Back</button>
            <div>
              <h2 className="font-bold text-base">Upload CSV File</h2>
              <p className="text-sm" style={{ color:"#8899b0" }}>Template: <strong style={{ color:"#25d366" }}>{tpl.name}</strong></p>
            </div>
          </div>

          <Card className="mb-4">
            <p className="text-xs font-bold mb-3" style={{ color:"#8899b0" }}>REQUIRED CSV FORMAT</p>
            <div className="overflow-x-auto mb-4">
              <table className="text-xs w-full border-collapse">
                <thead><tr>
                  {["phone *","name",...tpl.params.map((_,i)=>`param${i+1}`)].map(h=>(
                    <th key={h} className="px-3 py-2 text-left border font-extrabold"
                      style={{ borderColor:"#1c2a3f", background:"rgba(37,211,102,0.1)", color:"#25d366" }}>
                      {h}
                    </th>
                  ))}
                </tr></thead>
                <tbody><tr>
                  {["918977761187","Mukunda",...tpl.params.map(p=>p+" value")].map((v,i)=>(
                    <td key={i} className="px-3 py-2 border" style={{ borderColor:"#1c2a3f", color:"#8899b0" }}>{v}</td>
                  ))}
                </tr></tbody>
              </table>
            </div>
            <div className="text-xs leading-6" style={{ color:"#445566" }}>
              <strong style={{ color:"#8899b0" }}>phone</strong> — required, with country code, no + needed<br/>
              <strong style={{ color:"#8899b0" }}>name</strong>  — optional, shown in results<br/>
              {tpl.params.map((p,i) => (
                <span key={i}>
                  <strong style={{ color:"#2979ff" }}>{`param${i+1}`}</strong> → maps to <code style={{ background:"#0d1117", padding:"0 4px", borderRadius:3 }}>{`{{${i+1}}}`}</code> ({p})<br/>
                </span>
              ))}
            </div>
          </Card>

          <Button variant="teal" className="w-full justify-center mb-4" onClick={downloadSample}>
            ⬇ Download Sample CSV for "{tpl.name}"
          </Button>

          <Input label="Campaign Name (optional)"
            value={campName} onChange={e=>setCampName(e.target.value)}
            placeholder={`Bulk ${tpl.name} ${new Date().toLocaleDateString()}`}/>

          <Input label="Delay Between Sends (ms)"
            type="number" min={500} max={10000} value={delay}
            onChange={e=>setDelay(Number(e.target.value))}
            hint="Keep ≥ 1000ms to avoid rate limits. 1200 contacts × 1.2s ≈ 24 min."/>

          <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile} className="hidden"/>
          <div onClick={()=>fileRef.current?.click()}
            className="border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors hover:border-[#25d366]/40 mt-4"
            style={{ borderColor:"#1c2a3f" }}
            onDragOver={e=>{e.preventDefault();e.currentTarget.style.borderColor="#25d366";}}
            onDragLeave={e=>e.currentTarget.style.borderColor="#1c2a3f"}
            onDrop={e=>{
              e.preventDefault(); e.currentTarget.style.borderColor="#1c2a3f";
              const f=e.dataTransfer.files[0]; if(!f) return;
              const ev={target:{files:[f],value:""}}; handleFile(ev);
            }}>
            <div className="text-4xl mb-3">📁</div>
            <div className="font-bold">Tap to upload CSV or drag & drop</div>
            <div className="text-sm mt-1" style={{ color:"#8899b0" }}>Supports .csv and .txt files</div>
          </div>
          {csvErr && <p className="text-red-400 text-sm mt-3 font-semibold">✕ {csvErr}</p>}
        </div>
      )}

      {/* STEP 2: Preview */}
      {step === 2 && tpl && (
        <div>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-bold text-base">Preview — {csvRows.length} Recipients</h2>
              <p className="text-sm" style={{ color:"#8899b0" }}>Template: <strong style={{ color:"#25d366" }}>{tpl.name}</strong></p>
            </div>
            <Button variant="ghost" size="sm" onClick={()=>{setCsvRows([]);setStep(1);}}>← Re-upload</Button>
          </div>

          <div className="p-3 rounded-xl border mb-5 text-sm"
            style={{ background:"rgba(255,179,0,0.06)", borderColor:"rgba(255,179,0,0.3)", color:"#ffb300" }}>
            ⚠ This will send <strong>{csvRows.length} WhatsApp messages</strong> via your Flaxxa WAPI account.
            Estimated time: ~{Math.ceil(csvRows.length*delay/60000)} min at {delay}ms delay.
          </div>

          <Card className="mb-5">
            <div className="flex justify-between items-center mb-3">
              <span className="font-bold text-sm">Recipients Preview</span>
              <span className="text-xs" style={{ color:"#8899b0" }}>{csvRows.length} rows</span>
            </div>
            <div className="max-h-72 overflow-y-auto space-y-1">
              {csvRows.slice(0,30).map((row,i) => {
                const params = getParams(row);
                let preview  = tpl.body;
                params.forEach((v,idx) => {
                  preview = preview.replace(new RegExp(`\\{\\{${idx+1}\\}\\}`,"g"), v || `{{${idx+1}}}`);
                });
                return (
                  <div key={i} className="p-3 rounded-lg" style={{ background:"#0d1117", borderBottom:"1px solid #1c2a3f" }}>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="font-bold text-sm">{row.name || row.phone}</span>
                      <span className="text-xs font-mono" style={{ color:"#8899b0" }}>{row.phone}</span>
                    </div>
                    {params.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-1.5">
                        {params.map((v,idx) => (
                          <span key={idx} className="text-xs px-2 py-0.5 rounded-full"
                            style={{ background:"rgba(41,121,255,0.1)", color:"#2979ff" }}>
                            {`{{${idx+1}}}`}: {v || <em style={{opacity:.5}}>empty</em>}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-xs line-clamp-2 leading-relaxed" style={{ color:"#445566" }}>{preview}</p>
                  </div>
                );
              })}
              {csvRows.length > 30 && (
                <p className="text-xs text-center py-2" style={{ color:"#445566" }}>+{csvRows.length-30} more rows</p>
              )}
            </div>
          </Card>

          <div className="flex gap-3">
            <Button variant="ghost" onClick={()=>{setCsvRows([]);setStep(1);}}>← Back</Button>
            <Button className="flex-1 justify-center" onClick={startBulk}>
              🚀 Send to {csvRows.length} Contacts
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: Sending / Results */}
      {step === 3 && (
        <div>
          <h2 className="font-bold text-base mb-5">
            {running ? "⚡ Sending…" : "✅ Campaign Complete"}
          </h2>

          <Card className="mb-5">
            <div className="flex justify-between items-center mb-3">
              <span className="font-bold">{done} / {csvRows.length} processed</span>
              <span className="text-2xl font-extrabold" style={{ color:"#25d366" }}>{pct}%</span>
            </div>
            <div className="h-3 rounded-full overflow-hidden mb-3" style={{ background:"#0d1117" }}>
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width:`${pct}%`, background:"linear-gradient(90deg,#25d366,#00c9d4)" }}/>
            </div>
            <div className="flex gap-6 text-sm">
              <span className="font-bold" style={{ color:"#25d366" }}>✓ {results.filter(r=>r.status==="sent"||r.status==="delivered").length} sent</span>
              <span className="font-bold" style={{ color:"#f44336" }}>✕ {results.filter(r=>r.status==="failed").length} failed</span>
            </div>
          </Card>

          {results.length > 0 && (
            <Card className="mb-5">
              <div className="flex justify-between items-center mb-3">
                <span className="font-bold text-sm">Results</span>
                {!running && (
                  <Button variant="ghost" size="sm" onClick={downloadResults}>⬇ Export CSV</Button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto space-y-1.5">
                {results.map((r,i) => (
                  <div key={i} className="flex justify-between items-center p-2.5 rounded-lg"
                    style={{
                      background: r.status==="sent"||r.status==="delivered" ? "rgba(37,211,102,0.05)" : "rgba(244,67,54,0.05)",
                      border: `1px solid ${r.status==="sent"||r.status==="delivered" ? "rgba(37,211,102,0.15)" : "rgba(244,67,54,0.15)"}`,
                    }}>
                    <div>
                      <div className="font-semibold text-sm">{r.name}</div>
                      <div className="text-xs font-mono" style={{ color:"#8899b0" }}>{r.phone}</div>
                    </div>
                    <span className="text-xs font-bold"
                      style={{ color: r.status==="sent"||r.status==="delivered"?"#25d366":"#f44336" }}>
                      {r.status==="sent"||r.status==="delivered" ? "✓ Sent" : "✕ "+r.error}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {!running && (
            <Button variant="ghost" className="w-full justify-center"
              onClick={()=>{ setStep(0);setTplId("");setCsvRows([]);setResults([]);setDone(0); }}>
              ← Start New Campaign
            </Button>
          )}
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast}/>}
    </div>
  );
}
