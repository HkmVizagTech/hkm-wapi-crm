"use client";
import Link                        from "next/link";
import { usePathname, useRouter }  from "next/navigation";
import { useState, useEffect }     from "react";
import { FeedbackProvider } from "@/components/Feedback";
import { LayoutDashboard, MessageSquare, Send, Users, FileText, Radio, Image as ImageIcon,
         Settings, LogOut, Menu, Flower2, Loader2 } from "lucide-react";

const NAV = [
  { group:"Overview",  items:[
    { href:"/dashboard",           Icon:LayoutDashboard, label:"Dashboard" },
    { href:"/dashboard/inbox",     Icon:MessageSquare,   label:"Inbox"     },
  ]},
  { group:"Outreach",  items:[
    { href:"/dashboard/bulk",      Icon:Send,            label:"Bulk Send" },
    { href:"/dashboard/campaigns", Icon:Radio,           label:"Campaigns" },
    { href:"/dashboard/templates", Icon:FileText,        label:"Templates" },
  ]},
  { group:"Manage",    items:[
    { href:"/dashboard/contacts",  Icon:Users,           label:"Contacts"  },
    { href:"/dashboard/media",     Icon:ImageIcon,       label:"Media"     },
    { href:"/dashboard/settings",  Icon:Settings,        label:"Settings"  },
  ]},
];
const FLAT = NAV.flatMap(g => g.items);

function Logo({ size=34 }) {
  return (
    <div style={{width:size,height:size,borderRadius:size*.3,flexShrink:0,
      background:"linear-gradient(135deg,#25d366,#00c9d4)",color:"#04130a",
      display:"flex",alignItems:"center",justifyContent:"center",
      boxShadow:"0 4px 14px rgba(37,211,102,.28)"}}>
      <Flower2 size={size*.56} strokeWidth={2.2}/>
    </div>
  );
}

export default function Layout(props) {
  return <FeedbackProvider><LayoutInner {...props}/></FeedbackProvider>;
}

