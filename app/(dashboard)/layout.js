"use client";
import Link       from "next/link";
import { usePathname } from "next/navigation";
import { useState }    from "react";

const NAV = [
  { href:"/dashboard",            icon:"📊", label:"Dashboard"  },
  { href:"/dashboard/bulk",       icon:"📤", label:"Bulk Send"  },
  { href:"/dashboard/contacts",   icon:"👥", label:"Contacts"   },
  { href:"/dashboard/templates",  icon:"📋", label:"Templates"  },
  { href:"/dashboard/campaigns",  icon:"📡", label:"Campaigns"  },
  { href:"/dashboard/media",      icon:"🖼",  label:"Media"      },
  { href:"/dashboard/settings",   icon:"⚙️",  label:"Settings"   },
];

export default function DashboardLayout({ children }) {
  const path      = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background:"#07090f" }}>
      {/* Sidebar */}
      <aside className={`${collapsed ? "w-16" : "w-56"} flex-shrink-0 flex flex-col transition-all duration-200`}
        style={{ background:"#0d1117", borderRight:"1px solid #1c2a3f" }}>

        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-4 border-b" style={{ borderColor:"#1c2a3f" }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
            style={{ background:"linear-gradient(135deg,#25d366,#00c9d4)" }}>🕉</div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="font-extrabold text-sm truncate">Flaxxa WAPI</div>
              <div className="text-xs truncate" style={{ color:"#445566" }}>HKM Vizag CRM</div>
            </div>
          )}
          <button onClick={() => setCollapsed(c => !c)}
            className="ml-auto text-xs flex-shrink-0" style={{ color:"#445566" }}>
            {collapsed ? "›" : "‹"}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-0.5">
          {NAV.map(n => {
            const active = path === n.href || (n.href !== "/dashboard" && path.startsWith(n.href));
            return (
              <Link key={n.href} href={n.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all
                  ${active
                    ? "text-[#25d366] border-l-2 border-[#25d366]"
                    : "text-[#8899b0] hover:text-white border-l-2 border-transparent hover:bg-white/5"
                  }`}
                style={ active ? { background:"rgba(37,211,102,0.08)" } : {} }>
                <span className="text-base flex-shrink-0">{n.icon}</span>
                {!collapsed && <span className="truncate">{n.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Status */}
        {!collapsed && (
          <div className="p-3 border-t" style={{ borderColor:"#1c2a3f" }}>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border"
              style={{ background:"rgba(37,211,102,0.06)", borderColor:"rgba(37,211,102,0.2)" }}>
              <span className="w-2 h-2 rounded-full pulse-dot" style={{ background:"#25d366" }}/>
              <span className="text-xs font-bold" style={{ color:"#25d366" }}>CONNECTED</span>
            </div>
          </div>
        )}
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
