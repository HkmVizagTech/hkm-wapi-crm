export default function Settings() {
  const C={card:"#111827",surf:"#0d1117",border:"#1c2a3f",g1:"#25d366",teal:"#00c9d4",txs:"#8899b0",txd:"#445566"};
  return (
    <div style={{padding:24,maxWidth:640}}>
      <h1 style={{fontSize:20,fontWeight:800,marginBottom:4}}>⚙️ Settings</h1>
      <p style={{fontSize:13,color:C.txs,marginBottom:22}}>Configuration for HKM Vizag WhatsApp CRM</p>
      {[{
        title:"Flaxxa WAPI",
        items:[{l:"Base URL",v:"https://wapi.flaxxa.com"},{l:"Send Message",v:"POST /api/v1/sendmessage"},
          {l:"Template Send",v:"POST /api/v1/sendtemplatemessage"},{l:"Webhook URL",v:"/api/webhooks/flaxxa"}],
      },{
        title:"Environment Variables (set in Railway)",
        items:[{l:"FLAXXA_TOKEN",v:"your_token_here"},{l:"MONGODB_URI",v:"${{MongoDB.MONGO_URL}}"},
          {l:"CLOUDINARY_CLOUD_NAME",v:"your_cloud_name"},{l:"ADMIN_EMAIL",v:"admin@hkmvizag.org"},
          {l:"ADMIN_PASSWORD",v:"your_secure_password"}],
      }].map(s=>(
        <div key={s.title} style={{background:C.card,border:`1px solid ${C.border}`,
          borderRadius:12,padding:18,marginBottom:14}}>
          <div style={{fontWeight:800,fontSize:14,marginBottom:14}}>{s.title}</div>
          {s.items.map(r=>(
            <div key={r.l} style={{display:"flex",gap:12,padding:"8px 0",
              borderBottom:`1px solid ${C.border}50`}}>
              <span style={{width:180,flexShrink:0,fontSize:12,fontWeight:600,color:C.txs}}>{r.l}</span>
              <code style={{fontSize:12,color:"#e8edf5",fontFamily:"'JetBrains Mono',monospace",
                wordBreak:"break-all"}}>{r.v}</code>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
