"use client";
import { useEffect, useState } from "react";

const C = {g1:"#25d366",teal:"#00c9d4",blue:"#2979ff",card:"#111827",border:"#1c2a3f",txs:"#8899b0",txd:"#445566"};
const card = (t) => ({background:C.card,border:`1px solid ${C.border}`,borderRadius:12,borderTop:`3px solid ${t}`});

export default function Dashboard() {
  const [stats, setStats]   = useState({contacts:0,messages:0,campaigns:0,delivered:0});
  const [camps, setCamps]   = useState([]);
  const [load,  setLoad]    = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/campaigns").then(r=>r.json()).catch(()=>({campaigns:[]})),
      fetch("/api/contacts").then(r=>r.json()).catch(()=>({contacts:[]})),
      fetch("/api/messages/stats").then(r=>r.json()).catch(()=>({total:0,delivered:0})),
    ]).then(([c,co,m]) => {
      setCamps(c.campaigns||[]);
      setStats({ contacts:co.contacts?.length||0, campaigns:c.campaigns?.length||0,
        messages:m.total||0, delivered:(m.delivered||0)+(m.read||0) });
      setLoad(false);
    });
  }, []);

  const sc = s => ({done:C.g1,running:"#ffb300",queued:C.blue,stopped:"#f44336"})[s]||C.txs;

  return (
    <div style={{padding:24}}>
      <h1 style={{fontSize:22,fontWeight:800,marginBottom:4}}>🕉 Hare Krishna!</h1>
      <p style={{color:C.txs,fontSize:13,marginBottom:22}}>HKM Vizag — WhatsApp CRM Dashboard</p>

      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:22}}>
        {[{l:"Contacts",v:stats.contacts,c:C.g1,i:"👥"},
          {l:"Messages Sent",v:stats.messages,c:C.teal,i:"📤"},
          {l:"Campaigns",v:stats.campaigns,c:C.blue,i:"📡"},
          {l:"Delivered",v:stats.delivered,c:"#ffb300",i:"✓✓"}].map(s=>(
          <div key={s.l} style={{...card(s.c),padding:18,textAlign:"center"}}>
            <div style={{fontSize:22,marginBottom:6}}>{s.i}</div>
            <div style={{fontSize:26,fontWeight:800,color:s.c}}>{load?"…":s.v}</div>
            <div style={{fontSize:11,color:C.txs,marginTop:3,fontWeight:600}}>{s.l}</div>
          </div>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <div style={{...card(C.g1),padding:20}}>
          <div style={{fontWeight:800,fontSize:15,marginBottom:14}}>Recent Campaigns</div>
          {load ? <p style={{color:C.txd,fontSize:13}}>Loading…</p>
          : camps.length===0 ? (
            <div style={{textAlign:"center",padding:"20px 0",color:C.txd}}>
              <div style={{fontSize:28,marginBottom:6}}>📡</div>
              <p style={{fontSize:13}}>No campaigns yet</p>
              <a href="/dashboard/bulk" style={{color:C.g1,fontSize:12}}>Start bulk send →</a>
            </div>
          ) : camps.slice(0,6).map(c=>(
            <a key={c._id} href={`/dashboard/campaigns/${c._id}`} style={{
              display:"flex",justifyContent:"space-between",alignItems:"center",
              padding:"10px 10px",borderRadius:8,textDecoration:"none",
              marginBottom:4,transition:"background .15s"}}
              onMouseOver={e=>e.currentTarget.style.background="rgba(255,255,255,.04)"}
              onMouseOut={e=>e.currentTarget.style.background="transparent"}>
              <div style={{minWidth:0,flex:1}}>
                <div style={{fontWeight:600,fontSize:13,color:"#e8edf5",
                  overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</div>
                <div style={{fontSize:11,color:C.txs,overflow:"hidden",
                  textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.templateName}</div>
              </div>
              <div style={{textAlign:"right",flexShrink:0,marginLeft:10}}>
                <div style={{fontSize:13,fontWeight:800,color:C.g1}}>{c.sent}/{c.totalContacts}</div>
                <div style={{fontSize:10,fontWeight:800,color:sc(c.status)}}>{c.status?.toUpperCase()}</div>
              </div>
            </a>
          ))}
        </div>

        <div style={{...card(C.blue),padding:20}}>
          <div style={{fontWeight:800,fontSize:15,marginBottom:14}}>Quick Actions</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {[{href:"/dashboard/bulk",      icon:"📤",label:"Bulk Send",   desc:"Upload CSV"},
              {href:"/dashboard/contacts",  icon:"👥",label:"Contacts",    desc:"Manage list"},
              {href:"/dashboard/templates", icon:"📋",label:"Templates",   desc:"19 templates"},
              {href:"/dashboard/media",     icon:"🖼", label:"Media",       desc:"Images & PDFs"},
            ].map(a=>(
              <a key={a.href} href={a.href} style={{
                padding:14,borderRadius:10,border:`1px solid ${C.border}`,
                textDecoration:"none",display:"block",transition:"all .15s",
                background:"#0d1117"}}
                onMouseOver={e=>{e.currentTarget.style.borderColor=C.g1+"66";e.currentTarget.style.background="rgba(37,211,102,.04)";}}
                onMouseOut={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.background="#0d1117";}}>
                <div style={{fontSize:22,marginBottom:6}}>{a.icon}</div>
                <div style={{fontWeight:700,fontSize:13,color:"#e8edf5"}}>{a.label}</div>
                <div style={{fontSize:11,color:C.txs,marginTop:2}}>{a.desc}</div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
