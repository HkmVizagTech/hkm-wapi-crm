"use client";
import { useState, useEffect } from "react";
import { useParams }           from "next/navigation";
import { relTime, downloadCSV, SCOLOR } from "@/lib/utils";
import Link from "next/link";

const C={g1:"#25d366",teal:"#00c9d4",blue:"#2979ff",red:"#f44336",amber:"#ffb300",
  card:"#111827",surf:"#0d1117",border:"#1c2a3f",tx:"#e8edf5",txs:"#8899b0",txd:"#445566"};
const sc=s=>({done:C.g1,running:C.amber,queued:C.blue,stopped:C.red})[s]||C.txs;

export default function CampaignDetail() {
  const { id }=useParams();
  const [camp,setCamp]=useState(null);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    if(!id)return;
    const load=()=>fetch(`/api/campaigns/${id}`).then(r=>r.json()).then(d=>{
      setCamp(d.campaign);setLoading(false);
      if(d.campaign?.status==="running")setTimeout(load,3000);
    });
    load();
  },[id]);

  if(loading)return <div style={{padding:40,textAlign:"center",color:C.txd}}>Loading…</div>;
  if(!camp)return <div style={{padding:40,textAlign:"center",color:C.txd}}>Campaign not found.</div>;

  const total=camp.totalContacts||1;
  const done=(camp.sent||0)+(camp.failed||0);
  const pct=Math.round((done/total)*100);

  return (
    <div style={{padding:24}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div>
          <h1 style={{fontSize:20,fontWeight:800}}>{camp.name}</h1>
          <p style={{fontSize:13,color:C.txs,marginTop:2}}>{camp.templateName} · {relTime(camp.createdAt)}</p>
        </div>
        <div style={{display:"flex",gap:10}}>
          <button onClick={()=>downloadCSV(`${camp.name}_results.csv`,
            ["phone","name","status","wamid","error"],
            (camp.results||[]).map(r=>({phone:r.phone,name:r.name||"",status:r.status,wamid:r.wamid||"",error:r.error||""})))}
            style={{padding:"8px 14px",borderRadius:8,border:`1px solid ${C.border}`,
              background:"transparent",color:C.txs,fontSize:13,fontWeight:700,cursor:"pointer"}}>
            ⬇ Export CSV
          </button>
          <Link href="/dashboard/campaigns" style={{padding:"8px 14px",borderRadius:8,
            border:`1px solid ${C.border}`,background:"transparent",color:C.txs,
            fontSize:13,fontWeight:700,textDecoration:"none"}}>← Back</Link>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12,marginBottom:20}}>
        {[{l:"Total",v:camp.totalContacts,c:C.txs},{l:"Sent",v:camp.sent,c:C.g1},
          {l:"Delivered",v:camp.delivered||0,c:C.teal},{l:"Failed",v:camp.failed,c:C.red},
          {l:"Status",v:camp.status?.toUpperCase(),c:sc(camp.status)}].map(s=>(
          <div key={s.l} style={{background:C.card,border:`1px solid ${C.border}`,
            borderRadius:10,padding:14,textAlign:"center"}}>
            <div style={{fontSize:20,fontWeight:800,color:s.c}}>{s.v}</div>
            <div style={{fontSize:11,color:C.txs,marginTop:3,fontWeight:600}}>{s.l}</div>
          </div>
        ))}
      </div>

      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:18,marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
          <span style={{fontWeight:700}}>Progress</span>
          <span style={{fontWeight:800,color:C.g1}}>{pct}%</span>
        </div>
        <div style={{height:10,borderRadius:5,overflow:"hidden",background:C.surf}}>
          <div style={{height:"100%",width:`${pct}%`,borderRadius:5,
            background:`linear-gradient(90deg,${C.g1},${C.teal})`,transition:"width .5s"}}/>
        </div>
      </div>

      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden"}}>
        <div style={{padding:"12px 16px",borderBottom:`1px solid ${C.border}`,fontWeight:700,fontSize:14}}>
          Results — {(camp.results||[]).filter(r=>r.status!=="pending").length} / {camp.totalContacts}
        </div>
        <div style={{maxHeight:600,overflowY:"auto"}}>
          {(camp.results||[]).map((r,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
              padding:"11px 16px",borderBottom:`1px solid ${C.border}50`,
              background:r.status==="failed"?"rgba(244,67,54,.04)":r.status==="pending"?"transparent":"rgba(37,211,102,.02)"}}>
              <div>
                <div style={{fontWeight:600,fontSize:13}}>{r.name||r.phone}</div>
                <div style={{fontSize:11,fontFamily:"'JetBrains Mono',monospace",color:C.txs}}>{r.phone}</div>
                {r.params?.length>0&&(
                  <div style={{display:"flex",gap:4,marginTop:4,flexWrap:"wrap"}}>
                    {r.params.map((p,j)=>(
                      <span key={j} style={{fontSize:10,padding:"1px 7px",borderRadius:20,
                        background:`${C.blue}10`,color:C.blue}}>p{j+1}: {p}</span>
                    ))}
                  </div>
                )}
              </div>
              <div style={{textAlign:"right"}}>
                <span style={{fontSize:12,fontWeight:700,
                  color:SCOLOR[r.status]||C.txs,padding:"2px 9px",borderRadius:20,
                  background:`${SCOLOR[r.status]||C.txs}18`}}>
                  {r.status}
                </span>
                {r.error&&<div style={{fontSize:11,color:C.red,marginTop:3}}>{r.error}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
