"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { parseCSV, downloadCSV, relTime } from "@/lib/utils";

const C={g1:"#25d366",g2:"#1aad52",teal:"#00c9d4",red:"#f44336",
  card:"#111827",surf:"#0d1117",border:"#1c2a3f",
  tx:"#e8edf5",txs:"#8899b0",txd:"#445566"};
const IS={background:C.surf,border:`1px solid ${C.border}`,borderRadius:10,
  padding:"10px 13px",color:C.tx,fontSize:14,outline:"none",
  boxSizing:"border-box",fontFamily:"inherit",width:"100%"};

function AddContactModal({open,onClose,onSaved}) {
  const [form,setForm]=useState({name:"",phone:"",email:"",tags:"",notes:""});
  const [saving,setSaving]=useState(false);
  const [err,setErr]=useState("");
  const update=k=>e=>setForm(f=>({...f,[k]:e.target.value}));
  const save=async()=>{
    if(!form.name.trim()||!form.phone.trim()){setErr("Name and phone required");return;}
    setSaving(true);setErr("");
    const r=await fetch("/api/contacts",{method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({...form,tags:form.tags.split(",").map(t=>t.trim()).filter(Boolean)})});
    if(r.ok){setForm({name:"",phone:"",email:"",tags:"",notes:""});onSaved();}
    else{const d=await r.json();setErr(d.error||"Failed");}
    setSaving(false);
  };
  if(!open)return null;
  return (
    <div style={{position:"fixed",inset:0,zIndex:50,display:"flex",alignItems:"flex-end",
      justifyContent:"center",background:"rgba(0,0,0,.65)"}}>
      <div style={{background:C.card,border:`1px solid ${C.border}`,
        borderRadius:"16px 16px 0 0",width:"100%",maxWidth:540,
        maxHeight:"90vh",display:"flex",flexDirection:"column"}}>
        <div style={{display:"flex",justifyContent:"center",padding:"12px 0 4px"}}>
          <div style={{width:40,height:4,borderRadius:2,background:C.border}}/>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
          padding:"0 20px 10px"}}>
          <span style={{fontWeight:800,fontSize:15}}>Add Contact</span>
          <button onClick={onClose} style={{background:"none",border:"none",
            color:C.txs,fontSize:24,cursor:"pointer"}}>×</button>
        </div>
        <div style={{overflowY:"auto",flex:1,padding:"0 20px"}}>
          {[{k:"name",l:"Name *",p:"Mukunda Das"},
            {k:"phone",l:"Phone * (with country code)",p:"918977761187"},
            {k:"email",l:"Email",p:"mukunda@example.com"},
            {k:"tags",l:"Tags (comma-separated)",p:"devotee, vip"},
            {k:"notes",l:"Notes",p:"Any notes…"}].map(f=>(
            <div key={f.k} style={{marginBottom:12}}>
              <label style={{display:"block",fontSize:11,fontWeight:700,color:C.txs,
                textTransform:"uppercase",letterSpacing:".5px",marginBottom:6}}>{f.l}</label>
              <input style={IS} placeholder={f.p} value={form[f.k]} onChange={update(f.k)}/>
            </div>
          ))}
          {err&&<p style={{color:C.red,fontSize:13,fontWeight:600,marginBottom:10}}>⚠ {err}</p>}
        </div>
        <div style={{padding:"12px 20px 28px",display:"flex",gap:10}}>
          <button onClick={onClose} style={{flex:1,padding:"11px",borderRadius:9,
            border:`1px solid ${C.border}`,background:"transparent",
            color:C.txs,fontWeight:700,fontSize:14,cursor:"pointer"}}>Cancel</button>
          <button onClick={save} disabled={saving||!form.name||!form.phone}
            style={{flex:1,padding:"11px",borderRadius:9,border:"none",
              background:`linear-gradient(135deg,${C.g1},${C.g2})`,
              color:"#000",fontWeight:700,fontSize:14,cursor:"pointer",
              opacity:saving||!form.name||!form.phone?.4:1}}>
            {saving?"Saving…":"Save Contact"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ImportCSVModal({open,onClose,onImported}) {
  const [csvRows,setCsvRows]=useState([]);
  const [csvErr,setCsvErr]=useState("");
  const [importing,setImporting]=useState(false);
  const fileRef=useRef();
  const handleFile=e=>{
    const file=e.target.files[0];if(!file)return;
    setCsvErr("");setCsvRows([]);
    const reader=new FileReader();
    reader.onload=ev=>{
      const{headers,rows}=parseCSV(ev.target.result);
      if(!headers.includes("phone")){setCsvErr('CSV must have a "phone" column');return;}
      setCsvRows(rows.filter(r=>r.phone?.trim()));
    };
    reader.readAsText(file);e.target.value="";
  };
  const importCSV=async()=>{
    if(!csvRows.length)return;
    setImporting(true);
    const r=await fetch("/api/contacts/import",{method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({contacts:csvRows.map(r=>({
        phone:r.phone?.trim(),name:r.name||r.phone,
        email:r.email||"",tags:r.tags?r.tags.split(";").map(t=>t.trim()):[],
        notes:r.notes||""}))})});
    const d=await r.json();
    onImported(`${d.inserted} imported, ${d.skipped} skipped`);
    setCsvRows([]);setImporting(false);
  };
  if(!open)return null;
  return (
    <div style={{position:"fixed",inset:0,zIndex:50,display:"flex",alignItems:"flex-end",
      justifyContent:"center",background:"rgba(0,0,0,.65)"}}>
      <div style={{background:C.card,border:`1px solid ${C.border}`,
        borderRadius:"16px 16px 0 0",width:"100%",maxWidth:540,
        maxHeight:"85vh",display:"flex",flexDirection:"column"}}>
        <div style={{display:"flex",justifyContent:"center",padding:"12px 0 4px"}}>
          <div style={{width:40,height:4,borderRadius:2,background:C.border}}/>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
          padding:"0 20px 10px"}}>
          <span style={{fontWeight:800,fontSize:15}}>Import from CSV</span>
          <button onClick={onClose} style={{background:"none",border:"none",
            color:C.txs,fontSize:24,cursor:"pointer"}}>×</button>
        </div>
        <div style={{overflowY:"auto",flex:1,padding:"0 20px"}}>
          <div style={{background:C.surf,borderRadius:10,padding:12,
            marginBottom:12,border:`1px solid ${C.border}`}}>
            <code style={{fontSize:12,color:C.g1}}>phone, name, email, tags, notes</code>
          </div>
          <button onClick={()=>downloadCSV("contacts_sample.csv",
            ["phone","name","email","tags","notes"],
            [{phone:"918977761187",name:"Mukunda",email:"m@ex.com",tags:"devotee",notes:""}])}
            style={{width:"100%",padding:"10px",borderRadius:9,border:"none",marginBottom:12,
              background:`linear-gradient(135deg,#00c9d4,#0097a7)`,
              color:"#000",fontWeight:700,fontSize:13,cursor:"pointer"}}>
            ⬇ Download Sample CSV
          </button>
          <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} style={{display:"none"}}/>
          <div onClick={()=>fileRef.current?.click()} style={{
            border:`2px dashed ${C.border}`,borderRadius:12,padding:"24px 16px",
            textAlign:"center",cursor:"pointer",marginBottom:12}}>
            <div style={{fontSize:28,marginBottom:6}}>📁</div>
            <div style={{fontWeight:700,fontSize:14}}>Tap to upload CSV</div>
          </div>
          {csvErr&&<p style={{color:C.red,fontSize:13,fontWeight:600,marginBottom:10}}>✕ {csvErr}</p>}
          {csvRows.length>0&&(
            <div style={{padding:12,borderRadius:10,marginBottom:12,
              background:"rgba(37,211,102,.06)",border:"1px solid rgba(37,211,102,.2)"}}>
              <p style={{fontSize:13,fontWeight:700,color:C.g1}}>✓ {csvRows.length} contacts ready</p>
            </div>
          )}
        </div>
        <div style={{padding:"12px 20px 28px",display:"flex",gap:10}}>
          <button onClick={onClose} style={{flex:1,padding:"11px",borderRadius:9,
            border:`1px solid ${C.border}`,background:"transparent",
            color:C.txs,fontWeight:700,fontSize:14,cursor:"pointer"}}>Cancel</button>
          <button onClick={importCSV} disabled={!csvRows.length||importing}
            style={{flex:1,padding:"11px",borderRadius:9,border:"none",
              background:`linear-gradient(135deg,${C.g1},${C.g2})`,
              color:"#000",fontWeight:700,fontSize:14,cursor:"pointer",
              opacity:!csvRows.length||importing?.4:1}}>
            {importing?"Importing…":`Import ${csvRows.length}`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Contacts() {
  const [contacts,setContacts]=useState([]);
  const [loading,setLoading]=useState(true);
  const [search,setSearch]=useState("");
  const [addOpen,setAddOpen]=useState(false);
  const [csvOpen,setCsvOpen]=useState(false);
  const [toast,setToast]=useState(null);
  const showToast=(m,t="success")=>{setToast({m,t});setTimeout(()=>setToast(null),3500);};
  const loadContacts=useCallback(async()=>{
    setLoading(true);
    const r=await fetch("/api/contacts");
    const d=await r.json();
    setContacts(d.contacts||[]);setLoading(false);
  },[]);
  useEffect(()=>{loadContacts();},[loadContacts]);

  const filtered=contacts.filter(c=>
    c.name?.toLowerCase().includes(search.toLowerCase())||c.phone?.includes(search));

  return (
    <div style={{padding:16}}>
      <div style={{display:"flex",justifyContent:"space-between",
        alignItems:"center",marginBottom:14}}>
        <div>
          <h1 style={{fontSize:18,fontWeight:800}}>👥 Contacts</h1>
          <p style={{fontSize:12,color:C.txs}}>{contacts.length} total</p>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setCsvOpen(true)} style={{padding:"8px 12px",
            borderRadius:9,border:`1px solid ${C.border}`,background:"transparent",
            color:C.txs,fontWeight:700,fontSize:12,cursor:"pointer"}}>📁 Import</button>
          <button onClick={()=>setAddOpen(true)} style={{padding:"8px 14px",
            borderRadius:9,border:"none",
            background:`linear-gradient(135deg,${C.g1},${C.g2})`,
            color:"#000",fontWeight:700,fontSize:12,cursor:"pointer"}}>+ Add</button>
        </div>
      </div>

      <input style={{...IS,marginBottom:12}}
        placeholder="🔍  Search by name or phone…"
        value={search} onChange={e=>setSearch(e.target.value)}/>

      {loading?(
        <p style={{color:C.txd,textAlign:"center",padding:40}}>Loading…</p>
      ):(
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {filtered.length===0?(
            <div style={{textAlign:"center",padding:40,color:C.txd}}>
              <div style={{fontSize:32,marginBottom:8}}>👥</div>
              <p>No contacts yet</p>
            </div>
          ):filtered.map(c=>(
            <div key={c._id} style={{background:C.card,border:`1px solid ${C.border}`,
              borderRadius:12,padding:"12px 14px",display:"flex",
              alignItems:"center",gap:12}}>
              <div style={{width:42,height:42,borderRadius:"50%",flexShrink:0,
                background:"rgba(37,211,102,.15)",border:"2px solid rgba(37,211,102,.3)",
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:16,fontWeight:800,color:C.g1}}>
                {(c.name||c.phone||"?").slice(0,2).toUpperCase()}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontSize:14,overflow:"hidden",
                  textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</div>
                <div style={{fontSize:11,fontFamily:"'JetBrains Mono',monospace",
                  color:C.txs,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                  {c.phone}
                </div>
                {(c.tags||[]).length>0&&(
                  <div style={{display:"flex",gap:4,marginTop:4,flexWrap:"wrap"}}>
                    {c.tags.map(t=>(
                      <span key={t} style={{fontSize:9,padding:"1px 6px",borderRadius:20,
                        fontWeight:700,background:"rgba(0,201,212,.15)",color:"#00c9d4"}}>{t}</span>
                    ))}
                  </div>
                )}
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{fontSize:13,fontWeight:800,color:C.g1}}>{c.totalMessagesSent||0}</div>
                <div style={{fontSize:9,color:C.txd}}>msgs</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AddContactModal open={addOpen} onClose={()=>setAddOpen(false)}
        onSaved={()=>{setAddOpen(false);loadContacts();showToast("Contact added!");}}/>
      <ImportCSVModal open={csvOpen} onClose={()=>setCsvOpen(false)}
        onImported={(msg)=>{setCsvOpen(false);loadContacts();showToast(msg);}}/>

      {toast&&(
        <div onClick={()=>setToast(null)} style={{position:"fixed",bottom:70,
          left:16,right:16,zIndex:999,padding:"11px 16px",borderRadius:10,
          fontWeight:700,fontSize:13,cursor:"pointer",textAlign:"center",
          background:toast.t==="success"?`${C.g1}ee`:`${C.red}ee`,
          color:toast.t==="error"?"#fff":"#000"}}>
          {toast.t==="success"?"✓":"✕"} {toast.m}
        </div>
      )}
    </div>
  );
}
