"use client";
import Link                         from "next/link";
import { usePathname, useRouter }   from "next/navigation";
import { useState, useEffect }      from "react";

const NAV = [
  {href:"/dashboard",           icon:"📊",label:"Dashboard"},
  {href:"/dashboard/bulk",      icon:"📤",label:"Bulk Send"},
  {href:"/dashboard/contacts",  icon:"👥",label:"Contacts"},
  {href:"/dashboard/templates", icon:"📋",label:"Templates"},
  {href:"/dashboard/campaigns", icon:"📡",label:"Campaigns"},
  {href:"/dashboard/media",     icon:"🖼", label:"Media"},
  {href:"/dashboard/settings",  icon:"⚙️", label:"Settings"},
];

const S = {
  wrap:  {display:"flex",height:"100vh",overflow:"hidden",background:"#07090f"},
  side:  (w)=>({width:w,flexShrink:0,background:"#0d1117",borderRight:"1px solid #1c2a3f",display:"flex",flexDirection:"column",transition:"width .2s"}),
  logo:  {display:"flex",alignItems:"center",gap:10,padding:"15px 12px",borderBottom:"1px solid #1c2a3f"},
  icon:  {width:32,height:32,borderRadius:9,flexShrink:0,background:"linear-gradient(135deg,#25d366,#00c9d4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16},
  nav:   {flex:1,padding:"10px 8px",display:"flex",flexDirection:"column",gap:1},
  foot:  {padding:"10px 8px 16px",borderTop:"1px solid #1c2a3f"},
  live:  {display:"flex",alignItems:"center",gap:6,padding:"8px 10px",marginBottom:8,borderRadius:8,background:"rgba(37,211,102,.06)",border:"1px solid rgba(37,211,102,.2)"},
  dot:   {width:7,height:7,borderRadius:"50%",background:"#25d366",display:"inline-block",animation:"pdot 1.5s ease infinite"},
  main:  {flex:1,overflow:"auto"},
  spin:  {minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#07090f"},
};

export default function Layout({ children }) {
  const path   = usePathname();
  const router = useRouter();
  const [ok,   setOk]   = useState(false);
  const [col,  setCol]  = useState(false);

  useEffect(() => {
    if (localStorage.getItem("crm_auth")) { setOk(true); }
    else { router.replace("/login"); }
  }, []);

  if (!ok) return (
    <div style={S.spin}>
      <div style={{width:32,height:32,border:"3px solid #1c2a3f",borderTopColor:"#25d366",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={S.wrap}>
      <aside style={S.side(col?60:220)}>
        <div style={S.logo}>
          <div style={S.icon}>🕉</div>
          {!col && <div style={{minWidth:0,flex:1}}>
            <div style={{fontWeight:800,fontSize:13,color:"#e8edf5",lineHeight:1.2}}>Flaxxa WAPI</div>
            <div style={{fontSize:10,color:"#445566"}}>HKM Vizag CRM</div>
          </div>}
          <button onClick={()=>setCol(c=>!c)}
            style={{background:"none",border:"none",color:"#445566",fontSize:18,cursor:"pointer",flexShrink:0}}>
            {col?"›":"‹"}
          </button>
        </div>
        <nav style={S.nav}>
          {NAV.map(n=>{
            const a = path===n.href||(n.href!=="/dashboard"&&path.startsWith(n.href));
            return (
              <Link key={n.href} href={n.href} style={{
                display:"flex",alignItems:"center",gap:col?0:10,
                justifyContent:col?"center":"flex-start",
                padding:col?"10px 8px":"10px 12px",
                borderRadius:8,textDecoration:"none",transition:"all .15s",
                background:a?"rgba(37,211,102,.08)":"transparent",
                color:a?"#25d366":"#8899b0",fontWeight:a?700:500,fontSize:14,
                borderLeft:`3px solid ${a?"#25d366":"transparent"}`,
              }}>
                <span style={{fontSize:16,flexShrink:0}}>{n.icon}</span>
                {!col && <span style={{whiteSpace:"nowrap"}}>{n.label}</span>}
              </Link>
            );
          })}
        </nav>
        <div style={S.foot}>
          {!col && <div style={S.live}>
            <span style={S.dot}/><span style={{fontSize:10,fontWeight:800,color:"#25d366"}}>LIVE</span>
          </div>}
          <button onClick={()=>{localStorage.removeItem("crm_auth");router.replace("/login");}}
            style={{width:"100%",padding:col?"8px 4px":"7px 10px",borderRadius:7,
              border:"1px solid #1c2a3f",background:"transparent",color:"#445566",
              fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>
            {col?"↩":"↩ Logout"}
          </button>
        </div>
      </aside>
      <main style={S.main}>{children}</main>
    </div>
  );
}
