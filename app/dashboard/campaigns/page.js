"use client";
import { useState, useEffect } from "react";
import { relTime, downloadCSV } from "@/lib/utils";
import Link from "next/link";

const C={g1:"#25d366",teal:"#00c9d4",blue:"#2979ff",red:"#f44336",amber:"#ffb300",
  card:"#111827",surf:"#0d1117",border:"#1c2a3f",tx:"#e8edf5",txs:"#8899b0",txd:"#445566"};

const sc = s => ({done:C.g1,running:C.amber,queued:C.blue,scheduled:C.purple||"#9c27b0",stopped:C.red})[s]||C.txs;

function MetricBar({ sent, delivered, read, failed, total }) {
  if (!total) return null;
  const pctSent      = Math.round((sent/total)*100);
  const pctDelivered = Math.round((delivered/total)*100);
  const pctRead      = Math.round((read/total)*100);
  const pctFailed    = Math.round((failed/total)*100);
  return (
    <div style={{width:"100%"}}>
      {/* Stacked bar */}
      <div style={{display:"flex",height:6,borderRadius:3,overflow:"hidden",
        background:C.surf,marginBottom:5,gap:1}}>
        {pctRead>0&&<div style={{width:`${pctRead}%`,background:C.g1,transition:"width .5s"}}/>}
        {pctDelivered>0&&<div style={{width:`${pctDelivered}%`,background:C.teal,transition:"width .5s"}}/>}
        {(pctSent-pctDelivered-pctRead)>0&&<div style={{width:`${pctSent-pctDelivered-pctRead}%`,background:C.blue,transition:"width .5s"}}/>}
        {pctFailed>0&&<div style={{width:`${pctFailed}%`,background:C.red,transition:"width .5s"}}/>}
      </div>
      {/* Legend */}
      <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
        {[
          {label:"Sent",      val:sent,      color:C.blue,  show:sent>0},
          {label:"Delivered", val:delivered, color:C.teal,  show:delivered>0},
          {label:"Read",      val:read,      color:C.g1,    show:read>0},
          {label:"Failed",    val:failed,    color:C.red,   show:failed>0},
        ].filter(m=>m.show).map(m=>(
          <span key={m.label} style={{fontSize:10,color:m.color,fontWeight:700,
            display:"flex",alignItems:"center",gap:3}}>
            <span style={{width:6,height:6,borderRadius:"50%",background:m.color}}/>
            {m.label}: {m.val}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState("ALL");
  const [search,    setSearch]    = useState("");

  const load = () => {
    setLoading(true);
    fetch("/api/campaigns").then(r=>r.json()).then(d=>{
      setCampaigns(d.campaigns||[]);
      setLoading(false);
    });
  };

  useEffect(()=>{ load(); }, []);

  const statuses = ["ALL","done","running","scheduled","stopped"];
  const filtered = campaigns.filter(c=>
    (filter==="ALL"||c.status===filter) &&
    (!search||c.name?.toLowerCase().includes(search.toLowerCase())||
              c.templateName?.toLowerCase().includes(search.toLowerCase()))
  );

  // Summary stats
  const totalSent      = campaigns.reduce((a,c)=>a+(c.sent||0),0);
  const totalDelivered = campaigns.reduce((a,c)=>a+(c.delivered||0),0);
  const totalRead      = campaigns.reduce((a,c)=>a+(c.read||0),0);
  const totalFailed    = campaigns.reduce((a,c)=>a+(c.failed||0),0);

  return (
    <div style={{padding:24}}>
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div>
          <h1 style={{fontSize:20,fontWeight:800}}>📡 Campaigns</h1>
          <p style={{fontSize:13,color:C.txs,marginTop:2}}>{campaigns.length} total campaigns</p>
        </div>
        <div style={{display:"flex",gap:10}}>
          <button onClick={load} style={{padding:"8px 14px",borderRadius:9,
            border:`1px solid ${C.border}`,background:"transparent",
            color:C.txs,fontSize:13,fontWeight:700,cursor:"pointer"}}>
            ↻ Refresh
          </button>
          <Link href="/dashboard/bulk" style={{padding:"9px 18px",borderRadius:9,
            textDecoration:"none",background:`linear-gradient(135deg,${C.g1},#1aad52)`,
            color:"#000",fontWeight:700,fontSize:13}}>
            + New Bulk Send
          </Link>
        </div>
      </div>

      {/* Summary stats */}
      {!loading&&campaigns.length>0&&(
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
          {[
            {l:"Total Sent",      v:totalSent,      c:C.blue,  i:"📤"},
            {l:"Delivered",       v:totalDelivered, c:C.teal,  i:"✓✓"},
            {l:"Read",            v:totalRead,      c:C.g1,    i:"👁"},
            {l:"Failed",          v:totalFailed,    c:C.red,   i:"✕"},
          ].map(s=>(
            <div key={s.l} style={{background:C.card,border:`1px solid ${C.border}`,
              borderRadius:10,padding:"14px 16px",borderTop:`3px solid ${s.c}`,
              display:"flex",alignItems:"center",gap:12}}>
              <div style={{fontSize:22}}>{s.i}</div>
              <div>
                <div style={{fontSize:22,fontWeight:800,color:s.c}}>{s.v}</div>
                <div style={{fontSize:11,color:C.txs,fontWeight:600}}>{s.l}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap"}}>
        <input style={{flex:1,minWidth:180,background:C.surf,border:`1px solid ${C.border}`,
          borderRadius:10,padding:"8px 13px",color:C.tx,fontSize:13,outline:"none"}}
          placeholder="🔍 Search campaigns…"
          value={search} onChange={e=>setSearch(e.target.value)}/>
        <div style={{display:"flex",gap:3,background:C.surf,borderRadius:10,
          padding:3,border:`1px solid ${C.border}`}}>
          {statuses.map(s=>(
            <button key={s} onClick={()=>setFilter(s)} style={{
              padding:"6px 12px",borderRadius:7,border:"none",cursor:"pointer",
              background:filter===s?C.g1:"transparent",
              color:filter===s?"#000":C.txs,fontSize:12,fontWeight:700}}>
              {s==="ALL"?"All":s.charAt(0).toUpperCase()+s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p style={{color:C.txd,textAlign:"center",padding:40}}>Loading…</p>
      ) : filtered.length===0 ? (
        <div style={{textAlign:"center",padding:60,color:C.txd}}>
          <div style={{fontSize:36,marginBottom:10}}>📡</div>
          <p style={{color:C.txs,fontWeight:600}}>
            {campaigns.length===0?"No campaigns yet":"No campaigns match"}
          </p>
          {campaigns.length===0&&(
            <Link href="/dashboard/bulk" style={{color:C.g1,fontSize:13}}>
              Start your first bulk send →
            </Link>
          )}
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {filtered.map(c=>{
            const deliveryRate = c.sent>0
              ? Math.round(((c.delivered||0)+(c.read||0))/c.sent*100)
              : 0;
            return (
              <div key={c._id} style={{background:C.card,border:`1px solid ${C.border}`,
                borderRadius:12,padding:18,transition:"border-color .15s"}}
                onMouseOver={e=>e.currentTarget.style.borderColor=`${C.g1}40`}
                onMouseOut={e=>e.currentTarget.style.borderColor=C.border}>

                <div style={{display:"flex",justifyContent:"space-between",
                  alignItems:"flex-start",marginBottom:14}}>
                  {/* Left: name + template */}
                  <div style={{flex:1,minWidth:0,paddingRight:16}}>
                    <Link href={`/dashboard/campaigns/${c._id}`} style={{
                      fontWeight:800,fontSize:15,color:C.tx,textDecoration:"none",
                      display:"block",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}
                      onMouseOver={e=>e.target.style.color=C.g1}
                      onMouseOut={e=>e.target.style.color=C.tx}>
                      {c.name}
                    </Link>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginTop:4}}>
                      <span style={{fontSize:11,fontFamily:"'JetBrains Mono',monospace",
                        color:C.txs,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                        {c.templateName}
                      </span>
                      <span style={{fontSize:10,color:C.txd,flexShrink:0}}>
                        {relTime(c.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Right: status + delivery rate */}
                  <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6,flexShrink:0}}>
                    <span style={{fontSize:11,fontWeight:800,padding:"2px 10px",borderRadius:20,
                      background:`${sc(c.status)}18`,color:sc(c.status)}}>
                      {c.status?.toUpperCase()}
                    </span>
                    {c.sent>0&&(
                      <span style={{fontSize:11,fontWeight:700,color:C.txs}}>
                        {deliveryRate}% delivered
                      </span>
                    )}
                  </div>
                </div>

                {/* Metrics row */}
                <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",
                  gap:8,marginBottom:12}}>
                  {[
                    {l:"Total",     v:c.totalContacts, c:C.txs},
                    {l:"Sent",      v:c.sent||0,        c:C.blue},
                    {l:"Delivered", v:c.delivered||0,   c:C.teal},
                    {l:"Read",      v:c.read||0,        c:C.g1},
                    {l:"Failed",    v:c.failed||0,      c:C.red},
                  ].map(m=>(
                    <div key={m.l} style={{background:C.surf,borderRadius:8,
                      padding:"8px 10px",textAlign:"center",
                      border:`1px solid ${C.border}`}}>
                      <div style={{fontSize:16,fontWeight:800,color:m.c}}>{m.v}</div>
                      <div style={{fontSize:10,color:C.txs,marginTop:2,fontWeight:600}}>{m.l}</div>
                    </div>
                  ))}
                </div>

                {/* Stacked progress bar */}
                <MetricBar
                  sent={c.sent||0}
                  delivered={c.delivered||0}
                  read={c.read||0}
                  failed={c.failed||0}
                  total={c.totalContacts||0}
                />

                {/* Footer: View details */}
                <div style={{marginTop:10,display:"flex",justifyContent:"flex-end"}}>
                  <Link href={`/dashboard/campaigns/${c._id}`} style={{
                    fontSize:12,color:C.g1,textDecoration:"none",fontWeight:600}}>
                    View Details →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
