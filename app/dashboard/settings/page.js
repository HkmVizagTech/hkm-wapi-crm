"use client";
import { useState, useEffect } from "react";

const C = {
  g1:"#25d366",g2:"#1aad52",teal:"#00c9d4",blue:"#2979ff",
  amber:"#ffb300",red:"#f44336",purple:"#9c27b0",
  card:"#111827",surf:"#0d1117",border:"#1c2a3f",
  tx:"#e8edf5",txs:"#8899b0",txd:"#445566",
};

const IS = {
  width:"100%",background:C.surf,border:`1px solid ${C.border}`,
  borderRadius:10,padding:"10px 13px",color:C.tx,fontSize:13,
  outline:"none",boxSizing:"border-box",fontFamily:"inherit",
};

export default function Settings() {
  const [forwards, setForwards] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [form,     setForm]     = useState({ name:"",url:"",secret:"",events:["all"] });
  const [saving,   setSaving]   = useState(false);
  const [toast,    setToast]    = useState(null);
  const [testing,  setTesting]  = useState({});

  const showToast = (m,t="success") => {
    setToast({m,t}); setTimeout(()=>setToast(null),4000);
  };

  const load = async () => {
    const r = await fetch("/api/webhook-forwards");
    const d = await r.json();
    setForwards(d.forwards||[]);
    setLoading(false);
  };

  useEffect(()=>{ load(); },[]);

  const addForward = async () => {
    if (!form.name||!form.url) return showToast("Name and URL required","error");
    setSaving(true);
    const r = await fetch("/api/webhook-forwards",{
      method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify(form),
    });
    const d = await r.json();
    if (r.ok) {
      setForwards(prev=>[d.forward,...prev]);
      setForm({name:"",url:"",secret:"",events:["all"]});
      showToast("Webhook forward added!");
    } else {
      showToast(d.error||"Failed","error");
    }
    setSaving(false);
  };

  const toggleEnabled = async (id, enabled) => {
    await fetch(`/api/webhook-forwards/${id}`,{
      method:"PATCH", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({ enabled:!enabled }),
    });
    setForwards(prev=>prev.map(f=>f._id===id?{...f,enabled:!enabled}:f));
  };

  const deleteForward = async (id) => {
    if (!confirm("Delete this webhook forward?")) return;
    await fetch(`/api/webhook-forwards/${id}`,{ method:"DELETE" });
    setForwards(prev=>prev.filter(f=>f._id!==id));
    showToast("Deleted");
  };

  const testForward = async (id) => {
    setTesting(p=>({...p,[id]:true}));
    const r = await fetch("/api/webhook-forwards/test",{
      method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({id}),
    });
    const d = await r.json();
    if (d.ok) showToast(`✅ Test sent! Response: ${d.status}`);
    else showToast(`❌ Test failed: ${d.error||d.status}`,"error");
    setTesting(p=>({...p,[id]:false}));
    load();
  };

  const toggleEvent = (ev) => {
    if (ev==="all") { setForm(f=>({...f,events:["all"]})); return; }
    setForm(f=>{
      const evs = f.events.filter(e=>e!=="all");
      return {...f, events: evs.includes(ev) ? evs.filter(e=>e!==ev) : [...evs,ev]};
    });
  };

  return (
    <div style={{padding:20,maxWidth:700,margin:"0 auto"}}>
      <h1 style={{fontSize:20,fontWeight:800,marginBottom:4}}>⚙️ Settings</h1>
      <p style={{fontSize:13,color:C.txs,marginBottom:24}}>
        Configure webhook forwarding and integrations
      </p>

      {/* Webhook Info */}
      <div style={{background:C.card,border:`1px solid ${C.border}`,
        borderRadius:12,padding:16,marginBottom:20}}>
        <div style={{fontWeight:800,fontSize:15,marginBottom:8}}>
          📡 Your Webhook URL
        </div>
        <p style={{fontSize:12,color:C.txs,marginBottom:10,lineHeight:1.6}}>
          Configure this URL in your Flaxxa WAPI dashboard to receive WhatsApp events.
        </p>
        <div style={{background:C.surf,borderRadius:8,padding:"10px 14px",
          fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:C.g1,
          border:`1px solid ${C.border}`,wordBreak:"break-all"}}>
          https://hkm-wapi-crm-production.up.railway.app/api/webhooks/flaxxa
        </div>
        <div style={{marginTop:10,fontSize:12,color:C.txs}}>
          Verify token: <code style={{color:C.amber}}>hkm_vizag_webhook_2025</code>
        </div>
      </div>

      {/* Webhook Forwards */}
      <div style={{background:C.card,border:`1px solid ${C.border}`,
        borderRadius:12,padding:16,marginBottom:20}}>
        <div style={{fontWeight:800,fontSize:15,marginBottom:4}}>
          🔀 Webhook Forwarding
        </div>
        <p style={{fontSize:12,color:C.txs,marginBottom:16,lineHeight:1.6}}>
          Forward incoming WhatsApp webhooks to external URLs in real-time.
          Useful for Zapier, Make, n8n, or your own servers.
        </p>

        {/* Add form */}
        <div style={{background:C.surf,borderRadius:10,padding:14,
          border:`1px solid ${C.border}`,marginBottom:16}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:12,color:C.g1}}>
            + Add Forward URL
          </div>
          <div style={{display:"grid",gap:10}}>
            <div>
              <label style={{display:"block",fontSize:11,fontWeight:700,color:C.txs,
                textTransform:"uppercase",letterSpacing:".5px",marginBottom:5}}>
                Name
              </label>
              <input style={IS} placeholder="e.g. My n8n Server"
                value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/>
            </div>
            <div>
              <label style={{display:"block",fontSize:11,fontWeight:700,color:C.txs,
                textTransform:"uppercase",letterSpacing:".5px",marginBottom:5}}>
                URL
              </label>
              <input style={IS} placeholder="https://your-server.com/webhook"
                value={form.url} onChange={e=>setForm(f=>({...f,url:e.target.value}))}/>
            </div>
            <div>
              <label style={{display:"block",fontSize:11,fontWeight:700,color:C.txs,
                textTransform:"uppercase",letterSpacing:".5px",marginBottom:5}}>
                Secret (optional — sent as X-Webhook-Secret header)
              </label>
              <input style={IS} placeholder="your-secret-key"
                value={form.secret} onChange={e=>setForm(f=>({...f,secret:e.target.value}))}/>
            </div>
            <div>
              <label style={{display:"block",fontSize:11,fontWeight:700,color:C.txs,
                textTransform:"uppercase",letterSpacing:".5px",marginBottom:8}}>
                Events to forward
              </label>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {["all","message","status"].map(ev=>(
                  <button key={ev} onClick={()=>toggleEvent(ev)} style={{
                    padding:"5px 14px",borderRadius:20,border:"none",
                    background:form.events.includes(ev)?C.g1:C.border,
                    color:form.events.includes(ev)?"#000":C.txs,
                    fontSize:12,fontWeight:700,cursor:"pointer"}}>
                    {ev==="all"?"🔁 All":ev==="message"?"💬 Messages":"📊 Status updates"}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <button onClick={addForward} disabled={saving||!form.name||!form.url}
            style={{marginTop:14,width:"100%",padding:"10px",borderRadius:9,
              border:"none",background:saving||!form.name||!form.url
                ?C.border:`linear-gradient(135deg,${C.g1},${C.g2})`,
              color:saving||!form.name||!form.url?C.txd:"#000",
              fontWeight:700,fontSize:13,cursor:"pointer"}}>
            {saving?"Saving…":"+ Add Webhook Forward"}
          </button>
        </div>

        {/* List */}
        {loading && <p style={{color:C.txd,fontSize:13}}>Loading…</p>}
        {!loading && forwards.length===0 && (
          <p style={{color:C.txd,fontSize:13,textAlign:"center",padding:20}}>
            No webhook forwards configured yet.
          </p>
        )}
        {forwards.map(fwd=>(
          <div key={fwd._id} style={{background:C.surf,borderRadius:10,padding:14,
            border:`1px solid ${fwd.enabled?C.border:C.txd+"44"}`,
            marginBottom:10,opacity:fwd.enabled?1:.6}}>
            <div style={{display:"flex",justifyContent:"space-between",
              alignItems:"flex-start",gap:10}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                  <span style={{fontWeight:800,fontSize:14}}>{fwd.name}</span>
                  <span style={{fontSize:10,padding:"2px 8px",borderRadius:20,fontWeight:700,
                    background:fwd.enabled?`${C.g1}20`:`${C.red}20`,
                    color:fwd.enabled?C.g1:C.red}}>
                    {fwd.enabled?"ACTIVE":"PAUSED"}
                  </span>
                </div>
                <div style={{fontSize:11,color:C.txs,fontFamily:"'JetBrains Mono',monospace",
                  wordBreak:"break-all",marginBottom:4}}>
                  {fwd.url}
                </div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {fwd.events.map(ev=>(
                    <span key={ev} style={{fontSize:10,padding:"1px 8px",borderRadius:20,
                      fontWeight:700,background:`${C.blue}14`,color:C.blue}}>
                      {ev}
                    </span>
                  ))}
                  {fwd.secret && (
                    <span style={{fontSize:10,padding:"1px 8px",borderRadius:20,
                      fontWeight:700,background:`${C.amber}14`,color:C.amber}}>
                      🔑 secret set
                    </span>
                  )}
                </div>
                {fwd.lastSentAt && (
                  <div style={{fontSize:11,color:C.txd,marginTop:4}}>
                    Last sent: {new Date(fwd.lastSentAt).toLocaleString("en-IN",
                      {timeZone:"Asia/Kolkata",dateStyle:"short",timeStyle:"short"})}
                    {" "}·{" "}
                    <span style={{color:fwd.lastStatus>=200&&fwd.lastStatus<300?C.g1:C.red}}>
                      HTTP {fwd.lastStatus}
                    </span>
                  </div>
                )}
              </div>
              {/* Actions */}
              <div style={{display:"flex",flexDirection:"column",gap:6,flexShrink:0}}>
                <button onClick={()=>testForward(fwd._id)}
                  disabled={testing[fwd._id]}
                  style={{padding:"5px 10px",borderRadius:7,
                    border:`1px solid ${C.teal}40`,background:`${C.teal}10`,
                    color:C.teal,fontSize:11,fontWeight:700,cursor:"pointer"}}>
                  {testing[fwd._id]?"…":"⚡ Test"}
                </button>
                <button onClick={()=>toggleEnabled(fwd._id,fwd.enabled)}
                  style={{padding:"5px 10px",borderRadius:7,
                    border:`1px solid ${C.border}`,background:"transparent",
                    color:C.txs,fontSize:11,fontWeight:700,cursor:"pointer"}}>
                  {fwd.enabled?"⏸ Pause":"▶ Enable"}
                </button>
                <button onClick={()=>deleteForward(fwd._id)}
                  style={{padding:"5px 10px",borderRadius:7,
                    border:`1px solid ${C.red}40`,background:`${C.red}10`,
                    color:C.red,fontSize:11,fontWeight:700,cursor:"pointer"}}>
                  🗑 Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {toast && (
        <div onClick={()=>setToast(null)} style={{
          position:"fixed",bottom:80,right:16,zIndex:999,
          padding:"11px 18px",borderRadius:10,fontWeight:700,fontSize:13,cursor:"pointer",
          background:toast.t==="success"?`${C.g1}ee`:toast.t==="error"?`${C.red}ee`:`${C.amber}ee`,
          color:toast.t==="error"?"#fff":"#000",
        }}>
          {toast.t==="success"?"✓":toast.t==="error"?"✕":"⚠"} {toast.m}
        </div>
      )}
    </div>
  );
}
