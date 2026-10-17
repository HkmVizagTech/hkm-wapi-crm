"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, Send, Radio, CheckCheck, FileText, Image as ImageIcon, MessageSquare, ArrowRight,
         Sparkles, Flower2 } from "lucide-react";
import { PageHeader, StatCard, Card, Badge, EmptyState } from "@/components/ui";

const STATUS_TONE = { done:"green", running:"amber", queued:"blue", scheduled:"purple", stopped:"red" };

const ACTIONS = [
  { href:"/dashboard/inbox",     Icon:MessageSquare, label:"Open inbox",   desc:"Reply to devotees",     c:"#25d366" },
  { href:"/dashboard/bulk",      Icon:Send,          label:"Bulk send",    desc:"Upload a CSV",          c:"#00c9d4" },
  { href:"/dashboard/contacts",  Icon:Users,         label:"Contacts",     desc:"Manage the list",       c:"#4f8cff" },
  { href:"/dashboard/templates", Icon:FileText,      label:"Templates",    desc:"Create & review",       c:"#a06bff" },
  { href:"/dashboard/media",     Icon:ImageIcon,     label:"Media",        desc:"Images & PDFs",         c:"#ffb300" },
];

export default function Dashboard() {
  const [stats,  setStats]  = useState({contacts:0,messages:0,campaigns:0,delivered:0});
  const [camps,  setCamps]  = useState([]);
  const [loading,setLoading]= useState(true);

  useEffect(()=>{
    Promise.all([
      fetch("/api/campaigns").then(r=>r.json()).catch(()=>({campaigns:[]})),
      fetch("/api/contacts?limit=1").then(r=>r.json()).catch(()=>({total:0})),
      fetch("/api/messages/stats").then(r=>r.json()).catch(()=>({total:0,delivered:0})),
    ]).then(([c,co,m])=>{
      setCamps(c.campaigns||[]);
      setStats({contacts:co.total||0,campaigns:c.campaigns?.length||0,
        messages:m.total||0,delivered:(m.delivered||0)+(m.read||0)});
      setLoading(false);
    });
  },[]);

  const n = v => Number(v||0).toLocaleString("en-IN");

  return (
    <div className="page-wrap">
      <PageHeader icon={Flower2} title="Hare Krishna" subtitle="Overview of your WhatsApp outreach"
        actions={<Link href="/dashboard/bulk" className="ui-btn primary"><Send size={15}/>New campaign</Link>}/>

      <div className="stat-grid">
        <StatCard icon={Users}      label="Contacts"  value={n(stats.contacts)}  color="#25d366" loading={loading}/>
        <StatCard icon={Send}       label="Messages"  value={n(stats.messages)}  color="#00c9d4" loading={loading}/>
        <StatCard icon={Radio}      label="Campaigns" value={n(stats.campaigns)} color="#4f8cff" loading={loading}/>
        <StatCard icon={CheckCheck} label="Delivered" value={n(stats.delivered)} color="#ffb300" loading={loading}/>
      </div>

      <div className="dash-two">
        <Card title="Quick actions" icon={Sparkles}>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {ACTIONS.map(({href,Icon,label,desc,c})=>(
              <Link key={href} href={href} className="card-hover" style={{display:"flex",alignItems:"center",gap:12,padding:"11px 12px",
                borderRadius:11,border:"1px solid var(--line)",textDecoration:"none",background:"var(--panel)"}}>
                <div style={{width:34,height:34,borderRadius:9,background:`${c}1f`,color:c,display:"flex",
                  alignItems:"center",justifyContent:"center"}}><Icon size={17}/></div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:13.5,color:"var(--tx)"}}>{label}</div>
                  <div style={{fontSize:11.5,color:"var(--tx2)"}}>{desc}</div>
                </div>
                <ArrowRight size={15} color="var(--tx3)"/>
              </Link>
            ))}
          </div>
        </Card>

        <Card title="Recent campaigns" icon={Radio}
          actions={<Link href="/dashboard/campaigns" style={{fontSize:12,color:"var(--brand)",textDecoration:"none",
            display:"flex",alignItems:"center",gap:4}}>View all<ArrowRight size={13}/></Link>}>
          {loading ? (
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {[0,1,2,3].map(i=><div key={i} className="skeleton" style={{height:46}}/>)}
            </div>
          ) : camps.length===0 ? (
            <EmptyState icon={Radio} title="No campaigns yet" hint="Send your first bulk message to see it here"
              action={<Link href="/dashboard/bulk" className="ui-btn primary sm"><Send size={13}/>Start bulk send</Link>}/>
          ) : camps.slice(0,6).map(c=>{
            const pct = c.totalContacts ? Math.round((c.sent/c.totalContacts)*100) : 0;
            return (
              <Link key={c._id} href={`/dashboard/campaigns/${c._id}`} style={{display:"block",padding:"11px 4px",
                textDecoration:"none",borderBottom:"1px solid rgba(28,42,63,.6)"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}>
                  <div style={{minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:13.5,color:"var(--tx)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</div>
                    <div style={{fontSize:11.5,color:"var(--tx2)",marginTop:1}}>{c.templateName} · {n(c.sent)}/{n(c.totalContacts)} sent</div>
                  </div>
                  <Badge tone={STATUS_TONE[c.status]||""}>{c.status}</Badge>
                </div>
                <div style={{height:4,borderRadius:4,background:"var(--card2)",marginTop:9,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${pct}%`,background:"linear-gradient(90deg,var(--brand),var(--teal))",borderRadius:4}}/>
                </div>
              </Link>
            );
          })}
        </Card>
      </div>
    </div>
  );
}
