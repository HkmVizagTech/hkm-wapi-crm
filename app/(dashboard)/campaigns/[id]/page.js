"use client";
import { useState, useEffect } from "react";
import { useParams }            from "next/navigation";
import { Card, Badge, Button, PageHeader, Spinner } from "@/components/ui";
import { relativeTime, downloadCSV } from "@/lib/utils";
import Link from "next/link";

export default function CampaignDetailPage() {
  const { id }                  = useParams();
  const [campaign, setCampaign] = useState(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    if (!id) return;
    const load = () => fetch(`/api/campaigns/${id}`).then(r=>r.json()).then(d => {
      setCampaign(d.campaign);
      setLoading(false);
      if (d.campaign?.status === "running") setTimeout(load, 3000);
    });
    load();
  }, [id]);

  if (loading) return <div className="flex justify-center py-24"><Spinner size={36}/></div>;
  if (!campaign) return <div className="p-6 text-center" style={{ color:"#445566" }}>Campaign not found.</div>;

  const pct      = campaign.totalContacts ? Math.round((campaign.sent+campaign.failed)/campaign.totalContacts*100) : 0;
  const sc       = s => ({ done:"#25d366", running:"#ffb300", queued:"#2979ff", stopped:"#f44336" })[s] || "#8899b0";
  const statColor= s => ({ sent:"#25d366", delivered:"#00c9d4", read:"#25d366", failed:"#f44336", pending:"#ffb300" })[s] || "#8899b0";

  return (
    <div className="p-6 fade-up">
      <PageHeader
        title={campaign.name}
        subtitle={`Template: ${campaign.templateName} · ${relativeTime(campaign.createdAt)}`}
        actions={<>
          <Button variant="ghost" size="sm"
            onClick={()=>downloadCSV(`${campaign.name}_results.csv`,["phone","name","status","wamid","error"],
              campaign.results.map(r=>({phone:r.phone,name:r.name,status:r.status,wamid:r.wamid||"",error:r.error||""})))}>
            ⬇ Export Results
          </Button>
          <Link href="/dashboard/campaigns">
            <Button variant="ghost" size="sm">← Back</Button>
          </Link>
        </>}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {[
          { l:"Total",     v:campaign.totalContacts, c:"#8899b0" },
          { l:"Sent",      v:campaign.sent,          c:"#25d366" },
          { l:"Delivered", v:campaign.delivered||0,  c:"#00c9d4" },
          { l:"Failed",    v:campaign.failed,         c:"#f44336" },
          { l:"Status",    v:<Badge color={sc(campaign.status)}>{campaign.status?.toUpperCase()}</Badge>, c:"#8899b0" },
        ].map(s => (
          <Card key={s.l} className="text-center">
            <div className="text-2xl font-extrabold" style={{ color:typeof s.v==="string"?s.c:undefined }}>{s.v}</div>
            <div className="text-xs mt-1 font-semibold" style={{ color:"#8899b0" }}>{s.l}</div>
          </Card>
        ))}
      </div>

      {/* Progress */}
      <Card className="mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="font-bold">Progress</span>
          <span className="font-extrabold" style={{ color:"#25d366" }}>{pct}%</span>
        </div>
        <div className="h-3 rounded-full overflow-hidden" style={{ background:"#0d1117" }}>
          <div className="h-full rounded-full" style={{ width:`${pct}%`, background:"linear-gradient(90deg,#25d366,#00c9d4)", transition:"width .5s" }}/>
        </div>
      </Card>

      {/* Results */}
      <Card>
        <div className="font-bold mb-4">
          Results — {campaign.results?.filter(r=>r.status!=="pending").length || 0} / {campaign.totalContacts}
        </div>
        <div className="space-y-1.5 max-h-[600px] overflow-y-auto">
          {(campaign.results||[]).map((r,i) => (
            <div key={i} className="flex justify-between items-center p-3 rounded-lg"
              style={{
                background: r.status==="failed" ? "rgba(244,67,54,0.05)" : r.status==="pending" ? "rgba(255,179,0,0.03)" : "rgba(37,211,102,0.03)",
                border:`1px solid ${r.status==="failed"?"rgba(244,67,54,0.15)":r.status==="pending"?"rgba(255,179,0,0.1)":"rgba(37,211,102,0.1)"}`,
              }}>
              <div>
                <div className="font-semibold text-sm">{r.name || r.phone}</div>
                <div className="text-xs font-mono" style={{ color:"#8899b0" }}>{r.phone}</div>
                {r.params?.length > 0 && (
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {r.params.map((p,j) => (
                      <span key={j} className="text-xs px-1.5 py-0.5 rounded" style={{ background:"rgba(41,121,255,0.1)", color:"#2979ff" }}>
                        p{j+1}: {p}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="text-right flex-shrink-0 ml-3">
                <Badge color={statColor(r.status)}>{r.status}</Badge>
                {r.wamid && <div className="text-xs mt-1 font-mono" style={{ color:"#445566" }}>{r.wamid.slice(0,16)}…</div>}
                {r.error && <div className="text-xs mt-1" style={{ color:"#f44336" }}>{r.error}</div>}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
