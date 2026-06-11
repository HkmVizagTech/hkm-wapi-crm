"use client";
import { useState, useEffect } from "react";
import { useParams }           from "next/navigation";
import { relTime, downloadCSV, SCOLOR } from "@/lib/utils";
import Link from "next/link";

const C={g1:"#25d366",teal:"#00c9d4",blue:"#2979ff",red:"#f44336",amber:"#ffb300",
  card:"#111827",surf:"#0d1117",border:"#1c2a3f",tx:"#e8edf5",txs:"#8899b0",txd:"#445566"};
const sc=s=>({done:C.g1,running:C.amber,queued:C.blue,stopped:C.red})[s]||C.txs;

export default function CampaignDetail() {
  const {id}=useParams();
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

  if(loading)return<div style={{padding:40,textAlign:"center",color:C.txd}}>Loading…</div>;
  if(!camp)return<div style={{padding:40,textAlign:"center",color:C.txd}}>Not found.</div>;

  const total=camp.totalContacts||1;
  const done=(camp.sent||0)+(camp.failed||0);
  const pct=Math.round((done/total)*100);

  return (
    <div style={{padding:16}}>
      {/* Header */}
      <div style={{marginBottom:16}}>
        <Link href="/dashboard/campaigns" style={{fontSize:13,color:C.txs,
          textDecoration:"none",display:"inline-flex",alignItems:"center",gap:4,marginBottom:8}}>
          ← Campaigns
        </Link>
        <div style={{display:"flex",justifyContent:"space-between",
          alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
          <div>
            <h1 style={{fontSize:18,fontWeight:800,lineHeight:1.3}}>{camp.name}</h1>
            <p style={{fontSize:12,color:C.txs,marginTop:2}}>
              {camp.templateName} · {relTime(camp.createdAt)}
            </p>
          </div>
          <button onClick={()=>downloadCSV(`${camp.name}_results.csv`,
            ["phone","name","status","wamid","error"],
            (camp.results||[]).map(r=>({phone:r.phone,name:r.name||"",
              status:r.status,wamid:r.wamid||"",error:r.error||""})))}
            style={{padding:"8px 14px",borderRadius:9,border:`1px solid ${C.border}`,
              background:"transparent",color:C.txs,fontSize:12,fontWeight:700,cursor:"pointer"}}>
            ⬇ Export
          </button>
        </div>
      </div>

      {/* Stats - 2x3 grid on mobile */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",
        gap:8,marginBottom:14}}>
        {[{l:"Total",  v:camp.totalContacts,c:C.txs},
          {l:"Sent",   v:camp.sent||0,       c:C.blue},
          {l:"Delivered",v:camp.delivered||0,c:C.teal},
          {l:"Read",   v:camp.read||0,       c:C.g1},
          {l:"Failed", v:camp.failed||0,     c:C.red},
          {l:"Status", v:<span style={{fontSize:10,fontWeight:800,
            color:sc(camp.status)}}>{camp.status?.toUpperCase()}</span>,c:C.txs},
        ].map(s=>(
          <div key={s.l} style={{background:C.card,border:`1px solid ${C.border}`,
            borderRadius:10,padding:"10px 8px",textAlign:"center"}}>
            <div style={{fontSize:18,fontWeight:800,color:s.c}}>{s.v}</div>
            <div style={{fontSize:10,color:C.txs,marginTop:2,fontWeight:600}}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Progress */}
      <div style={{background:C.card,border:`1px solid ${C.border}`,
        borderRadius:12,padding:14,marginBottom:14}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
          <span style={{fontWeight:700,fontSize:14}}>Progress</span>
          <span style={{fontWeight:800,color:C.g1,fontSize:18}}>{pct}%</span>
        </div>
        <div style={{height:10,borderRadius:5,overflow:"hidden",background:C.surf}}>
          <div style={{height:"100%",width:`${pct}%`,borderRadius:5,
            background:`linear-gradient(90deg,${C.g1},${C.teal})`,transition:"width .5s"}}/>
        </div>
      </div>

      {/* Results */}
      <div style={{background:C.card,border:`1px solid ${C.border}`,
        borderRadius:12,overflow:"hidden"}}>
        <div style={{padding:"12px 14px",borderBottom:`1px solid ${C.border}`,
          fontWeight:700,fontSize:14}}>
          Results — {(camp.results||[]).filter(r=>r.status!=="pending").length} / {camp.totalContacts}
        </div>
        <div style={{maxHeight:500,overflowY:"auto"}}>
          {(camp.results||[]).map((r,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",
              alignItems:"center",padding:"11px 14px",
              borderBottom:`1px solid ${C.border}50`,
              background:r.status==="failed"?"rgba(244,67,54,.04)":"rgba(37,211,102,.02)"}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:600,fontSize:13,overflow:"hidden",
                  textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.name||r.phone}</div>
                <div style={{fontSize:10,fontFamily:"'JetBrains Mono',monospace",
                  color:C.txs}}>{r.phone}</div>
              </div>
              <div style={{flexShrink:0,marginLeft:8,textAlign:"right"}}>
                <span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:20,
                  background:`${SCOLOR[r.status]||C.txs}18`,
                  color:SCOLOR[r.status]||C.txs}}>
                  {r.status}
                </span>
                {r.error&&<div style={{fontSize:10,color:C.red,marginTop:2}}>{r.error}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
