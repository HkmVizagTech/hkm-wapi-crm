"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

const C={g1:"#25d366",teal:"#00c9d4",blue:"#2979ff",amber:"#ffb300",
  card:"#111827",surf:"#0d1117",border:"#1c2a3f",tx:"#e8edf5",txs:"#8899b0",txd:"#445566"};

export default function Dashboard() {
  const [stats,  setStats]  = useState({contacts:0,messages:0,campaigns:0,delivered:0});
  const [camps,  setCamps]  = useState([]);
  const [loading,setLoading]= useState(true);

  useEffect(()=>{
    Promise.all([
      fetch("/api/campaigns").then(r=>r.json()).catch(()=>({campaigns:[]})),
      fetch("/api/contacts").then(r=>r.json()).catch(()=>({contacts:[]})),
      fetch("/api/messages/stats").then(r=>r.json()).catch(()=>({total:0,delivered:0})),
    ]).then(([c,co,m])=>{
      setCamps(c.campaigns||[]);
      setStats({contacts:co.contacts?.length||0,campaigns:c.campaigns?.length||0,
        messages:m.total||0,delivered:(m.delivered||0)+(m.read||0)});
      setLoading(false);
    });
  },[]);

  const sc=s=>({done:C.g1,running:C.amber,queued:C.blue,stopped:"#f44336"})[s]||C.txs;

  return (
    <div style={{padding:"16px"}}>
      <h1 style={{fontSize:18,fontWeight:800,marginBottom:2}}>🕉 Hare Krishna!</h1>
      <p style={{fontSize:12,color:C.txs,marginBottom:16}}>HKM Vizag — WhatsApp CRM</p>

      {/* Stats grid — 2x2 on mobile, 4x1 on desktop */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
        {[{l:"Contacts",v:stats.contacts,c:C.g1,i:"👥"},
          {l:"Messages",v:stats.messages,c:C.teal,i:"📤"},
          {l:"Campaigns",v:stats.campaigns,c:C.blue,i:"📡"},
          {l:"Delivered",v:stats.delivered,c:C.amber,i:"✓✓"}].map(s=>(
          <div key={s.l} style={{background:C.card,border:`1px solid ${C.border}`,
            borderRadius:12,padding:"14px 16px",
            borderTop:`3px solid ${s.c}`}}>
            <div style={{fontSize:20,marginBottom:6}}>{s.i}</div>
            <div style={{fontSize:24,fontWeight:800,color:s.c}}>{loading?"…":s.v}</div>
            <div style={{fontSize:11,color:C.txs,marginTop:2,fontWeight:600}}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div style={{background:C.card,border:`1px solid ${C.border}`,
        borderRadius:12,padding:16,marginBottom:16}}>
        <div style={{fontWeight:700,fontSize:14,marginBottom:12}}>Quick Actions</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {[{href:"/dashboard/bulk",     icon:"📤",label:"Bulk Send",   desc:"Upload CSV"},
            {href:"/dashboard/contacts", icon:"👥",label:"Contacts",    desc:"Manage list"},
            {href:"/dashboard/templates",icon:"📋",label:"Templates",   desc:"19 templates"},
            {href:"/dashboard/media",    icon:"🖼", label:"Media",       desc:"Images & PDFs"},
          ].map(a=>(
            <Link key={a.href} href={a.href} style={{
              padding:12,borderRadius:10,border:`1px solid ${C.border}`,
              textDecoration:"none",display:"block",background:C.surf}}>
              <div style={{fontSize:20,marginBottom:4}}>{a.icon}</div>
              <div style={{fontWeight:700,fontSize:13,color:C.tx}}>{a.label}</div>
              <div style={{fontSize:11,color:C.txs,marginTop:1}}>{a.desc}</div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent campaigns */}
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:16}}>
        <div style={{fontWeight:700,fontSize:14,marginBottom:12,
          display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span>Recent Campaigns</span>
          <Link href="/dashboard/campaigns" style={{fontSize:12,color:C.g1,textDecoration:"none"}}>
            View all →
          </Link>
        </div>
        {loading?<p style={{color:C.txd,fontSize:13}}>Loading…</p>
        :camps.length===0?(
          <div style={{textAlign:"center",padding:"16px 0",color:C.txd}}>
            <p style={{fontSize:13}}>No campaigns yet</p>
            <Link href="/dashboard/bulk" style={{color:C.g1,fontSize:12}}>Start bulk send →</Link>
          </div>
        ):camps.slice(0,5).map(c=>(
          <Link key={c._id} href={`/dashboard/campaigns/${c._id}`} style={{
            display:"flex",justifyContent:"space-between",alignItems:"center",
            padding:"10px 8px",borderRadius:8,textDecoration:"none",
            marginBottom:4,borderBottom:`1px solid ${C.border}50`}}>
            <div style={{minWidth:0,flex:1}}>
              <div style={{fontWeight:600,fontSize:13,color:C.tx,overflow:"hidden",
                textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</div>
              <div style={{fontSize:11,color:C.txs,overflow:"hidden",
                textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.templateName}</div>
            </div>
            <div style={{textAlign:"right",flexShrink:0,marginLeft:10}}>
              <div style={{fontSize:13,fontWeight:800,color:C.g1}}>{c.sent}/{c.totalContacts}</div>
              <div style={{fontSize:10,fontWeight:800,color:sc(c.status)}}>{c.status?.toUpperCase()}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
