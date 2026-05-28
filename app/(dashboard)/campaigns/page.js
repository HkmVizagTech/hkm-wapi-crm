"use client";
import { useState, useEffect } from "react";
import { relTime } from "@/lib/utils";
import Link from "next/link";

const C={g1:"#25d366",teal:"#00c9d4",blue:"#2979ff",red:"#f44336",amber:"#ffb300",
  card:"#111827",border:"#1c2a3f",txs:"#8899b0",txd:"#445566"};
const sc=s=>({done:C.g1,running:C.amber,queued:C.blue,stopped:C.red})[s]||C.txs;

export default function Campaigns() {
  const [campaigns,setCampaigns]=useState([]);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    fetch("/api/campaigns").then(r=>r.json()).then(d=>{
      setCampaigns(d.campaigns||[]);setLoading(false);
    });
  },[]);

  return (
    <div style={{padding:24}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div>
          <h1 style={{fontSize:20,fontWeight:800}}>📡 Campaigns</h1>
          <p style={{fontSize:13,color:C.txs,marginTop:2}}>{campaigns.length} campaigns total</p>
        </div>
        <Link href="/dashboard/bulk" style={{padding:"9px 18px",borderRadius:9,textDecoration:"none",
          background:`linear-gradient(135deg,${C.g1},#1aad52)`,color:"#000",fontWeight:700,fontSize:13}}>
          + New Bulk Send
        </Link>
      </div>
      {loading?<p style={{color:C.txd,textAlign:"center",padding:40}}>Loading…</p>:(
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead><tr>
              {["Campaign","Template","Total","Sent","Failed","Status","Created"].map(h=>(
                <th key={h} style={{padding:"10px 14px",textAlign:"left",fontSize:11,fontWeight:700,
                  textTransform:"uppercase",letterSpacing:".5px",color:C.txs,
                  borderBottom:`1px solid ${C.border}`}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {campaigns.length===0?(
                <tr><td colSpan={7} style={{padding:"40px",textAlign:"center",color:C.txd}}>
                  No campaigns yet. <Link href="/dashboard/bulk" style={{color:C.g1}}>Start a bulk send →</Link>
                </td></tr>
              ):campaigns.map(c=>(
                <tr key={c._id} style={{borderBottom:`1px solid ${C.border}50`}}>
                  <td style={{padding:"12px 14px"}}>
                    <Link href={`/dashboard/campaigns/${c._id}`}
                      style={{fontWeight:600,color:"#e8edf5",textDecoration:"none"}}
                      onMouseOver={e=>e.target.style.color=C.g1}
                      onMouseOut={e=>e.target.style.color="#e8edf5"}>
                      {c.name}
                    </Link>
                  </td>
                  <td style={{padding:"12px 14px",fontSize:11,fontFamily:"'JetBrains Mono',monospace",color:C.txs}}>{c.templateName}</td>
                  <td style={{padding:"12px 14px",fontWeight:700}}>{c.totalContacts}</td>
                  <td style={{padding:"12px 14px",fontWeight:800,color:C.g1}}>{c.sent}</td>
                  <td style={{padding:"12px 14px",fontWeight:700,color:c.failed>0?C.red:C.txd}}>{c.failed}</td>
                  <td style={{padding:"12px 14px"}}>
                    <span style={{fontSize:11,fontWeight:800,padding:"2px 9px",borderRadius:20,
                      background:`${sc(c.status)}18`,color:sc(c.status)}}>
                      {c.status?.toUpperCase()}
                    </span>
                  </td>
                  <td style={{padding:"12px 14px",fontSize:12,color:C.txd}}>{relTime(c.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
