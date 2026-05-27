"use client";
import { useState, useEffect } from "react";
import { PageHeader, Table, Badge, Spinner } from "@/components/ui";
import { relativeTime, fmt }   from "@/lib/utils";
import Link from "next/link";

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    fetch("/api/campaigns").then(r=>r.json()).then(d => {
      setCampaigns(d.campaigns || []);
      setLoading(false);
    });
  }, []);

  const sc = s => ({ done:"#25d366", running:"#ffb300", queued:"#2979ff", stopped:"#f44336" })[s] || "#8899b0";

  return (
    <div className="p-6 fade-up">
      <PageHeader title="📡 Campaigns" subtitle={`${campaigns.length} campaigns total`}
        actions={<Link href="/dashboard/bulk" className="px-4 py-2 rounded-xl text-sm font-bold text-black"
          style={{ background:"linear-gradient(135deg,#25d366,#1aad52)" }}>+ New Bulk Send</Link>}/>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size={32}/></div>
      ) : (
        <Table
          headers={["Campaign","Template","Total","Sent","Failed","Status","Created"]}
          empty="No campaigns yet. Start a bulk send!"
          rows={campaigns.map(c => [
            <Link href={`/dashboard/campaigns/${c._id}`}
              className="font-semibold hover:text-[#25d366] transition-colors">{c.name}</Link>,
            <span className="text-xs font-mono" style={{ color:"#8899b0" }}>{c.templateName}</span>,
            <span className="font-bold">{c.totalContacts}</span>,
            <span className="font-bold" style={{ color:"#25d366" }}>{c.sent}</span>,
            <span className="font-bold" style={{ color:c.failed>0?"#f44336":"#445566" }}>{c.failed}</span>,
            <Badge color={sc(c.status)}>{c.status?.toUpperCase()}</Badge>,
            <span className="text-xs" style={{ color:"#445566" }}>{relativeTime(c.createdAt)}</span>,
          ])}
        />
      )}
    </div>
  );
}
