"use client";
import { useState, useEffect } from "react";
import { relTime } from "@/lib/utils";
import Link from "next/link";

const C={g1:"#25d366",teal:"#00c9d4",blue:"#2979ff",red:"#f44336",amber:"#ffb300",
  card:"#111827",surf:"#0d1117",border:"#1c2a3f",tx:"#e8edf5",txs:"#8899b0",txd:"#445566"};
const sc=s=>({done:C.g1,running:C.amber,queued:C.blue,scheduled:"#9c27b0",stopped:C.red})[s]||C.txs;

export default function Campaigns() {
  const [campaigns,  setCampaigns]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [filter,     setFilter]     = useState("ALL");
  const [recalcing,  setRecalcing]  = useState(false);

  const load = () => {
    setLoading(true);
    fetch("/api/campaigns").then(r=>r.json()).then(d=>{
      setCampaigns(d.campaigns||[]); setLoading(false);
    });
  };

  useEffect(()=>{ load(); },[]);

  const cancelCampaign = async (id) => {
    if (!confirm("Cancel this scheduled campaign?")) return;
    await fetch(`/api/campaigns/${id}`, { method:"DELETE" });
    load();
  };

  const recalculate = async () => {
    setRecalcing(true);
    await fetch("/api/campaigns/recalculate",{method:"POST"});
    load(); setRecalcing(false);
  };

  const statuses = ["ALL","done","running","scheduled","stopped"];
  const filtered = filter==="ALL" ? campaigns : campaigns.filter(c=>c.status===filter);

  const totalSent      = campaigns.reduce((a,c)=>a+(c.sent||0),0);
  const totalDelivered = campaigns.reduce((a,c)=>a+(c.delivered||0),0);
  const totalRead      = campaigns.reduce((a,c)=>a+(c.read||0),0);
  const totalFailed    = campaigns.reduce((a,c)=>a+(c.failed||0),0);

  return (
    <div style={{padding:16}}>
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",
        alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8}}>
        <div>
          <h1 style={{fontSize:18,fontWeight:800}}>📡 Campaigns</h1>
          <p style={{fontSize:12,color:C.txs}}>{campaigns.length} total</p>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <button onClick={recalculate} disabled={recalcing} style={{
            padding:"8px 12px",borderRadius:9,border:`1px solid ${C.border}`,
            background:"transparent",color:recalcing?C.txd:C.teal,
            fontSize:12,fontWeight:700,cursor:"pointer"}}>
            {recalcing?"⏳…":"⟳ Recalculate"}
          </button>
          <button onClick={load} style={{padding:"8px 12px",borderRadius:9,
            border:`1px solid ${C.border}`,background:"transparent",
            color:C.txs,fontSize:12,fontWeight:700,cursor:"pointer"}}>
            ↻ Refresh
          </button>
          <Link href="/dashboard/bulk" style={{padding:"8px 14px",borderRadius:9,
            textDecoration:"none",background:`linear-gradient(135deg,${C.g1},#1aad52)`,
            color:"#000",fontWeight:700,fontSize:12}}>
            + New
          </Link>
        </div>
      </div>

      {/* Summary stats */}
      {!loading&&campaigns.length>0&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",
          gap:8,marginBottom:16}}>
          {[{l:"Sent",v:totalSent,c:C.blue},{l:"Delivered",v:totalDelivered,c:C.teal},
            {l:"Read",v:totalRead,c:C.g1},{l:"Failed",v:totalFailed,c:C.red}].map(s=>(
            <div key={s.l} style={{background:C.card,border:`1px solid ${C.border}`,
              borderRadius:10,padding:"10px",textAlign:"center",
              borderTop:`3px solid ${s.c}`}}>
              <div style={{fontSize:18,fontWeight:800,color:s.c}}>{s.v}</div>
              <div style={{fontSize:10,color:C.txs,fontWeight:600}}>{s.l}</div>
            </div>
          ))}
        </div>
      )}

      {/* Status filter - scrollable on mobile */}
      <div style={{display:"flex",gap:4,overflowX:"auto",paddingBottom:4,marginBottom:14}}>
        {statuses.map(s=>(
          <button key={s} onClick={()=>setFilter(s)} style={{
            padding:"6px 14px",borderRadius:20,border:`1px solid ${C.border}`,
            background:filter===s?C.g1:"transparent",
            color:filter===s?"#000":C.txs,fontSize:12,fontWeight:700,
            cursor:"pointer",flexShrink:0,whiteSpace:"nowrap"}}>
            {s==="ALL"?"All":s.charAt(0).toUpperCase()+s.slice(1)}
            {s!=="ALL"&&<span style={{marginLeft:5,fontSize:11,opacity:.8}}>
              ({campaigns.filter(c=>c.status===s).length})
            </span>}
          </button>
        ))}
      </div>

      {/* Queued + Scheduled campaigns highlight */}
      {!loading && campaigns.filter(c=>["queued","scheduled"].includes(c.status)).length > 0 && (
        <div style={{background:"rgba(156,39,176,.08)",border:"1px solid rgba(156,39,176,.3)",
          borderRadius:12,padding:14,marginBottom:14}}>
          <div style={{fontWeight:700,fontSize:14,color:"#ce93d8",marginBottom:10}}>
            ⏰ Pending Campaigns ({campaigns.filter(c=>["queued","scheduled"].includes(c.status)).length})
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
                  {c.status==="queued" ? "⚡ Sending now (queued)" : ("📅 "+new Date(c.scheduledAt).toLocaleString("en-IN",
                    {day:"numeric",month:"short",year:"numeric",
                     hour:"2-digit",minute:"2-digit",hour12:true,
                     timeZone:"Asia/Kolkata"}))+" IST"}
                </div>
                <div style={{fontSize:11,color:C.txs}}>{c.totalContacts} contacts · {c.templateName}</div>
              </div>
              <button onClick={()=>cancelCampaign(c._id)}
                style={{padding:"6px 12px",borderRadius:8,border:"1px solid rgba(244,67,54,.4)",
                  background:"rgba(244,67,54,.1)",color:"#f44336",
                  fontSize:12,fontWeight:700,cursor:"pointer",flexShrink:0,marginLeft:10}}>
                ✕ Cancel
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Campaign cards */}
      {loading?(
        <p style={{color:C.txd,textAlign:"center",padding:40}}>Loading…</p>
      ):filtered.length===0?(
        <div style={{textAlign:"center",padding:40,color:C.txd}}>
          <div style={{fontSize:32,marginBottom:8}}>📡</div>
          <p style={{color:C.txs}}>{campaigns.length===0?"No campaigns yet":"No campaigns match"}</p>
          {campaigns.length===0&&(
            <Link href="/dashboard/bulk" style={{color:C.g1,fontSize:13}}>
              Start bulk send →
            </Link>
          )}
        </div>
      ):(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {filtered.map(c=>{
            const deliveryRate = c.sent>0
              ? Math.round(((c.delivered||0)+(c.read||0))/c.sent*100) : 0;
            const total = c.totalContacts||1;
            return (
              <div key={c._id} style={{background:C.card,border:`1px solid ${C.border}`,
                borderRadius:12,padding:14}}>
                {/* Top row */}
                <div style={{display:"flex",justifyContent:"space-between",
                  alignItems:"flex-start",marginBottom:10}}>
                  <div style={{flex:1,minWidth:0,paddingRight:8}}>
                    <Link href={`/dashboard/campaigns/${c._id}`} style={{
                      fontWeight:700,fontSize:14,color:C.tx,textDecoration:"none",
                      display:"block",overflow:"hidden",
                      textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                      {c.name}
                    </Link>
                    <div style={{fontSize:11,color:C.txs,marginTop:2,overflow:"hidden",
                      textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.templateName}</div>
                    <div style={{fontSize:10,color:C.txd,marginTop:1}}>{relTime(c.createdAt)}</div>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",
                    alignItems:"flex-end",gap:4,flexShrink:0}}>
                    <span style={{fontSize:10,fontWeight:800,padding:"2px 8px",
                      borderRadius:20,background:`${sc(c.status)}18`,color:sc(c.status)}}>
                      {c.status?.toUpperCase()}
                    </span>
                    {c.sent>0&&<span style={{fontSize:10,color:C.txs}}>{deliveryRate}% del.</span>}
                  </div>
                </div>

                {/* Metrics */}
                <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",
                  gap:6,marginBottom:10}}>
                  {[{l:"Total",v:c.totalContacts,c:C.txs},
                    {l:"Sent",v:c.sent||0,c:C.blue},
                    {l:"Del.",v:c.delivered||0,c:C.teal},
                    {l:"Read",v:c.read||0,c:C.g1},
                    {l:"Fail",v:c.failed||0,c:C.red}].map(m=>(
                    <div key={m.l} style={{background:C.surf,borderRadius:8,
                      padding:"8px 4px",textAlign:"center",border:`1px solid ${C.border}`}}>
                      <div style={{fontSize:15,fontWeight:800,color:m.c}}>{m.v}</div>
                      <div style={{fontSize:9,color:C.txs,marginTop:1,fontWeight:600}}>{m.l}</div>
                    </div>
                  ))}
                </div>

                {/* Progress bar */}
                <div style={{height:5,borderRadius:3,overflow:"hidden",
                  background:C.surf,display:"flex",gap:1,marginBottom:8}}>
                  {[{v:(c.read||0)/total,c:C.g1},
                    {v:(c.delivered||0)/total,c:C.teal},
                    {v:Math.max(0,((c.sent||0)-(c.delivered||0)-(c.read||0)))/total,c:C.blue},
                    {v:(c.failed||0)/total,c:C.red}].map((b,i)=>
                    b.v>0&&<div key={i} style={{width:`${b.v*100}%`,background:b.c,transition:"width .5s"}}/>
                  )}
                </div>

                <Link href={`/dashboard/campaigns/${c._id}`} style={{
                  fontSize:12,color:C.g1,textDecoration:"none",fontWeight:600}}>
                  View Details →
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
