"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { parseCSV, downloadCSV, relTime } from "@/lib/utils";

const C={g1:"#25d366",g2:"#1aad52",teal:"#00c9d4",blue:"#2979ff",red:"#f44336",amber:"#ffb300",
  card:"#111827",surf:"#0d1117",border:"#1c2a3f",tx:"#e8edf5",txs:"#8899b0",txd:"#445566"};

const IS={background:C.surf,border:`1px solid ${C.border}`,borderRadius:10,
  padding:"10px 13px",color:C.tx,fontSize:13,outline:"none",
  boxSizing:"border-box",fontFamily:"inherit",width:"100%"};

/* ── Defined OUTSIDE the page component so they never remount ── */
function AddContactModal({ open, onClose, onSaved }) {
  const [form, setForm] = useState({ name:"", phone:"", email:"", tags:"", notes:"" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const update = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    if (!form.name.trim() || !form.phone.trim()) { setErr("Name and phone are required"); return; }
    setSaving(true); setErr("");
    const r = await fetch("/api/contacts", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({
        ...form,
        tags: form.tags.split(",").map(t=>t.trim()).filter(Boolean),
      }),
    });
    if (r.ok) {
      setForm({ name:"", phone:"", email:"", tags:"", notes:"" });
      onSaved();
    } else {
      const d = await r.json();
      setErr(d.error || "Failed to save");
    }
    setSaving(false);
  };

  if (!open) return null;
  return (
    <div style={{position:"fixed",inset:0,zIndex:50,display:"flex",alignItems:"center",
      justifyContent:"center",padding:16,background:"rgba(0,0,0,.65)"}}>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,
        width:"100%",maxWidth:480}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
          padding:"16px 20px",borderBottom:`1px solid ${C.border}`}}>
          <span style={{fontWeight:800,fontSize:15}}>Add Contact</span>
          <button onClick={onClose} style={{background:"none",border:"none",
            color:C.txs,fontSize:24,cursor:"pointer",lineHeight:1}}>×</button>
        </div>
        <div style={{padding:20}}>
          {[
            {k:"name",  l:"Name *",                    p:"Mukunda Das"},
            {k:"phone", l:"Phone * (with country code)",p:"918977761187"},
            {k:"email", l:"Email",                     p:"mukunda@example.com"},
            {k:"tags",  l:"Tags (comma-separated)",    p:"devotee, vip, donor"},
            {k:"notes", l:"Notes",                     p:"Any notes…"},
          ].map(f=>(
            <div key={f.k} style={{marginBottom:12}}>
              <label style={{display:"block",fontSize:11,fontWeight:700,color:C.txs,
                textTransform:"uppercase",letterSpacing:".5px",marginBottom:6}}>{f.l}</label>
              <input style={IS} placeholder={f.p} value={form[f.k]} onChange={update(f.k)}/>
            </div>
          ))}
          {err && <p style={{color:C.red,fontSize:13,fontWeight:600,marginBottom:10}}>⚠ {err}</p>}
          <div style={{display:"flex",gap:10,marginTop:6}}>
            <button onClick={onClose} style={{flex:1,padding:"10px",borderRadius:9,
              border:`1px solid ${C.border}`,background:"transparent",
              color:C.txs,fontWeight:700,fontSize:13,cursor:"pointer"}}>
              Cancel
            </button>
            <button onClick={save} disabled={saving||!form.name||!form.phone}
              style={{flex:1,padding:"10px",borderRadius:9,border:"none",
                background:`linear-gradient(135deg,${C.g1},${C.g2})`,
                color:"#000",fontWeight:700,fontSize:13,cursor:"pointer",
                opacity:saving||!form.name||!form.phone?.4:1}}>
              {saving ? "Saving…" : "Save Contact"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ImportCSVModal({ open, onClose, onImported }) {
  const [csvRows,   setCsvRows]   = useState([]);
  const [csvErr,    setCsvErr]    = useState("");
  const [importing, setImporting] = useState(false);
  const fileRef = useRef();

  const handleFile = e => {
    const file = e.target.files[0]; if (!file) return;
    setCsvErr(""); setCsvRows([]);
    const reader = new FileReader();
    reader.onload = ev => {
      const { headers, rows } = parseCSV(ev.target.result);
      if (!headers.includes("phone")) { setCsvErr('CSV must have a "phone" column'); return; }
      if (!rows.length) { setCsvErr("No data rows found"); return; }
      setCsvRows(rows.filter(r => r.phone?.trim()));
    };
    reader.readAsText(file); e.target.value = "";
  };

  const importCSV = async () => {
    if (!csvRows.length) return;
    setImporting(true);
    const r = await fetch("/api/contacts/import", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ contacts: csvRows.map(r=>({
        phone: r.phone?.trim(), name: r.name||r.phone,
        email: r.email||"",
        tags:  r.tags ? r.tags.split(";").map(t=>t.trim()) : [],
        notes: r.notes||"",
      }))}),
    });
    const d = await r.json();
    onImported(`${d.inserted} imported, ${d.skipped} skipped`);
    setCsvRows([]); setImporting(false);
  };

  if (!open) return null;
  return (
    <div style={{position:"fixed",inset:0,zIndex:50,display:"flex",alignItems:"center",
      justifyContent:"center",padding:16,background:"rgba(0,0,0,.65)"}}>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,
        width:"100%",maxWidth:520}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
          padding:"16px 20px",borderBottom:`1px solid ${C.border}`}}>
          <span style={{fontWeight:800,fontSize:15}}>Import Contacts from CSV</span>
          <button onClick={onClose} style={{background:"none",border:"none",
            color:C.txs,fontSize:24,cursor:"pointer",lineHeight:1}}>×</button>
        </div>
        <div style={{padding:20}}>
          <div style={{background:C.surf,borderRadius:10,padding:14,
            marginBottom:14,border:`1px solid ${C.border}`}}>
            <p style={{fontSize:11,fontWeight:700,color:C.txs,marginBottom:6,
              textTransform:"uppercase",letterSpacing:".5px"}}>CSV Format</p>
            <code style={{fontSize:12,color:C.g1}}>phone, name, email, tags (;-separated), notes</code>
          </div>
          <button onClick={()=>downloadCSV("contacts_sample.csv",
            ["phone","name","email","tags","notes"],
            [{phone:"918977761187",name:"Mukunda",email:"m@ex.com",tags:"devotee;vip",notes:"Regular donor"}])}
            style={{width:"100%",padding:"10px",borderRadius:9,border:"none",
              background:`linear-gradient(135deg,${C.teal},#0097a7)`,
              color:"#000",fontWeight:700,fontSize:13,cursor:"pointer",marginBottom:14}}>
            ⬇ Download Sample CSV
          </button>
          <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} style={{display:"none"}}/>
          <div onClick={()=>fileRef.current?.click()}
            style={{border:`2px dashed ${C.border}`,borderRadius:12,padding:"28px 20px",
              textAlign:"center",cursor:"pointer",marginBottom:12}}>
            <div style={{fontSize:32,marginBottom:8}}>📁</div>
            <div style={{fontWeight:700,fontSize:14}}>Tap to upload CSV</div>
            <div style={{fontSize:12,marginTop:4,color:C.txs}}>or drag & drop</div>
          </div>
          {csvErr && <p style={{color:C.red,fontSize:13,fontWeight:600,marginBottom:10}}>✕ {csvErr}</p>}
          {csvRows.length > 0 && (
            <div style={{padding:12,borderRadius:10,marginBottom:12,
              background:"rgba(37,211,102,.06)",border:"1px solid rgba(37,211,102,.2)"}}>
              <p style={{fontSize:13,fontWeight:700,color:C.g1}}>✓ {csvRows.length} contacts ready to import</p>
              <div style={{marginTop:6,maxHeight:80,overflowY:"auto"}}>
                {csvRows.slice(0,3).map((r,i)=>(
                  <p key={i} style={{fontSize:11,color:C.txs}}>{r.name||r.phone} — {r.phone}</p>
                ))}
                {csvRows.length>3&&<p style={{fontSize:11,color:C.txd}}>+{csvRows.length-3} more…</p>}
              </div>
            </div>
          )}
          <div style={{display:"flex",gap:10}}>
            <button onClick={onClose} style={{flex:1,padding:"10px",borderRadius:9,
              border:`1px solid ${C.border}`,background:"transparent",
              color:C.txs,fontWeight:700,fontSize:13,cursor:"pointer"}}>
              Cancel
            </button>
            <button onClick={importCSV} disabled={!csvRows.length||importing}
              style={{flex:1,padding:"10px",borderRadius:9,border:"none",
                background:`linear-gradient(135deg,${C.g1},${C.g2})`,
                color:"#000",fontWeight:700,fontSize:13,cursor:"pointer",
                opacity:!csvRows.length||importing?.4:1}}>
              {importing ? "Importing…" : `Import ${csvRows.length} Contacts`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ── */
export default function Contacts() {
  const [contacts, setContacts] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [addOpen,  setAddOpen]  = useState(false);
  const [csvOpen,  setCsvOpen]  = useState(false);
  const [toast,    setToast]    = useState(null);

  const showToast = (m, t="success") => {
    setToast({m,t}); setTimeout(()=>setToast(null), 3500);
  };

  const loadContacts = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/contacts");
    const d = await r.json();
    setContacts(d.contacts || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadContacts(); }, [loadContacts]);

  const filtered = contacts.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{padding:24}}>
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div>
          <h1 style={{fontSize:20,fontWeight:800}}>👥 Contacts</h1>
          <p style={{fontSize:13,color:C.txs,marginTop:2}}>{contacts.length} total contacts</p>
        </div>
        <div style={{display:"flex",gap:10}}>
          <button onClick={()=>setCsvOpen(true)} style={{padding:"9px 16px",borderRadius:9,
            border:`1px solid ${C.border}`,background:"transparent",
            color:C.txs,fontWeight:700,fontSize:13,cursor:"pointer"}}>
            📁 Import CSV
          </button>
          <button onClick={()=>setAddOpen(true)} style={{padding:"9px 18px",borderRadius:9,
            border:"none",background:`linear-gradient(135deg,${C.g1},${C.g2})`,
            color:"#000",fontWeight:700,fontSize:13,cursor:"pointer"}}>
            + Add Contact
          </button>
        </div>
      </div>

      {/* Search */}
      <input style={{...IS,marginBottom:16}} placeholder="🔍  Search by name, phone or email…"
        value={search} onChange={e=>setSearch(e.target.value)}/>

      {/* Table */}
      {loading ? (
        <p style={{color:C.txd,textAlign:"center",padding:40}}>Loading…</p>
      ) : (
        <div style={{background:C.card,border:`1px solid ${C.border}`,
          borderRadius:12,overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead>
              <tr>
                {["Name","Phone","Email","Tags","Messages","Added"].map(h=>(
                  <th key={h} style={{padding:"10px 14px",textAlign:"left",fontSize:11,
                    fontWeight:700,textTransform:"uppercase",letterSpacing:".5px",
                    color:C.txs,borderBottom:`1px solid ${C.border}`}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length===0 ? (
                <tr>
                  <td colSpan={6} style={{padding:"40px",textAlign:"center",color:C.txd}}>
                    No contacts yet. Add manually or import CSV.
                  </td>
                </tr>
              ) : filtered.map(c=>(
                <tr key={c._id} style={{borderBottom:`1px solid ${C.border}50`}}>
                  <td style={{padding:"12px 14px",fontWeight:600}}>{c.name}</td>
                  <td style={{padding:"12px 14px",fontFamily:"'JetBrains Mono',monospace",
                    fontSize:12,color:C.txs}}>{c.phone}</td>
                  <td style={{padding:"12px 14px",fontSize:12,color:C.txs}}>{c.email||"—"}</td>
                  <td style={{padding:"12px 14px"}}>
                    <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                      {(c.tags||[]).map(t=>(
                        <span key={t} style={{fontSize:10,padding:"1px 7px",borderRadius:20,
                          fontWeight:700,background:`${C.teal}18`,color:C.teal}}>{t}</span>
                      ))}
                    </div>
                  </td>
                  <td style={{padding:"12px 14px",fontWeight:800,color:C.g1}}>
                    {c.totalMessagesSent||0}
                  </td>
                  <td style={{padding:"12px 14px",fontSize:12,color:C.txd}}>
                    {relTime(c.addedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals — defined outside, no remount issues */}
      <AddContactModal
        open={addOpen}
        onClose={()=>setAddOpen(false)}
        onSaved={()=>{ setAddOpen(false); loadContacts(); showToast("Contact added!"); }}
      />
      <ImportCSVModal
        open={csvOpen}
        onClose={()=>setCsvOpen(false)}
        onImported={(msg)=>{ setCsvOpen(false); loadContacts(); showToast(msg); }}
      />

      {/* Toast */}
      {toast&&(
        <div onClick={()=>setToast(null)} style={{
          position:"fixed",bottom:20,right:20,zIndex:999,
          padding:"11px 18px",borderRadius:10,fontWeight:700,fontSize:13,cursor:"pointer",
          background:toast.t==="success"?`${C.g1}ee`:`${C.red}ee`,
          color:toast.t==="error"?"#fff":"#000"}}>
          {toast.t==="success"?"✓":"✕"} {toast.m}
        </div>
      )}
    </div>
  );
}
