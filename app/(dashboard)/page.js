import { connectDB }  from "@/lib/mongodb";
import Campaign       from "@/models/Campaign";
import Message        from "@/models/Message";
import Contact        from "@/models/Contact";

async function getStats() {
  await connectDB();
  const [totalContacts, totalMessages, totalCampaigns, recentCampaigns] = await Promise.all([
    Contact.countDocuments(),
    Message.countDocuments(),
    Campaign.countDocuments(),
    Campaign.find().sort({ createdAt: -1 }).limit(5).lean(),
  ]);
  return { totalContacts, totalMessages, totalCampaigns, recentCampaigns };
}

export default async function DashboardPage() {
  const { totalContacts, totalMessages, totalCampaigns, recentCampaigns } = await getStats();

  const stats = [
    { label: "Total Contacts",  value: totalContacts,  icon: "👥", color: "#25d366" },
    { label: "Messages Sent",   value: totalMessages,  icon: "📤", color: "#00c9d4" },
    { label: "Campaigns Run",   value: totalCampaigns, icon: "📡", color: "#2979ff" },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold">🕉 Hare Krishna!</h1>
        <p className="text-[#8899b0] text-sm mt-1">HKM Vizag WhatsApp CRM Dashboard</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {stats.map(s => (
          <div key={s.label} className="bg-[#111827] border border-[#1c2a3f] rounded-xl p-5"
            style={{ borderTop: `3px solid ${s.color}` }}>
            <div className="text-2xl mb-2">{s.icon}</div>
            <div className="text-3xl font-extrabold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs text-[#8899b0] font-semibold mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Recent campaigns */}
      <div className="bg-[#111827] border border-[#1c2a3f] rounded-xl p-5">
        <h2 className="font-bold text-base mb-4">Recent Campaigns</h2>
        {recentCampaigns.length === 0 ? (
          <p className="text-[#445566] text-sm">No campaigns yet. Start a bulk send!</p>
        ) : (
          <div className="space-y-3">
            {recentCampaigns.map(c => (
              <div key={c._id} className="flex justify-between items-center py-2 border-b border-[#1c2a3f] last:border-0">
                <div>
                  <div className="font-semibold text-sm">{c.name}</div>
                  <div className="text-xs text-[#8899b0]">{c.templateName}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-[#25d366]">{c.sent}/{c.totalContacts}</div>
                  <div className={`text-xs font-bold ${
                    c.status==="done"?"text-[#25d366]":c.status==="running"?"text-[#ffb300]":"text-[#8899b0]"
                  }`}>{c.status.toUpperCase()}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
