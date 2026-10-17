"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { relTime } from "@/lib/utils";
import Link from "next/link";
import { Megaphone, Plus, RefreshCw, Calculator, Send, CheckCheck, Eye, XCircle, Clock, Zap, X, ArrowRight } from "lucide-react";
import DataTable from "@/components/DataTable";
import { useToast, useConfirm } from "@/components/Feedback";
import { PageHeader, Card, StatCard, Btn, Badge, EmptyState } from "@/components/ui";
const tone=s=>({done:"green",running:"amber",queued:"blue",scheduled:"purple",stopped:"red"})[s]||"";

const C={g1:"#25d366",teal:"#00c9d4",blue:"#2979ff",red:"#f44336",amber:"#ffb300",
  card:"#111827",surf:"#0d1117",border:"#1c2a3f",tx:"#e8edf5",txs:"#8899b0",txd:"#445566"};
const sc=s=>({done:C.g1,running:C.amber,queued:C.blue,scheduled:"#9c27b0",stopped:C.red})[s]||C.txs;

export default function Campaigns() {
  const [campaigns,  setCampaigns]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [filter,     setFilter]     = useState("ALL");
  const [recalcing,  setRecalcing]  = useState(false);
  const [q,          setQ]          = useState("");
  const router  = useRouter();
  const toast   = useToast();
  const confirm = useConfirm();

  const load = () => {
    setLoading(true);
    fetch("/api/campaigns").then(r=>r.json()).then(d=>{
      setCampaigns(d.campaigns||[]); setLoading(false);
    }).catch(()=>{ setLoading(false); toast("Could not load campaigns","error"); });
  };

  useEffect(()=>{ load(); },[]);

  const cancelCampaign = async (id) => {
    const ok = await confirm({title:"Cancel campaign",message:"Cancel this scheduled campaign?",confirmLabel:"Cancel campaign",danger:true});
    if (!ok) return;
    await fetch(`/api/campaigns/${id}`, { method:"DELETE" });
    toast("Campaign cancelled","success");
    load();
  };

  const recalculate = async () => {
    setRecalcing(true);
    await fetch("/api/campaigns/recalculate",{method:"POST"});
    load(); setRecalcing(false);
    toast("Counts recalculated","success");
  };

  const statuses = ["ALL","done","running","queued","scheduled","stopped"];
  const counts = useMemo(()=>{ const m={ALL:campaigns.length}; campaigns.forEach(c=>{ m[c.status]=(m[c.status]||0)+1; }); return m; },[campaigns]);
  const filtered = useMemo(()=>{
    const t=q.trim().toLowerCase();
    return campaigns.filter(c=>(filter==="ALL"||c.status===filter) &&
      (!t || (c.name||"").toLowerCase().includes(t) || (c.templateName||"").toLowerCase().includes(t)));
  },[campaigns,filter,q]);

  const num=(k,color)=>({key:k,label:k==="delivered"?"Delivered":k[0].toUpperCase()+k.slice(1),align:"right",sortable:true,
    sortValue:c=>c[k]||0,render:c=><span style={{fontWeight:700,color:(c[k]||0)>0?color:"var(--tx3)"}}>{(c[k]||0).toLocaleString("en-IN")}</span>});
  const columns = [
    {key:"name",label:"Campaign",primary:true,sortable:true,sortValue:c=>c.name||"",render:c=>(
      <div style={{minWidth:0,maxWidth:340}}>
        <Link href={`/dashboard/campaigns/${c._id}`} onClick={e=>e.stopPropagation()} style={{fontWeight:700,fontSize:13.5,color:"var(--tx)",textDecoration:"none",display:"block",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</Link>
        <div style={{fontSize:11.5,color:"var(--tx2)",marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.templateName}</div>
        <div style={{fontSize:10.5,color:"var(--tx3)",marginTop:1}}>{relTime(c.createdAt)}</div>
      </div>)},
    {key:"provider",label:"Provider",hideBelow:"md",render:c=><Badge tone={c.provider==="gupshup"?"teal":"blue"}>{(c.provider||"flaxxa").toUpperCase()}</Badge>},
    {key:"status",label:"Status",sortable:true,render:c=><Badge tone={tone(c.status)}>{(c.status||"").toUpperCase()}</Badge>},
    {key:"progress",label:"Progress",width:170,sortable:true,sortValue:c=>((c.sent||0)+(c.failed||0))/(c.totalContacts||1),render:c=>{
      const total=c.totalContacts||1, pct=Math.min(100,Math.round(((c.sent||0)+(c.failed||0))/total*100));
      const seg=[{v:(c.read||0),c:C.g1},{v:(c.delivered||0),c:C.teal},{v:Math.max(0,(c.sent||0)-(c.delivered||0)-(c.read||0)),c:C.blue},{v:(c.failed||0),c:C.red}];
      return (<div style={{minWidth:120}}>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:4,gap:8}}>
          <b style={{color:"var(--tx)"}}>{pct}%</b><span style={{color:"var(--tx3)"}}>{(c.sent||0).toLocaleString("en-IN")}/{(c.totalContacts||0).toLocaleString("en-IN")}</span></div>
        <div style={{height:5,borderRadius:3,overflow:"hidden",background:"var(--line)",display:"flex"}}>
          {seg.map((b,i)=>b.v>0&&<div key={i} style={{width:`${b.v/total*100}%`,background:b.c}}/>)}</div></div>);}},
    num("sent",C.blue), num("delivered",C.teal), num("read",C.g1), num("failed",C.red),
    {key:"createdAt",label:"Created",hideBelow:"lg",sortable:true,sortValue:c=>new Date(c.createdAt||0).getTime(),
      render:c=><span style={{fontSize:12,color:"var(--tx2)",whiteSpace:"nowrap"}}>{c.createdAt?new Date(c.createdAt).toLocaleString("en-IN",{day:"numeric",month:"short",year:"2-digit",timeZone:"Asia/Kolkata"}):"—"}</span>},
  ];

  const totalSent      = campaigns.reduce((a,c)=>a+(c.sent||0),0);
  const totalDelivered = campaigns.reduce((a,c)=>a+(c.delivered||0),0);
  const totalRead      = campaigns.reduce((a,c)=>a+(c.read||0),0);
  const totalFailed    = campaigns.reduce((a,c)=>a+(c.failed||0),0);

  return (
    <div className="page-wrap">
      <PageHeader icon={Megaphone} title="Campaigns" subtitle={`${campaigns.length} total`}
        actions={<>
          <Btn size="sm" icon={Calculator} onClick={recalculate} loading={recalcing}>Recalculate</Btn>
          <Btn size="sm" icon={RefreshCw} onClick={load}>Refresh</Btn>
          <Link href="/dashboard/bulk" className="ui-btn primary"><Plus size={15}/>New</Link>
        </>}/>

      {!loading&&campaigns.length>0&&(
        <div className="stat-grid" style={{marginBottom:16}}>
          <StatCard icon={Send} label="Sent" value={totalSent} color={C.blue}/>
          <StatCard icon={CheckCheck} label="Delivered" value={totalDelivered} color={C.teal}/>
          <StatCard icon={Eye} label="Read" value={totalRead} color={C.g1}/>
          <StatCard icon={XCircle} label="Failed" value={totalFailed} color={C.red}/>
        </div>
      )}

      {/* Queued + Scheduled campaigns highlight */}
      {!loading && campaigns.filter(c=>["queued","scheduled"].includes(c.status)).length > 0 && (
        <div style={{background:"rgba(156,39,176,.08)",border:"1px solid rgba(156,39,176,.3)",
          borderRadius:12,padding:14,marginBottom:14}}>
          <div style={{fontWeight:700,fontSize:14,color:"#ce93d8",marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
            <Clock size={15}/> Pending Campaigns ({campaigns.filter(c=>["queued","scheduled"].includes(c.status)).length})
          </div>
          {campaigns.filter(c=>["queued","scheduled"].includes(c.status)).map(c=>(
            <div key={c._id} style={{display:"flex",justifyContent:"space-between",
              alignItems:"center",padding:"10px 12px",borderRadius:10,
              background:"rgba(156,39,176,.1)",marginBottom:8,
              border:"1px solid rgba(156,39,176,.2)"}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontSize:13,color:C.tx,overflow:"hidden",
                  textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</div>
                <div style={{fontSize:12,color:"#ce93d8",marginTop:2}}>
                  {c.status==="queued"
                    ? <span style={{display:"inline-flex",alignItems:"center",gap:4}}><Zap size={12}/>Sending now (queued)</span>
                    : c.scheduledAt
                      ? new Date(c.scheduledAt).toLocaleString("en-IN",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit",hour12:true,timeZone:"Asia/Kolkata"})+" IST"
                      : "Scheduled"}
                </div>
                <div style={{fontSize:11,color:C.txs}}>{c.totalContacts} contacts · {c.templateName}</div>
              </div>
              <Btn variant="danger" size="sm" icon={X} onClick={()=>cancelCampaign(c._id)}
                style={{flexShrink:0,marginLeft:10}}>Cancel</Btn>
            </div>
          ))}
        </div>
      )}

      <div className="ui-card" style={{overflow:"hidden"}}>
        <DataTable columns={columns} rows={filtered} rowKey={c=>c._id} loading={loading} clientPage={25}
          onRowClick={c=>router.push(`/dashboard/campaigns/${c._id}`)}
          search={q} onSearch={setQ} searchPlaceholder="Search campaign or template"
          toolbar={<div className="chips" style={{maxWidth:"100%"}}>
            {statuses.filter(s=>s==="ALL"||counts[s]).map(s=>(
              <button key={s} className={`chip ${filter===s?"on":""}`} onClick={()=>setFilter(s)}>
                {s==="ALL"?"All":s[0].toUpperCase()+s.slice(1)}<small>{counts[s]||0}</small></button>))}</div>}
          empty={<EmptyState icon={Megaphone} title={campaigns.length===0?"No campaigns yet":"No campaigns match"}
            action={campaigns.length===0&&<Link href="/dashboard/bulk" className="ui-btn primary">Start bulk send <ArrowRight size={15}/></Link>}/>}
          footer={`${filtered.length.toLocaleString("en-IN")} campaigns`}/>
      </div>
    </div>
  );
}
