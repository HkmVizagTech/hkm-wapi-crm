"use client";
import Link                              from "next/link";
import { usePathname, useRouter }        from "next/navigation";
import { useState, useEffect }           from "react";

const NAV = [
  { href:"/dashboard",           icon:"📊", label:"Dashboard"  },
  { href:"/dashboard/bulk",      icon:"📤", label:"Bulk Send"  },
  { href:"/dashboard/contacts",  icon:"👥", label:"Contacts"   },
  { href:"/dashboard/templates", icon:"📋", label:"Templates"  },
  { href:"/dashboard/campaigns", icon:"📡", label:"Campaigns"  },
  { href:"/dashboard/media",     icon:"🖼",  label:"Media"      },
  { href:"/dashboard/settings",  icon:"⚙️",  label:"Settings"   },
];

export default function DashboardLayout({ children }) {
  const path              = usePathname();
  const router            = useRouter();
  const [ready, setReady] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    // Only runs client-side, so localStorage is safe here
    try {
      const auth = localStorage.getItem("crm_auth");
      if (!auth) {
        router.replace("/login");
      } else {
        setReady(true);
      }
    } catch {
      setReady(true); // if localStorage fails just show the page
    }
  }, []);

  const logout = () => {
    try { localStorage.removeItem("crm_auth"); } catch {}
    router.replace("/login");
  };

  // Show spinner while checking auth
  if (!ready) return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center",
      justifyContent:"center", background:"#07090f" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ width:40, height:40, margin:"0 auto 16px",
          border:"3px solid #1c2a3f", borderTopColor:"#25d366",
          borderRadius:"50%", animation:"spin .7s linear infinite" }}/>
        <p style={{ color:"#445566", fontSize:13 }}>Loading…</p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ display:"flex", height:"100vh", overflow:"hidden", background:"#07090f" }}>

      {/* Sidebar */}
      <aside style={{
        width: collapsed ? 60 : 220, flexShrink:0,
        background:"#0d1117", borderRight:"1px solid #1c2a3f",
        display:"flex", flexDirection:"column", transition:"width .2s",
      }}>
        {/* Logo */}
        <div style={{ display:"flex", alignItems:"center", gap:10,
          padding:"15px 12px", borderBottom:"1px solid #1c2a3f" }}>
          <div style={{ width:32, height:32, borderRadius:9, flexShrink:0,
            background:"linear-gradient(135deg,#25d366,#00c9d4)",
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>
            🕉
          </div>
          {!collapsed && (
            <div style={{ minWidth:0, flex:1 }}>
              <div style={{ fontWeight:800, fontSize:13, color:"#e8edf5", lineHeight:1.2 }}>Flaxxa WAPI</div>
              <div style={{ fontSize:10, color:"#445566" }}>HKM Vizag CRM</div>
            </div>
          )}
          <button onClick={() => setCollapsed(c => !c)}
            style={{ background:"none", border:"none", color:"#445566",
              fontSize:18, cursor:"pointer", flexShrink:0, lineHeight:1 }}>
            {collapsed ? "›" : "‹"}
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex:1, padding:"10px 8px", display:"flex", flexDirection:"column", gap:1 }}>
          {NAV.map(n => {
            const active = path === n.href || (n.href !== "/dashboard" && path.startsWith(n.href));
            return (
              <Link key={n.href} href={n.href} style={{
                display:"flex", alignItems:"center",
                gap: collapsed ? 0 : 10,
                justifyContent: collapsed ? "center" : "flex-start",
                padding: collapsed ? "10px 8px" : "10px 12px",
                borderRadius:8, textDecoration:"none", transition:"all .15s",
                background: active ? "rgba(37,211,102,0.08)" : "transparent",
                color:      active ? "#25d366" : "#8899b0",
                fontWeight: active ? 700 : 500, fontSize:14,
                borderLeft: `3px solid ${active ? "#25d366" : "transparent"}`,
              }}>
                <span style={{ fontSize:16, flexShrink:0 }}>{n.icon}</span>
                {!collapsed && <span style={{ whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{n.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding:"10px 8px 16px", borderTop:"1px solid #1c2a3f" }}>
          {!collapsed && (
            <div style={{ display:"flex", alignItems:"center", gap:6,
              padding:"8px 10px", marginBottom:8, borderRadius:8,
              background:"rgba(37,211,102,0.06)", border:"1px solid rgba(37,211,102,0.2)" }}>
              <span style={{ width:7, height:7, borderRadius:"50%", background:"#25d366",
                display:"inline-block", animation:"pulse-dot 1.5s ease infinite" }}/>
              <span style={{ fontSize:10, fontWeight:800, color:"#25d366" }}>LIVE</span>
            </div>
          )}
          <button onClick={logout} style={{
            width:"100%", padding: collapsed ? "8px 4px" : "7px 10px",
            borderRadius:7, border:"1px solid #1c2a3f",
            background:"transparent", color:"#445566",
            fontSize:11, cursor:"pointer", fontFamily:"inherit",
          }}>
            {collapsed ? "↩" : "↩ Logout"}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex:1, overflow:"auto" }}>{children}</main>
    </div>
  );
}
