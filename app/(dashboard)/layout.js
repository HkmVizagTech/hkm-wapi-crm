"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/dashboard",           icon: "📊", label: "Dashboard"  },
  { href: "/dashboard/bulk",      icon: "📤", label: "Bulk Send"  },
  { href: "/dashboard/contacts",  icon: "👥", label: "Contacts"   },
  { href: "/dashboard/templates", icon: "📋", label: "Templates"  },
  { href: "/dashboard/campaigns", icon: "📡", label: "Campaigns"  },
  { href: "/dashboard/media",     icon: "🖼",  label: "Media"      },
];

export default function DashboardLayout({ children }) {
  const path = usePathname();
  return (
    <div className="flex h-screen overflow-hidden bg-[#07090f]">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-[#0d1117] border-r border-[#1c2a3f] flex flex-col">
        <div className="p-4 border-b border-[#1c2a3f] flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#25d366] to-[#00c9d4] flex items-center justify-center text-lg">
            🕉
          </div>
          <div>
            <div className="font-extrabold text-sm">Flaxxa WAPI</div>
            <div className="text-xs text-[#445566]">HKM Vizag</div>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {NAV.map(n => (
            <Link key={n.href} href={n.href} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all
              ${path === n.href
                ? "bg-[#25d366]/10 text-[#25d366] border-l-2 border-[#25d366]"
                : "text-[#8899b0] hover:text-white hover:bg-white/5 border-l-2 border-transparent"
              }`}>
              <span className="text-base">{n.icon}</span>{n.label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-[#1c2a3f]">
          <div className="flex items-center gap-2 px-3 py-2 bg-[#25d366]/8 rounded-lg border border-[#25d366]/20">
            <span className="w-2 h-2 rounded-full bg-[#25d366] animate-pulse"/>
            <span className="text-xs font-bold text-[#25d366]">LIVE</span>
          </div>
        </div>
      </aside>
      {/* Main */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
