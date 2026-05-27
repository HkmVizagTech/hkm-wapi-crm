"use client";
import { useState } from "react";
import { Card, Input, Button, PageHeader } from "@/components/ui";
import { Toast } from "@/components/ui";
import { useToast } from "@/hooks/useToast";

export default function SettingsPage() {
  const { toast, showToast, clearToast } = useToast();

  return (
    <div className="p-6 fade-up max-w-2xl">
      <PageHeader title="⚙️ Settings" subtitle="Configuration for HKM Vizag WhatsApp CRM"/>

      <Card className="mb-5">
        <h2 className="font-bold text-base mb-4">API Configuration</h2>
        <div className="p-4 rounded-xl mb-4" style={{ background:"rgba(37,211,102,0.06)", border:"1px solid rgba(37,211,102,0.2)" }}>
          <p className="text-sm font-bold mb-1" style={{ color:"#25d366" }}>✓ Flaxxa WAPI Connected</p>
          <p className="text-xs" style={{ color:"#8899b0" }}>Token is set via FLAXXA_TOKEN environment variable in Railway.</p>
        </div>
        <div className="space-y-2 text-sm">
          {[
            { l:"Endpoint",    v:"https://wapi.flaxxa.com" },
            { l:"Send Message",v:"POST /api/v1/sendmessage" },
            { l:"Template",    v:"POST /api/v1/sendtemplatemessage" },
            { l:"Webhook URL", v:"https://your-app.railway.app/api/webhooks/flaxxa" },
          ].map(r => (
            <div key={r.l} className="flex gap-4 py-2 border-b" style={{ borderColor:"#1c2a3f" }}>
              <span className="w-28 font-semibold flex-shrink-0" style={{ color:"#8899b0" }}>{r.l}</span>
              <code className="text-xs flex-1 truncate" style={{ color:"#e8edf5", fontFamily:"'JetBrains Mono',monospace" }}>{r.v}</code>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mb-5">
        <h2 className="font-bold text-base mb-4">Database & Infrastructure</h2>
        <div className="space-y-3">
          {[
            { icon:"🍃", name:"MongoDB",  status:"Connected via Railway", color:"#25d366" },
            { icon:"🔴", name:"Redis",    status:"Connected via Railway", color:"#f44336" },
            { icon:"☁️",  name:"Cloudinary",status:"Configured for media uploads", color:"#00c9d4" },
          ].map(s => (
            <div key={s.name} className="flex items-center gap-3 p-3 rounded-xl" style={{ background:"#0d1117" }}>
              <span className="text-xl">{s.icon}</span>
              <div className="flex-1">
                <div className="font-bold text-sm">{s.name}</div>
                <div className="text-xs" style={{ color:"#8899b0" }}>{s.status}</div>
              </div>
              <span className="w-2 h-2 rounded-full" style={{ background:s.color }}/>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="font-bold text-base mb-4">Environment Variables</h2>
        <p className="text-sm mb-3" style={{ color:"#8899b0" }}>
          Set these in Railway → Your Service → Variables:
        </p>
        <div className="p-4 rounded-xl font-mono text-xs space-y-1.5" style={{ background:"#0d1117", border:"1px solid #1c2a3f" }}>
          {[
            "MONGODB_URI=${{MongoDB.MONGO_URL}}",
            "REDIS_URL=${{Redis.REDIS_URL}}",
            "FLAXXA_TOKEN=your_token_here",
            "CLOUDINARY_CLOUD_NAME=your_cloud_name",
            "CLOUDINARY_API_KEY=your_api_key",
            "CLOUDINARY_API_SECRET=your_api_secret",
            "NEXTAUTH_SECRET=random_32_char_string",
            "NEXTAUTH_URL=https://your-app.railway.app",
            "ADMIN_EMAIL=admin@hkmvizag.org",
            "ADMIN_PASSWORD=your_secure_password",
          ].map(v => (
            <div key={v}>
              <span style={{ color:"#2979ff" }}>{v.split("=")[0]}</span>
              <span style={{ color:"#445566" }}>=</span>
              <span style={{ color:"#ffb300" }}>{v.split("=").slice(1).join("=")}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
