"use client";
import Link                        from "next/link";
import { usePathname, useRouter }  from "next/navigation";
import { useState, useEffect }     from "react";

const NAV = [
  { href:"/dashboard",           icon:"📊", label:"Dashboard"  },
  { href:"/dashboard/inbox",     icon:"💬", label:"Inbox"      },
  { href:"/dashboard/bulk",      icon:"📤", label:"Bulk Send"  },
  { href:"/dashboard/contacts",  icon:"👥", label:"Contacts"   },
  { href:"/dashboard/templates", icon:"📋", label:"Templates"  },
  { href:"/dashboard/campaigns", icon:"📡", label:"Campaigns"  },
  { href:"/dashboard/media",     icon:"🖼",  label:"Media"      },
  { href:"/dashboard/settings",  icon:"⚙️",  label:"Settings"   },
];

export default function Layout({ children }) {
  const path   = usePathname();
  const router = useRouter();
  const [ok,      setOk]      = useState(false);
  const [mobile,  setMobile]  = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("crm_auth")) setOk(true);
    else router.replace("/login");
    const check = () => setMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const logout = () => { localStorage.removeItem("crm_auth"); router.replace("/login"); };

  if (!ok) return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",
      justifyContent:"center",background:"#07090f"}}>
      <div style={{width:32,height:32,border:"3px solid #1c2a3f",borderTopColor:"#25d366",
        borderRadius:"50%",animation:"spin .7s linear infinite"}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const isActive = (href) =>
    href === "/dashboard" ? path === href : path.startsWith(href);

  /* ── Mobile bottom nav ── */
  if (mobile) return (
    <div style={{display:"flex",flexDirection:"column",height:"100vh",
      height:"100dvh",overflow:"hidden",background:"#07090f"}}>
      {/* Top bar */}
      <div style={{background:"#0d1117",borderBottom:"1px solid #1c2a3f",
        padding:"10px 16px",flexShrink:0,display:"flex",
        alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:30,height:30,borderRadius:8,flexShrink:0,
            background:"linear-gradient(135deg,#25d366,#00c9d4)",
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>🕉</div>
          <div>
            <div style={{fontWeight:800,fontSize:13,color:"#e8edf5",lineHeight:1.1}}>Flaxxa WAPI</div>
            <div style={{fontSize:10,color:"#445566"}}>HKM Vizag CRM</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{width:7,height:7,borderRadius:"50%",background:"#25d366",
            display:"inline-block",animation:"pdot 1.5s ease infinite"}}/>
          <button onClick={logout} style={{background:"none",
            border:"1px solid #1c2a3f",borderRadius:6,
            color:"#445566",fontSize:11,padding:"4px 10px",cursor:"pointer"}}>
            ↩
          </button>
        </div>
      </div>

      {/* Page content */}
      <div style={{flex:1,overflow:"auto"}}>{children}</div>

      {/* Bottom nav */}
      <div style={{display:"flex",background:"#0d1117",
        borderTop:"1px solid #1c2a3f",flexShrink:0,
        paddingBottom:"env(safe-area-inset-bottom,0px)"}}>
        {NAV.slice(0,5).map(n => {
          const active = isActive(n.href);
          return (
            <Link key={n.href} href={n.href} style={{
              flex:1,padding:"8px 4px 6px",display:"flex",flexDirection:"column",
              alignItems:"center",gap:2,textDecoration:"none",
              color:active?"#25d366":"#8899b0",
              borderTop:`2px solid ${active?"#25d366":"transparent"}`,
              transition:"all .15s"}}>
              <span style={{fontSize:18,lineHeight:1}}>{n.icon}</span>
              <span style={{fontSize:9,fontWeight:active?700:500,whiteSpace:"nowrap"}}>{n.label}</span>
            </Link>
          );
        })}
        {/* More menu */}
        <button onClick={()=>setNavOpen(o=>!o)} style={{
          flex:1,padding:"8px 4px 6px",display:"flex",flexDirection:"column",
          alignItems:"center",gap:2,background:"none",border:"none",
          color:navOpen?"#25d366":"#8899b0",cursor:"pointer",
          borderTop:`2px solid ${navOpen?"#25d366":"transparent"}`}}>
          <span style={{fontSize:18,lineHeight:1}}>☰</span>
          <span style={{fontSize:9,fontWeight:500}}>More</span>
        </button>
      </div>

      {/* More drawer */}
      {navOpen && (
        <div style={{position:"fixed",inset:0,zIndex:50}}
          onClick={()=>setNavOpen(false)}>
          <div style={{position:"absolute",bottom:60,right:0,left:0,
            background:"#111827",borderTop:"1px solid #1c2a3f",
            padding:"8px 0"}}
            onClick={e=>e.stopPropagation()}>
            {NAV.slice(5).map(n=>{
              const active = isActive(n.href);
              return (
                <Link key={n.href} href={n.href}
                  onClick={()=>setNavOpen(false)}
                  style={{display:"flex",alignItems:"center",gap:12,
                    padding:"12px 20px",textDecoration:"none",
                    color:active?"#25d366":"#e8edf5",
                    background:active?"rgba(37,211,102,.08)":"transparent"}}>
                  <span style={{fontSize:20}}>{n.icon}</span>
                  <span style={{fontWeight:active?700:500,fontSize:15}}>{n.label}</span>
                </Link>
              );
            })}
            <div style={{padding:"12px 20px",borderTop:"1px solid #1c2a3f",marginTop:4}}>
              <button onClick={logout} style={{background:"none",border:"none",
                color:"#445566",fontSize:14,cursor:"pointer",padding:0}}>
                ↩ Logout
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pdot{0%,100%{opacity:1}50%{opacity:.3}}
      `}</style>
    </div>
  );

  /* ── Desktop sidebar ── */
  return (
    <div style={{display:"flex",height:"100vh",overflow:"hidden",background:"#07090f"}}>
      <aside style={{width:220,flexShrink:0,background:"#0d1117",
        borderRight:"1px solid #1c2a3f",display:"flex",flexDirection:"column"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,
          padding:"15px 14px",borderBottom:"1px solid #1c2a3f"}}>
          <div style={{width:32,height:32,borderRadius:9,flexShrink:0,
            background:"linear-gradient(135deg,#25d366,#00c9d4)",
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>🕉</div>
          <div>
            <div style={{fontWeight:800,fontSize:13,color:"#e8edf5"}}>Flaxxa WAPI</div>
            <div style={{fontSize:10,color:"#445566"}}>HKM Vizag CRM</div>
          </div>
        </div>
        <nav style={{flex:1,padding:"10px 8px",display:"flex",flexDirection:"column",gap:1}}>
          {NAV.map(n=>{
            const active = isActive(n.href);
            return (
              <Link key={n.href} href={n.href} style={{
                display:"flex",alignItems:"center",gap:10,padding:"10px 12px",
                borderRadius:8,textDecoration:"none",transition:"all .15s",
                background:active?"rgba(37,211,102,.08)":"transparent",
                color:active?"#25d366":"#8899b0",
                fontWeight:active?700:500,fontSize:14,
                borderLeft:`3px solid ${active?"#25d366":"transparent"}`}}>
                <span style={{fontSize:16,flexShrink:0}}>{n.icon}</span>
                <span style={{whiteSpace:"nowrap"}}>{n.label}</span>
              </Link>
            );
          })}
        </nav>
        <div style={{padding:"10px 8px 16px",borderTop:"1px solid #1c2a3f"}}>
          <div style={{display:"flex",alignItems:"center",gap:6,padding:"8px 10px",
            marginBottom:8,borderRadius:8,
            background:"rgba(37,211,102,.06)",border:"1px solid rgba(37,211,102,.2)"}}>
            <span style={{width:7,height:7,borderRadius:"50%",background:"#25d366",
              display:"inline-block",animation:"pdot 1.5s ease infinite"}}/>
            <span style={{fontSize:10,fontWeight:800,color:"#25d366"}}>LIVE</span>
          </div>
          <button onClick={logout} style={{width:"100%",padding:"7px 10px",borderRadius:7,
            border:"1px solid #1c2a3f",background:"transparent",color:"#445566",
            fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>
            ↩ Logout
          </button>
        </div>
      </aside>
      <main style={{flex:1,overflow:"auto"}}>{children}</main>
      <style>{`@keyframes pdot{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
    </div>
  );
}
