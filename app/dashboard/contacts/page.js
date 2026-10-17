"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { parseCSV, downloadCSV, relTime } from "@/lib/utils";
import { Users, Plus, Upload, Download, FolderUp, AlertTriangle, XCircle, CheckCircle2, Trash2, MessageSquare, UserPlus, User } from "lucide-react";
import { PageHeader, Btn, Badge, EmptyState } from "@/components/ui";
import DataTable from "@/components/DataTable";
import { Modal, Drawer, useToast, useConfirm } from "@/components/Feedback";

const AI_BADGE={new:["","New"],interested:["green","Interested"],needs_human:["amber","Needs human"],donated:["purple","Donated"],completed:["blue","Completed"]};
const fmtDate=d=>d?new Date(d).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}):"—";
const fmtDT=d=>d?new Date(d).toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short"}):"—";
const initials=c=>(c.name||c.phone||"?").slice(0,2).toUpperCase();
function Avatar({c,size=34}){return <div style={{width:size,height:size,borderRadius:"50%",flexShrink:0,background:"rgba(37,211,102,.15)",border:"1px solid rgba(37,211,102,.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:size>40?16:12,fontWeight:800,color:"var(--brand)"}}>{initials(c)}</div>;}
function StatusBadge({c}){
  if(c.doNotContact)return <Badge tone="red">Do not contact</Badge>;
  const [t,l]=AI_BADGE[c.aiStatus||"new"]||["",c.aiStatus];
  return <Badge tone={t}>{l}</Badge>;
}

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
  return (
    <Modal open={open} onClose={onClose} title="Add Contact" icon={UserPlus} width={520}
      footer={<>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" onClick={save} disabled={saving||!form.name||!form.phone} loading={saving}>
          {saving?"Saving…":"Save Contact"}
        </Btn>
      </>}>
      {[{k:"name",l:"Name *",p:"Mukunda Das"},
        {k:"phone",l:"Phone * (with country code)",p:"918977761187"},
        {k:"email",l:"Email",p:"mukunda@example.com"},
        {k:"tags",l:"Tags (comma-separated)",p:"devotee, vip"},
        {k:"notes",l:"Notes",p:"Any notes…"}].map(f=>(
        <div key={f.k} className="field">
          <label>{f.l}</label>
          <input className="input" placeholder={f.p} value={form[f.k]} onChange={update(f.k)}/>
        </div>
      ))}
      {err&&<p style={{color:"var(--red,#f44336)",fontSize:13,fontWeight:600,display:"flex",alignItems:"center",gap:6}}><AlertTriangle size={14}/>{err}</p>}
    </Modal>
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
  return (
    <Modal open={open} onClose={onClose} title="Import from CSV" icon={Upload} width={520}
      footer={<>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" onClick={importCSV} disabled={!csvRows.length||importing} loading={importing}>
          {importing?"Importing…":`Import ${csvRows.length}`}
        </Btn>
      </>}>
      <div style={{background:"var(--panel)",borderRadius:10,padding:12,marginBottom:12,border:"1px solid var(--line)",overflowX:"auto"}}>
        <code style={{fontSize:12,color:"var(--brand)",whiteSpace:"nowrap"}}>phone, name, email, tags, notes</code>
      </div>
      <Btn icon={Download} style={{width:"100%",marginBottom:12}} onClick={()=>downloadCSV("contacts_sample.csv",
        ["phone","name","email","tags","notes"],
        [{phone:"918977761187",name:"Mukunda",email:"m@ex.com",tags:"devotee",notes:""}])}
        >Download Sample CSV</Btn>
      <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} style={{display:"none"}}/>
      <div onClick={()=>fileRef.current?.click()} style={{
        border:"2px dashed var(--line)",borderRadius:12,padding:"24px 16px",
        textAlign:"center",cursor:"pointer",marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"center",marginBottom:8,color:"var(--brand)"}}><FolderUp size={28}/></div>
        <div style={{fontWeight:700,fontSize:14}}>Click to upload CSV</div>
      </div>
      {csvErr&&<p style={{color:"#f44336",fontSize:13,fontWeight:600,marginBottom:10,display:"flex",alignItems:"center",gap:6}}><XCircle size={14}/>{csvErr}</p>}
      {csvRows.length>0&&(
        <div style={{padding:12,borderRadius:10,background:"rgba(37,211,102,.06)",border:"1px solid rgba(37,211,102,.2)"}}>
          <p style={{fontSize:13,fontWeight:700,color:"var(--brand)",display:"flex",alignItems:"center",gap:6}}><CheckCircle2 size={14}/>{csvRows.length} contacts ready</p>
        </div>
      )}
    </Modal>
  );
}

function Row({label,children}){
  return <div style={{display:"flex",justifyContent:"space-between",gap:12,padding:"10px 0",borderBottom:"1px solid var(--line)",fontSize:13,minWidth:0}}>
    <span style={{color:"var(--tx3)",flexShrink:0}}>{label}</span>
    <span style={{textAlign:"right",minWidth:0,overflowWrap:"anywhere",fontWeight:600}}>{children}</span>
  </div>;
}

const FILTERS=[["","All"],["interested","Interested"],["needs_human","Needs human"],["dnc","Do not contact"]];

export default function Contacts() {
  const toast=useToast(), confirm=useConfirm();
  const [contacts,setContacts]=useState([]);
  const [loading,setLoading]=useState(true);
  const [search,setSearch]=useState("");
  const [addOpen,setAddOpen]=useState(false);
  const [csvOpen,setCsvOpen]=useState(false);
  const [total,setTotal]=useState(0);
  const [hasMore,setHasMore]=useState(false);
  const [loadingMore,setLoadingMore]=useState(false);
  const [q,setQ]=useState("");           // debounced search, sent to the server
  const [status,setStatus]=useState("");
  const [sort,setSort]=useState({key:"addedAt",dir:"desc"});
  const [sel,setSel]=useState(null);
  const [deleting,setDeleting]=useState(false);
  const PAGE=40;
  useEffect(()=>{const t=setTimeout(()=>setQ(search.trim()),300);return()=>clearTimeout(t);},[search]);
  const qs=useCallback(skip=>`/api/contacts?limit=${PAGE}&skip=${skip}&q=${encodeURIComponent(q)}&sort=${sort.key}&dir=${sort.dir}${status?`&status=${status}`:""}`,[q,sort,status]);

  // first page (and reset when search / sort / filter changes)
  const loadContacts=useCallback(async()=>{
    setLoading(true);
    try{
      const r=await fetch(qs(0));
      const d=await r.json();
      setContacts(d.contacts||[]);setTotal(d.total||0);setHasMore(!!d.hasMore);
    }catch{}
    setLoading(false);
  },[qs]);
  useEffect(()=>{loadContacts();},[loadContacts]);

  // next page as the list is scrolled
  const loadMore=useCallback(async()=>{
    if(loadingMore||!hasMore)return;
    setLoadingMore(true);
    try{
      const r=await fetch(qs(contacts.length));
      const d=await r.json();
      setContacts(p=>{const have=new Set(p.map(c=>c._id));return[...p,...(d.contacts||[]).filter(c=>!have.has(c._id))];});
      setHasMore(!!d.hasMore);
    }catch{}
    setLoadingMore(false);
  },[loadingMore,hasMore,contacts.length,qs]);

  const del=async c=>{
    const ok=await confirm({title:"Delete contact?",message:`${c.name||c.phone} will be permanently removed. This cannot be undone.`,confirmLabel:"Delete",danger:true});
    if(!ok)return;
    setDeleting(true);
    try{
      const r=await fetch(`/api/contacts/${c._id}`,{method:"DELETE"});
      const d=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(d.error||"Delete failed");
      setContacts(p=>p.filter(x=>x._id!==c._id));setTotal(t=>Math.max(0,t-1));setSel(null);
      toast("Contact deleted");
    }catch(e){toast(e.message||"Delete failed","error");}
    setDeleting(false);
  };

  const columns=[
    {key:"name",label:"Contact",sortable:true,primary:true,hideLabelOnCard:true,render:c=>(
      <div style={{display:"flex",alignItems:"center",gap:10,minWidth:0}}>
        <Avatar c={c}/>
        <span style={{fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"min(260px,60vw)"}}>{c.name||"—"}</span>
      </div>)},
    {key:"phone",label:"Phone",sortable:true,mono:true,render:c=><span style={{whiteSpace:"nowrap"}}>{c.phone}</span>},
    {key:"tags",label:"Tags",hideBelow:"lg",render:c=>(
      <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
        {(c.tags||[]).length?(c.tags||[]).slice(0,3).map(t=><Badge key={t} tone="teal">{t}</Badge>):<span style={{color:"var(--tx3)"}}>—</span>}
        {(c.tags||[]).length>3&&<Badge>+{c.tags.length-3}</Badge>}
      </div>)},
    {key:"aiStatus",label:"Status",render:c=><StatusBadge c={c}/>},
    {key:"totalMessagesSent",label:"Messages",sortable:true,align:"right",render:c=><b style={{color:"var(--brand)"}}>{c.totalMessagesSent||0}</b>},
    {key:"lastMessageAt",label:"Last message",sortable:true,hideBelow:"md",render:c=><span style={{color:"var(--tx2)",whiteSpace:"nowrap"}}>{relTime(c.lastMessageAt)}</span>},
    {key:"addedAt",label:"Added",sortable:true,hideBelow:"md",render:c=><span style={{color:"var(--tx2)",whiteSpace:"nowrap"}}>{fmtDate(c.addedAt)}</span>},
  ];

  return (
    <div className="page-wrap">
      <PageHeader icon={Users} title="Contacts" subtitle={q||status?`${total.toLocaleString("en-IN")} matching`:`${total.toLocaleString("en-IN")} total`}
        actions={<>
          <Btn icon={Upload} onClick={()=>setCsvOpen(true)}>Import</Btn>
          <Btn variant="primary" icon={Plus} onClick={()=>setAddOpen(true)}>Add</Btn>
        </>}/>

      <div className="ui-card" style={{overflow:"hidden"}}>
        <DataTable columns={columns} rows={contacts} loading={loading} loadingMore={loadingMore}
          hasMore={hasMore} onLoadMore={loadMore} onRowClick={setSel}
          search={search} onSearch={setSearch} searchPlaceholder="Search by name or phone…"
          sort={sort} onSort={(key,dir)=>setSort({key,dir})}
          toolbar={<div className="chips">{FILTERS.map(([v,l])=>(
            <button key={v} className={`chip ${status===v?"on":""}`} onClick={()=>setStatus(v)}>{l}</button>))}</div>}
          footer={`All ${total.toLocaleString("en-IN")} contacts loaded`}
          empty={<EmptyState icon={Users} title={q||status?"No contacts match":"No contacts yet"}
            action={!q&&!status&&<Btn variant="primary" icon={Plus} onClick={()=>setAddOpen(true)}>Add contact</Btn>}/>}/>
      </div>

      <Drawer open={!!sel} onClose={()=>setSel(null)} title="Contact details" icon={User}
        footer={sel&&<>
          <Link href={`/dashboard/inbox?phone=${encodeURIComponent(sel.phone)}&name=${encodeURIComponent(sel.name||"")}`} className="ui-btn" style={{textDecoration:"none"}}><MessageSquare size={15}/>Open chat</Link>
          <Btn variant="danger" icon={Trash2} loading={deleting} onClick={()=>del(sel)}>Delete</Btn>
        </>}>
        {sel&&<>
          <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:14,minWidth:0}}>
            <Avatar c={sel} size={52}/>
            <div style={{minWidth:0}}>
              <div style={{fontWeight:800,fontSize:17,overflowWrap:"anywhere"}}>{sel.name||"—"}</div>
              <div className="mono" style={{color:"var(--tx2)",fontSize:13}}>{sel.phone}</div>
            </div>
          </div>
          <Row label="Status"><StatusBadge c={sel}/></Row>
          <Row label="Email">{sel.email||"—"}</Row>
          <Row label="Tags">{(sel.tags||[]).length?<span style={{display:"inline-flex",gap:4,flexWrap:"wrap",justifyContent:"flex-end"}}>{sel.tags.map(t=><Badge key={t} tone="teal">{t}</Badge>)}</span>:"—"}</Row>
          <Row label="Messages sent">{sel.totalMessagesSent||0}</Row>
          <Row label="Last message">{fmtDT(sel.lastMessageAt)}</Row>
          <Row label="Added">{fmtDT(sel.addedAt)}</Row>
          <div style={{marginTop:14}}>
            <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:".6px",color:"var(--tx3)",marginBottom:6}}>Notes</div>
            <p style={{fontSize:13,color:"var(--tx2)",lineHeight:1.55,whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{sel.notes||"No notes"}</p>
          </div>
        </>}
      </Drawer>

      <AddContactModal open={addOpen} onClose={()=>setAddOpen(false)}
        onSaved={()=>{setAddOpen(false);loadContacts();toast("Contact added");}}/>
      <ImportCSVModal open={csvOpen} onClose={()=>setCsvOpen(false)}
        onImported={(msg)=>{setCsvOpen(false);loadContacts();toast(msg);}}/>
    </div>
  );
}
