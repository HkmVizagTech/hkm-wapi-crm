"use client";
import { useEffect, useState } from "react";
import { StatCard, Card }      from "@/components/ui";
import { fmt, relativeTime }   from "@/lib/utils";

export default function DashboardPage() {
  const [stats, setStats]       = useState({ contacts:0, messages:0, campaigns:0, delivered:0 });
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/campaigns").then(r=>r.json()),
      fetch("/api/contacts").then(r=>r.json()),
      fetch("/api/messages/stats").then(r=>r.json()).catch(()=>({ total:0, delivered:0 })),
    ]).then(([camp, cont, msgs]) => {
      setCampaigns(camp.campaigns || []);
      setStats({
        contacts:  cont.contacts?.length  || 0,
        campaigns: camp.campaigns?.length || 0,
        messages:  msgs.total    || 0,
        delivered: msgs.delivered || 0,
      });
      setLoading(false);
    });
  }, []);

  const statusColor = s => ({ done:"#25d366", running:"#ffb300", queued:"#2979ff", stopped:"#f44336" })[s] || "#8899b0";

  return (
    <div className="p-6 fade-up">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight">🕉 Hare Krishna!</h1>
        <p className="text-sm mt-1" style={{ color:"#8899b0" }}>HKM Vizag — WhatsApp CRM Dashboard</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Contacts"  value={fmt(stats.contacts)}  icon="👥" color="#25d366"  />
        <StatCard label="Messages Sent"   value={fmt(stats.messages)}  icon="📤" color="#00c9d4"  />
        <StatCard label="Campaigns Run"   value={fmt(stats.campaigns)} icon="📡" color="#2979ff"  />
        <StatCard label="Delivered"       value={fmt(stats.delivered)} icon="✓✓" color="#ffb300"  />
      </div>

      {/* Recent campaigns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <div className="font-bold text-base mb-4">Recent Campaigns</div>
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i=>(
                <div key={i} className="flex justify-between py-2 border-b" style={{ borderColor:"#1c2a3f" }}>
                  <div className="space-y-1">
                    <div className="h-3 w-32 rounded" style={{ background:"#1c2a3f" }}/>
                    <div className="h-2 w-24 rounded" style={{ background:"#1c2a3f" }}/>
                  </div>
                  <div className="h-3 w-16 rounded" style={{ background:"#1c2a3f" }}/>
                </div>
              ))}
            </div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-8" style={{ color:"#445566" }}>
              <div className="text-3xl mb-2">📡</div>
              <p>No campaigns yet</p>
              <a href="/dashboard/bulk" className="text-xs mt-1 block" style={{ color:"#25d366" }}>Start a bulk send →</a>
            </div>
          ) : (
            <div className="space-y-1">
              {campaigns.slice(0,6).map(c => (
                <a key={c._id} href={`/dashboard/campaigns/${c._id}`}
                  className="flex justify-between items-center py-2.5 px-2 rounded-lg hover:bg-white/5 transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm truncate">{c.name}</div>
                    <div className="text-xs truncate" style={{ color:"#8899b0" }}>{c.templateName}</div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <div className="text-sm font-bold" style={{ color:"#25d366" }}>{c.sent}/{c.totalContacts}</div>
                    <div className="text-xs font-bold" style={{ color: statusColor(c.status) }}>{c.status?.toUpperCase()}</div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div className="font-bold text-base mb-4">Quick Actions</div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { href:"/dashboard/bulk",      icon:"📤", label:"Bulk Send",     desc:"Upload CSV & send" },
              { href:"/dashboard/contacts",  icon:"👥", label:"Contacts",      desc:"Manage recipients" },
              { href:"/dashboard/templates", icon:"📋", label:"Templates",     desc:"View 19 templates" },
              { href:"/dashboard/media",     icon:"🖼",  label:"Media Library", desc:"Images & PDFs"     },
            ].map(a => (
              <a key={a.href} href={a.href}
                className="p-4 rounded-xl border text-left hover:border-[#25d366]/40 transition-all hover:bg-[#25d366]/5"
                style={{ borderColor:"#1c2a3f" }}>
                <div className="text-2xl mb-2">{a.icon}</div>
                <div className="font-bold text-sm">{a.label}</div>
                <div className="text-xs mt-0.5" style={{ color:"#8899b0" }}>{a.desc}</div>
              </a>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