function LayoutInner({ children }) {
  const path   = usePathname();
  const router = useRouter();
  const [ok,      setOk]      = useState(false);
  const [mobile,  setMobile]  = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  // No browser autofill/suggestion dropdowns on any field in the app
  useEffect(() => {
    const fix = root => root.querySelectorAll?.("input,textarea,select").forEach(el => {
      if (el.getAttribute("autocomplete") !== "off" && el.getAttribute("autocomplete") !== "new-password")
        el.setAttribute("autocomplete", el.type === "password" ? "new-password" : "off");
    });
    fix(document);
    const mo = new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => n.nodeType === 1 && (n.matches?.("input,textarea,select") ? fix({ querySelectorAll:()=>[n] }) : fix(n)))));
    mo.observe(document.body, { childList:true, subtree:true });
    return () => mo.disconnect();
  }, []);

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
    <div style={{minHeight:"var(--vh100)",display:"flex",alignItems:"center",justifyContent:"center",background:"var(--bg)"}}>
      <Loader2 size={30} color="#25d366" style={{animation:"spin .8s linear infinite"}}/>
    </div>
  );

  const isActive = href => href === "/dashboard" ? path === href : path.startsWith(href);
  const current  = FLAT.find(n => isActive(n.href));

  /* ── Mobile: top bar + bottom nav ── */
  if (mobile) {
    const primary = FLAT.slice(0, 4), more = FLAT.slice(4);
    return (
      <div style={{display:"flex",flexDirection:"column",height:"100dvh",overflow:"hidden",background:"var(--bg)"}}>
        <div style={{background:"var(--panel)",borderBottom:"1px solid var(--line)",padding:"10px 16px",
          flexShrink:0,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <Logo size={30}/>
            <div style={{fontWeight:800,fontSize:15}}>{current?.label || "HKM Vizag"}</div>
          </div>
          <button onClick={logout} aria-label="Logout" style={{background:"none",border:"1px solid var(--line)",
            borderRadius:8,color:"var(--tx2)",padding:"6px 8px",display:"flex"}}><LogOut size={16}/></button>
        </div>

        <div style={{flex:1,overflow:"auto"}}>{children}</div>

        <div style={{display:"flex",background:"var(--panel)",borderTop:"1px solid var(--line)",flexShrink:0,
          paddingBottom:"env(safe-area-inset-bottom,0px)"}}>
          {primary.map(({href,Icon,label}) => {
            const active = isActive(href);
            return (
              <Link key={href} href={href} style={{flex:1,padding:"9px 4px 7px",display:"flex",flexDirection:"column",
                alignItems:"center",gap:3,textDecoration:"none",color:active?"var(--brand)":"var(--tx2)"}}>
                <Icon size={20} strokeWidth={active?2.4:2}/>
                <span style={{fontSize:10,fontWeight:active?700:500}}>{label}</span>
              </Link>
            );
          })}
          <button onClick={()=>setNavOpen(o=>!o)} style={{flex:1,padding:"9px 4px 7px",display:"flex",flexDirection:"column",
            alignItems:"center",gap:3,background:"none",border:"none",color:navOpen?"var(--brand)":"var(--tx2)"}}>
            <Menu size={20}/><span style={{fontSize:10,fontWeight:500}}>More</span>
          </button>
        </div>

        {navOpen && (
          <div style={{position:"fixed",inset:0,zIndex:50,background:"rgba(0,0,0,.5)"}} onClick={()=>setNavOpen(false)}>
            <div style={{position:"absolute",bottom:64,left:10,right:10,background:"var(--card)",
              border:"1px solid var(--line)",borderRadius:16,padding:6,boxShadow:"0 20px 50px rgba(0,0,0,.6)"}}
              onClick={e=>e.stopPropagation()}>
              {more.map(({href,Icon,label}) => {
                const active = isActive(href);
                return (
                  <Link key={href} href={href} onClick={()=>setNavOpen(false)}
                    style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:10,
                      textDecoration:"none",color:active?"var(--brand)":"var(--tx)",
                      background:active?"rgba(37,211,102,.08)":"transparent"}}>
                    <Icon size={19}/><span style={{fontWeight:active?700:500,fontSize:15}}>{label}</span>
                  </Link>
                );
              })}
              <button onClick={logout} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",width:"100%",
                background:"none",border:"none",borderTop:"1px solid var(--line)",color:"var(--tx2)",fontSize:15,marginTop:4}}>
                <LogOut size={19}/>Logout
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ── Desktop: sidebar + top bar ── */
  return (
    <div style={{display:"flex",height:"var(--vh100)",overflow:"hidden",background:"var(--bg)"}}>
      <aside style={{width:236,flexShrink:0,background:"var(--panel)",borderRight:"1px solid var(--line)",
        display:"flex",flexDirection:"column"}}>
        <div style={{display:"flex",alignItems:"center",gap:11,padding:"18px 16px 16px"}}>
          <Logo/>
          <div>
            <div style={{fontWeight:800,fontSize:15,letterSpacing:"-.2px"}}>HKM Vizag</div>
            <div style={{fontSize:11,color:"var(--tx3)",fontWeight:500}}>WhatsApp CRM</div>
          </div>
        </div>
        <nav style={{flex:1,padding:"6px 10px",overflowY:"auto"}}>
          {NAV.map(g=>(
            <div key={g.group} style={{marginBottom:14}}>
              <div style={{fontSize:10,fontWeight:700,letterSpacing:".9px",textTransform:"uppercase",
                color:"var(--tx3)",padding:"8px 10px 6px"}}>{g.group}</div>
              {g.items.map(({href,Icon,label})=>{
                const active = isActive(href);
                return (
                  <Link key={href} href={href} className="nav-link" style={{
                    display:"flex",alignItems:"center",gap:11,padding:"9px 11px",marginBottom:2,
                    borderRadius:9,textDecoration:"none",fontSize:13.5,
                    background:active?"linear-gradient(90deg,rgba(37,211,102,.16),rgba(37,211,102,.03))":"transparent",
                    color:active?"var(--brand)":"var(--tx2)",fontWeight:active?700:500,
                    boxShadow:active?"inset 2px 0 0 var(--brand)":"none"}}>
                    <Icon size={17} strokeWidth={active?2.4:2}/>{label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <div style={{padding:"12px 12px 16px",borderTop:"1px solid var(--line)"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 11px",marginBottom:8,borderRadius:9,
            background:"rgba(37,211,102,.07)",border:"1px solid rgba(37,211,102,.18)"}}>
            <span style={{width:7,height:7,borderRadius:"50%",background:"var(--brand)",animation:"pdot 1.5s ease infinite"}}/>
            <span style={{fontSize:11,fontWeight:700,color:"var(--brand)"}}>System online</span>
          </div>
          <button onClick={logout} style={{width:"100%",display:"flex",alignItems:"center",gap:9,padding:"9px 11px",
            borderRadius:9,border:"1px solid var(--line)",background:"transparent",color:"var(--tx2)",fontSize:13,fontWeight:600}}>
            <LogOut size={15}/>Logout
          </button>
        </div>
      </aside>
      <main style={{flex:1,overflow:"auto",minWidth:0}}>{children}</main>
    </div>
  );
}
