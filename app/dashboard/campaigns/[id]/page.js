"use client";
import { useState, useEffect, useMemo } from "react";
import { useParams }           from "next/navigation";
import { relTime, downloadCSV, SCOLOR } from "@/lib/utils";
import Link from "next/link";
import { Megaphone, ArrowLeft, Download, Send, CheckCheck, Eye, XCircle, Users, CheckCircle2, Clock } from "lucide-react";
import DataTable from "@/components/DataTable";
import { PageHeader, Card, StatCard, Btn, Badge, EmptyState } from "@/components/ui";

const C={g1:"#25d366",teal:"#00c9d4",blue:"#2979ff",red:"#f44336",amber:"#ffb300",
  card:"#111827",surf:"#0d1117",border:"#1c2a3f",tx:"#e8edf5",txs:"#8899b0",txd:"#445566"};
const sc=s=>({done:C.g1,running:C.amber,queued:C.blue,stopped:C.red})[s]||C.txs;

export default function CampaignDetail() {
  const {id}=useParams();
  const [camp,setCamp]=useState(null);
  const [loading,setLoading]=useState(true);
  const [rf,setRf]=useState("all");
  const [q,setQ]=useState("");

  useEffect(()=>{
    if(!id)return;
    const load=()=>fetch(`/api/campaigns/${id}`).then(r=>r.json()).then(d=>{
      setCamp(d.campaign);setLoading(false);
      if(d.campaign?.status==="running")setTimeout(load,3000);
    });
    load();
  },[id]);

  const results=camp?.results||[];
  const rcounts=useMemo(()=>{const m={all:results.length};results.forEach(r=>{m[r.status]=(m[r.status]||0)+1;});return m;},[results]);
  const rrows=useMemo(()=>{const t=q.trim().toLowerCase();
    return results.filter(r=>(rf==="all"||r.status===rf)&&(!t||(r.phone||"").toLowerCase().includes(t)||(r.name||"").toLowerCase().includes(t)));},[results,rf,q]);

  if(loading)return(
    <div className="page-wrap">
      <div className="skeleton" style={{height:48,width:260,marginBottom:20}}/>
      <div className="stat-grid">{[0,1,2,3,4].map(i=><div key={i} className="skeleton" style={{height:96,borderRadius:14}}/>)}</div>
    </div>);
  if(!camp)return<div className="page-wrap"><div className="ui-card"><EmptyState icon={Megaphone} title="Campaign not found"
    action={<Link href="/dashboard/campaigns" className="ui-btn sm"><ArrowLeft size={13}/>Campaigns</Link>}/></div></div>;

  const total=camp.totalContacts||1;
  const done=(camp.sent||0)+(camp.failed||0);
  const pct=Math.round((done/total)*100);

  return (
    <div className="page-wrap">
      <Link href="/dashboard/campaigns" style={{fontSize:13,color:C.txs,
        textDecoration:"none",display:"inline-flex",alignItems:"center",gap:5,marginBottom:12}}>
        <ArrowLeft size={14}/> Campaigns
      </Link>
      <PageHeader icon={Megaphone} title={camp.name}
        subtitle={`${camp.templateName} · ${relTime(camp.createdAt)}`}
        actions={<>
          <Badge tone={({done:"green",running:"amber",queued:"blue",stopped:"red",scheduled:"purple"})[camp.status]||""}>
            {camp.status?.toUpperCase()}</Badge>
          <Btn icon={Download} onClick={()=>downloadCSV(`${camp.name}_results.csv`,
            ["phone","name","status","wamid","error"],
            (camp.results||[]).map(r=>({phone:r.phone,name:r.name||"",
              status:r.status,wamid:r.wamid||"",error:r.error||""})))}>Export</Btn>
        </>}/>

      <div className="stat-grid" style={{marginBottom:16}}>
        <StatCard icon={Users} label="Total" value={camp.totalContacts} color={C.txs}/>
        <StatCard icon={Send} label="Sent" value={camp.sent||0} color={C.blue}/>
        <StatCard icon={CheckCheck} label="Delivered" value={camp.delivered||0} color={C.teal}/>
        <StatCard icon={Eye} label="Read" value={camp.read||0} color={C.g1}/>
        <StatCard icon={XCircle} label="Failed" value={camp.failed||0} color={C.red}/>
      </div>

      <Card title="Progress" icon={Clock} actions={<span style={{fontWeight:800,color:C.g1,fontSize:18}}>{pct}%</span>}
        style={{marginBottom:16}}>
        <div style={{height:10,borderRadius:5,overflow:"hidden",background:C.surf}}>
          <div style={{height:"100%",width:`${pct}%`,borderRadius:5,
            background:`linear-gradient(90deg,${C.g1},${C.teal})`,transition:"width .5s"}}/>
        </div>
      </Card>

      <Card pad={false} style={{overflow:"hidden"}}>
        <div className="ui-card-title" style={{padding:"14px 16px",margin:0,borderBottom:`1px solid ${C.border}`}}>
          <CheckCircle2 size={16} color="var(--brand)"/>
          Results — {results.filter(r=>r.status!=="pending").length} / {camp.totalContacts}
        </div>
        <DataTable rows={rrows} rowKey={(r,i)=>r.phone+"-"+i} clientPage={100} dense
          search={q} onSearch={setQ} searchPlaceholder="Search phone or name" maxHeight="min(620px,70vh)"
          toolbar={<div className="chips" style={{maxWidth:"100%"}}>
            {["all","pending","sent","delivered","read","failed"].map(s=>(
              <button key={s} className={`chip ${rf===s?"on":""}`} onClick={()=>setRf(s)}>
                {s[0].toUpperCase()+s.slice(1)}<small>{rcounts[s]||0}</small></button>))}</div>}
          columns={[
            {key:"name",label:"Contact",primary:true,sortable:true,sortValue:r=>r.name||r.phone||"",
              render:r=><span style={{fontWeight:600,display:"block",maxWidth:240,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.name||r.phone}</span>},
            {key:"phone",label:"Phone",mono:true,sortable:true},
            {key:"status",label:"Status",sortable:true,render:r=>(
              <div style={{minWidth:0}}>
                <span className="ui-badge" style={{background:`${SCOLOR[r.status]||C.txs}18`,color:SCOLOR[r.status]||C.txs}}>{r.status}</span>
                {r.error&&<div style={{fontSize:11,color:C.red,marginTop:3,whiteSpace:"normal",wordBreak:"break-word",maxWidth:420}}>{r.error}</div>}
              </div>)},
          ]}
          empty={<EmptyState icon={CheckCircle2} title="No results match"/>}
          footer={`${rrows.length.toLocaleString("en-IN")} results`}/>
      </Card>
    </div>
  );
}
