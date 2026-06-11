"use client";
const C={g1:"#25d366",teal:"#00c9d4",blue:"#2979ff",
  card:"#111827",surf:"#0d1117",border:"#1c2a3f",tx:"#e8edf5",txs:"#8899b0",txd:"#445566"};

export default function Settings() {
  return (
    <div style={{padding:16,maxWidth:600}}>
      <h1 style={{fontSize:18,fontWeight:800,marginBottom:4}}>⚙️ Settings</h1>
      <p style={{fontSize:12,color:C.txs,marginBottom:18}}>HKM Vizag WhatsApp CRM Configuration</p>

      {[{
        title:"Flaxxa WAPI",
        items:[{l:"Endpoint",v:"https://wapi.flaxxa.com"},
          {l:"Send",v:"POST /api/v1/sendmessage"},
          {l:"Template",v:"POST /api/v1/sendtemplatemessage"},
          {l:"Webhook",v:"/api/webhooks/flaxxa"}],
      },{
        title:"Railway Environment Variables",
        items:[{l:"FLAXXA_TOKEN",v:"your_token"},
          {l:"MONGODB_URI",v:"mongodb+srv://..."},
          {l:"CLOUDINARY_CLOUD_NAME",v:"your_cloud"},
          {l:"CLOUDINARY_API_KEY",v:"your_key"},
          {l:"CLOUDINARY_API_SECRET",v:"your_secret"},
          {l:"ADMIN_EMAIL",v:"admin@hkmvizag.org"},
          {l:"ADMIN_PASSWORD",v:"your_password"},
          {l:"WEBHOOK_VERIFY_TOKEN",v:"hkm_vizag_webhook_2025"}],
      },{
        title:"Template Creation (Optional)",
        items:[{l:"WABA_ID",v:"WhatsApp Business Account ID"},
          {l:"META_TOKEN",v:"Meta System User Token"}],
      }].map(s=>(
        <div key={s.title} style={{background:C.card,border:`1px solid ${C.border}`,
          borderRadius:12,padding:14,marginBottom:12}}>
          <div style={{fontWeight:800,fontSize:14,marginBottom:12}}>{s.title}</div>
          {s.items.map(r=>(
            <div key={r.l} style={{display:"flex",gap:10,padding:"7px 0",
              borderBottom:`1px solid ${C.border}50`,flexWrap:"wrap"}}>
              <span style={{width:160,flexShrink:0,fontSize:12,
                fontWeight:600,color:C.txs}}>{r.l}</span>
              <code style={{fontSize:11,color:C.tx,
                fontFamily:"'JetBrains Mono',monospace",
                wordBreak:"break-all",flex:1}}>{r.v}</code>
            </div>
          ))}
        </div>
      ))}

      <div style={{background:`${C.g1}08`,border:`1px solid ${C.g1}20`,
        borderRadius:12,padding:14}}>
        <p style={{fontSize:12,color:C.g1,fontWeight:700,marginBottom:4}}>
          ✓ All systems operational
        </p>
        <p style={{fontSize:11,color:C.txs,lineHeight:1.6}}>
          MongoDB Atlas • Cloudinary • Flaxxa WAPI • Railway
        </p>
      </div>
    </div>
  );
}
