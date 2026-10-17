"use client";
import { useState, useEffect } from "react";
import { Settings as SettingsIcon, Radio, GitBranch, Bot, MessageCircle, Target, Siren, BarChart3, Globe,
  ShieldCheck, Repeat, Play, Pause, Trash2, KeyRound, Users, UserPlus, Plus, AlertTriangle, Zap,
  CheckCircle2, XCircle, PenLine, User } from "lucide-react";
import { PageHeader, Card, Btn, Badge, EmptyState } from "@/components/ui";
import DataTable from "@/components/DataTable";
import { Modal, useToast, useConfirm } from "@/components/Feedback";

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

// ── AI auto-reply pause switch (stored in MongoDB, takes effect within ~10s, no redeploy) ──
function AiSwitch({ envEnabled }) {
  const [st, setSt]     = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState("");
  const load = () => fetch("/api/settings/ai").then(r=>r.json()).then(d=>{ if(d.error) setErr(d.error); else setSt(d); }).catch(e=>setErr(e.message));
  useEffect(()=>{ load(); }, []);
  const set = async body => {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/settings/ai",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      const d = await r.json(); if (!r.ok) throw new Error(d.error||"Failed"); setSt(d);
    } catch(e){ setErr(e.message); } finally { setBusy(false); }
  };
  const fmt = d => new Date(d).toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short"});
  const btn = (label, onClick, primary, icon) => (
    <Btn key={label} size="sm" variant={primary?"primary":""} icon={icon} disabled={busy} onClick={onClick}>{label}</Btn>
  );

  if (!envEnabled) return (
    <div style={{padding:"11px 14px",borderRadius:9,marginBottom:12,background:`${C.amber}0e`,border:`1px solid ${C.amber}33`}}>
      <div style={{fontSize:13,fontWeight:700,color:C.amber,display:"flex",alignItems:"center",gap:7}}><AlertTriangle size={15}/>AI Auto-Reply is OFF (not enabled on the server)</div>
      <div style={{fontSize:11,color:C.txs,marginTop:4,lineHeight:1.5}}>
        To make AI available: set AI_ENABLED=true and GEMINI_API_KEY in Railway env vars. You can then pause/resume it here any time.
      </div>
    </div>
  );

  const paused = st?.paused;
  return (
    <div style={{padding:"12px 14px",borderRadius:9,marginBottom:12,
      background:paused?`${C.amber}0e`:`${C.g1}0e`,border:`1px solid ${paused?C.amber:C.g1}33`}}>
      <div style={{fontSize:13,fontWeight:700,color:paused?C.amber:C.g1,display:"flex",alignItems:"center",gap:7}}>
        {!st ? "Loading AI status…" : paused ? <><Pause size={15}/>AI Auto-Reply is PAUSED</> : <><CheckCircle2 size={15}/>AI Auto-Reply is ACTIVE</>}
      </div>
      <div style={{fontSize:11,color:C.txs,marginTop:4,lineHeight:1.5}}>
        {paused
          ? <>Incoming messages are saved to the Inbox but get no AI reply{st.pausedUntil?<> — resumes automatically on <strong style={{color:C.tx}}>{fmt(st.pausedUntil)}</strong></>:<> until you resume it</>}.{st.reason?` (${st.reason})`:""}</>
          : "Incoming messages get automatic AI replies where the contact's mode is Auto. Pause before big campaigns so replies don't overload the server."}
      </div>
      {st && (
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:10}}>
          {paused
            ? btn("Resume AI replies now", ()=>set({paused:false}), true, Play)
            : [
                btn("Pause 6 hours",  ()=>set({paused:true,hours:6,  reason:"Paused from Settings"})),
                btn("Pause 24 hours", ()=>set({paused:true,hours:24, reason:"Paused from Settings"})),
                btn("Pause 3 days",   ()=>set({paused:true,hours:72, reason:"Paused from Settings"})),
                btn("Pause until I resume", ()=>set({paused:true,hours:null,reason:"Paused from Settings"})),
              ]}
        </div>
      )}
      {err && <div style={{fontSize:11,color:C.red,marginTop:8,display:"flex",alignItems:"center",gap:5}}><XCircle size={12}/>{err}</div>}
    </div>
  );
}

export default function Settings() {
  const [forwards, setForwards] = useState([]);
  const [users,    setUsers]    = useState([]);
  const [cfg,      setCfg]      = useState(null);
  const [uForm,    setUForm]    = useState({ name:"",email:"",password:"",role:"viewer" });
  const [uSaving,  setUSaving]  = useState(false);
  const [loading,  setLoading]  = useState(true);
  const [form,     setForm]     = useState({ name:"",url:"",secret:"",events:["all"] });
  const [saving,   setSaving]   = useState(false);
  const [testing,  setTesting]  = useState({});
  const [fwdOpen,  setFwdOpen]  = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const toast = useToast();
  const confirm = useConfirm();
  const showToast = (m,t="success") => toast(m,t);

  const load = async () => {
    const r = await fetch("/api/webhook-forwards");
    const d = await r.json();
    setForwards(d.forwards||[]);
    setLoading(false);
  };

  useEffect(()=>{
    load();
    fetch("/api/users").then(r=>r.json()).then(d=>setUsers(d.users||[]));
    fetch("/api/settings/config").then(r=>r.json()).then(d=>setCfg(d||{}));
  },[]);

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
      setFwdOpen(false);
      showToast("Webhook forward added");
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
    if (!(await confirm({title:"Delete webhook forward?",message:"This forward will stop receiving events.",confirmLabel:"Delete",danger:true}))) return;
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
    if (d.ok) showToast(`Test sent! Response: ${d.status}`);
    else showToast(`Test failed: ${d.error||d.status}`,"error");
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
    <div className="page-wrap" style={{maxWidth:"min(1000px,100%)"}}>
      <PageHeader icon={SettingsIcon} title="Settings" subtitle="Configure webhook forwarding and integrations"/>

      {/* Webhook Info */}
      <Card title="Your Webhook URL" icon={Radio} style={{marginBottom:20}}>
        <p style={{fontSize:12,color:C.txs,marginBottom:12,lineHeight:1.6,marginTop:-6}}>
          Configure these URLs in Gupshup and Flaxxa dashboards to receive WhatsApp events.
        </p>
        {[{name:"Gupshup", url:cfg?.webhooks?.gupshup},{name:"Flaxxa", url:cfg?.webhooks?.flaxxa}].map(w=>(
          <div key={w.name} style={{marginBottom:8}}>
            <div style={{fontSize:11,fontWeight:700,color:C.txs,marginBottom:4}}>{w.name}</div>
            <div style={{background:C.surf,borderRadius:8,padding:"10px 14px",
              fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:C.g1,
              border:`1px solid ${C.border}`,wordBreak:"break-all"}}>
              {w.url}
            </div>
          </div>
        ))}
        <div style={{marginTop:10,fontSize:12,color:C.txs}}>
          Flaxxa verify token: <code style={{color:C.amber}}>hkm_vizag_webhook_2025</code>
        </div>
      </Card>

      {/* Webhook Forwards */}
      <Card title="Webhook Forwarding" icon={GitBranch} style={{marginBottom:20}}>
        <p style={{fontSize:12,color:C.txs,marginBottom:16,lineHeight:1.6,marginTop:-6}}>
          Forward incoming WhatsApp webhooks to external URLs in real-time.
          Useful for Zapier, Make, n8n, or your own servers.
        </p>

        <div style={{display:"flex",justifyContent:"flex-end",marginBottom:12}}>
          <Btn variant="primary" icon={Plus} onClick={()=>setFwdOpen(true)}>Add Forward URL</Btn>
        </div>
        <Modal open={fwdOpen} onClose={()=>setFwdOpen(false)} title="Add Forward URL" icon={Plus} width={520}
          footer={<>
            <Btn variant="ghost" onClick={()=>setFwdOpen(false)}>Cancel</Btn>
            <Btn variant="primary" icon={Plus} loading={saving} onClick={addForward} disabled={saving||!form.name||!form.url}>
              {saving?"Saving…":"Add Webhook Forward"}
            </Btn>
          </>}>
          <div>
            <div className="field">
<label>Name</label>
              <input className="input" placeholder="e.g. My n8n Server"
                value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/>
            </div>
            <div className="field">
<label>URL</label>
              <input className="input" placeholder="https://your-server.com/webhook"
                value={form.url} onChange={e=>setForm(f=>({...f,url:e.target.value}))}/>
            </div>
            <div className="field">
<label>Secret (optional — sent as X-Webhook-Secret header)</label>
              <input className="input" placeholder="your-secret-key"
                value={form.secret} onChange={e=>setForm(f=>({...f,secret:e.target.value}))}/>
            </div>
            <div className="field">
<label>Events to forward</label>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {["all","message","status"].map(ev=>(
                  <button key={ev} onClick={()=>toggleEvent(ev)} style={{
                    padding:"6px 14px",borderRadius:20,border:"none",
                    background:form.events.includes(ev)?C.g1:C.border,
                    color:form.events.includes(ev)?"#000":C.txs,
                    fontSize:12,fontWeight:700,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:6}}>
                    {ev==="all"?<><Repeat size={13}/>All</>:ev==="message"?<><MessageCircle size={13}/>Messages</>:<><BarChart3 size={13}/>Status updates</>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Modal>

        <DataTable clientPage={25} loading={loading} rows={forwards} maxHeight="none" rowKey={f=>f._id}
          empty={<EmptyState icon={GitBranch} title="No webhook forwards configured yet"/>}
          columns={[
            {key:"name",label:"Name",primary:true,hideLabelOnCard:true,render:f=><span style={{fontWeight:700,display:"block",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:200}}>{f.name}</span>},
            {key:"url",label:"URL",hideBelow:"md",render:f=><span className="mono" title={f.url} style={{display:"block",fontSize:11,color:"var(--tx2)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:220}}>{f.url}</span>},
            {key:"events",label:"Events",render:f=><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{(f.events||[]).map(ev=><Badge key={ev} tone="blue">{ev}</Badge>)}{f.secret&&<Badge tone="amber" icon={KeyRound}>secret</Badge>}</div>},
            {key:"enabled",label:"State",render:f=><Badge tone={f.enabled?"green":"red"} icon={f.enabled?CheckCircle2:Pause}>{f.enabled?"Active":"Paused"}</Badge>},
            {key:"lastStatus",label:"Last status",hideBelow:"md",render:f=>f.lastSentAt?(
              <span style={{fontSize:12,whiteSpace:"nowrap"}}>
                <span style={{color:f.lastStatus>=200&&f.lastStatus<300?C.g1:C.red,fontWeight:700}}>HTTP {f.lastStatus}</span>
                <span style={{color:"var(--tx3)"}}> · {new Date(f.lastSentAt).toLocaleString("en-IN",{timeZone:"Asia/Kolkata",dateStyle:"short",timeStyle:"short"})}</span>
              </span>):<span style={{color:"var(--tx3)"}}>Never</span>},
            {key:"actions",label:"",align:"right",hideLabelOnCard:true,render:f=>(
              <div style={{display:"flex",gap:6,justifyContent:"flex-end",flexWrap:"wrap"}}>
                <Btn size="sm" icon={Zap} title="Send test" onClick={()=>testForward(f._id)} loading={testing[f._id]} style={{color:C.teal}}>Test</Btn>
                <Btn size="sm" icon={f.enabled?Pause:Play} title={f.enabled?"Pause":"Enable"} onClick={()=>toggleEnabled(f._id,f.enabled)}/>
                <Btn size="sm" variant="danger" icon={Trash2} title="Delete" onClick={()=>deleteForward(f._id)}/>
              </div>)},
          ]}/>
      </Card>

      {/* AI Assistant Settings */}
      <Card title="AI Assistant (Gemini)" icon={Bot} style={{marginBottom:20}}>
        <p style={{fontSize:12,color:C.txs,marginBottom:14,lineHeight:1.6,marginTop:-6}}>
          Gemini AI auto-replies to incoming WhatsApp messages based on HKM Vizag knowledge.
          Handles donation queries, temple info, seva details, and more.
        </p>

        {/* Gemini API Key */}
        <div style={{marginBottom:12}}>
          <label style={{display:"block",fontSize:11,fontWeight:700,color:C.txs,
            textTransform:"uppercase",letterSpacing:".5px",marginBottom:5}}>
            Gemini API Key (set in Railway env: GEMINI_API_KEY)
          </label>
          <div style={{background:C.surf,borderRadius:8,padding:"9px 13px",
            border:`1px solid ${C.border}`,fontSize:12,color:cfg?.gemini?C.g1:C.red,
            fontFamily:"monospace",display:"flex",alignItems:"center",gap:7}}>
            {cfg?.gemini ? <><CheckCircle2 size={14}/>API Key Configured</> : <><AlertTriangle size={14}/>Not set — AI will not reply</>}
          </div>
          {cfg?.geminiModel&&(
            <div style={{fontSize:11,color:C.txs,marginTop:4}}>
              Model: {cfg.geminiModel}
            </div>
          )}
        </div>

        {/* Master switch — pause/resume without redeploying */}
        {cfg && <AiSwitch envEnabled={!!(cfg.aiEnabled && cfg.gemini)}/>}

        {/* Features */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:8,marginBottom:14}}>
          {[
            {icon:MessageCircle,title:"Auto-Reply",desc:"Replies to inbound messages automatically"},
            {icon:Target,title:"Donation Focus",desc:"Guides devotees to seva and donation pages"},
            {icon:Siren,title:"Human Escalation",desc:"Flags complex queries for staff"},
            {icon:BarChart3,title:"Interest Tracking",desc:"Logs donation interest in CRM"},
            {icon:Globe,title:"Telugu + English",desc:"Understands mixed language messages"},
            {icon:ShieldCheck,title:"Guardrails",desc:"Only devotional/temple topics"},
          ].map(f=>(
            <div key={f.title} className="card-hover" style={{background:C.surf,borderRadius:8,padding:"10px 12px",
              border:`1px solid ${C.border}`}}>
              <div style={{marginBottom:6,color:C.g1,display:"flex"}}><f.icon size={18}/></div>
              <div style={{fontWeight:700,fontSize:12}}>{f.title}</div>
              <div style={{fontSize:11,color:C.txs,marginTop:2}}>{f.desc}</div>
            </div>
          ))}
        </div>

        {/* Modes */}
        <div style={{background:C.surf,borderRadius:8,padding:12,border:`1px solid ${C.border}`}}>
          <div style={{fontWeight:700,fontSize:12,marginBottom:8}}>Conversation Modes (per contact in Inbox):</div>
          {[
            {m:"AI Auto", ic:Bot,   d:"Gemini replies instantly to every message"},
            {m:"AI Draft", ic:PenLine, d:"Gemini drafts reply, staff approves before sending"},
            {m:"Human Only", ic:User, d:"AI disabled, staff handles manually"},
          ].map(r=>(
            <div key={r.m} style={{display:"flex",gap:8,marginBottom:6,fontSize:12}}>
              <span style={{fontWeight:700,minWidth:120,display:"inline-flex",alignItems:"center",gap:6}}><r.ic size={13} color={C.g1}/>{r.m}</span>
              <span style={{color:C.txs}}>{r.d}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* User Management */}
      <Card title="Users" icon={Users} style={{marginBottom:20}}>
        <p style={{fontSize:12,color:C.txs,marginBottom:16,lineHeight:1.6,marginTop:-6}}>
          Manage login accounts. Admins have full access. Viewers can only view.
        </p>

        <div style={{display:"flex",justifyContent:"flex-end",marginBottom:12}}>
          <Btn variant="primary" icon={UserPlus} onClick={()=>setUserOpen(true)}>Add User</Btn>
        </div>
        <Modal open={userOpen} onClose={()=>setUserOpen(false)} title="Add User" icon={UserPlus} width={480}
          footer={<>
            <Btn variant="ghost" onClick={()=>setUserOpen(false)}>Cancel</Btn>
            <Btn variant="primary" icon={UserPlus} loading={uSaving} disabled={uSaving||!uForm.name||!uForm.email||!uForm.password}
              onClick={async()=>{
              setUSaving(true);
              const r=await fetch("/api/users",{method:"POST",
                headers:{"Content-Type":"application/json"},body:JSON.stringify(uForm)});
              const d=await r.json();
              if(r.ok){
                setUsers(p=>[d.user,...p]);
                setUForm({name:"",email:"",password:"",role:"viewer"});
                setUserOpen(false);
                showToast("User created");
              } else showToast(d.error||"Failed","error");
              setUSaving(false);
            }}>
              {uSaving?"Creating…":"Create User"}
            </Btn>
          </>}>
          <div>
            <div className="field">
<label>Name</label>
              <input className="input" placeholder="Full name"
                value={uForm.name} onChange={e=>setUForm(f=>({...f,name:e.target.value}))}/>
            </div>
            <div className="field">
<label>Email</label>
              <input className="input" placeholder="email@example.com" type="email"
                value={uForm.email} onChange={e=>setUForm(f=>({...f,email:e.target.value}))}/>
            </div>
            <div className="field">
<label>Password</label>
              <input className="input" placeholder="Set password" type="password"
                value={uForm.password} onChange={e=>setUForm(f=>({...f,password:e.target.value}))}/>
            </div>
            <div className="field">
<label>Role</label>
              <select className="input" value={uForm.role}
                onChange={e=>setUForm(f=>({...f,role:e.target.value}))}>
                <option value="viewer">Viewer (read only)</option>
                <option value="admin">Admin (full access)</option>
              </select>
            </div>
          </div>
        </Modal>

        <DataTable clientPage={25} rows={users} maxHeight="none" rowKey={u=>u._id}
          empty={<EmptyState icon={Users} title="No extra users yet" hint="Only admin env login active."/>}
          columns={[
            {key:"name",label:"User",primary:true,hideLabelOnCard:true,render:u=>(
              <div style={{display:"flex",alignItems:"center",gap:10,minWidth:0}}>
                <div style={{width:34,height:34,borderRadius:"50%",flexShrink:0,background:u.role==="admin"?`${C.g1}20`:`${C.blue}20`,
                  border:`1px solid ${u.role==="admin"?C.g1:C.blue}50`,display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:12,fontWeight:800,color:u.role==="admin"?C.g1:C.blue}}>{(u.name||"?").slice(0,2).toUpperCase()}</div>
                <div style={{minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:220}}>{u.name}</div>
                  <div style={{fontSize:11,color:"var(--tx2)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:220}}>{u.email}</div>
                </div>
              </div>)},
            {key:"role",label:"Role",render:u=><Badge tone={u.role==="admin"?"green":"blue"}>{u.role}</Badge>},
            {key:"active",label:"Status",render:u=><Badge tone={u.active?"green":"red"}>{u.active?"active":"disabled"}</Badge>},
            {key:"lastLogin",label:"Last login",hideBelow:"md",render:u=><span style={{color:"var(--tx2)",whiteSpace:"nowrap"}}>{u.lastLogin?new Date(u.lastLogin).toLocaleDateString("en-IN"):"Never"}</span>},
            {key:"actions",label:"",align:"right",hideLabelOnCard:true,render:u=>(
              <div style={{display:"flex",gap:6,justifyContent:"flex-end"}}>
                <Btn size="sm" icon={u.active?Pause:Play} title={u.active?"Disable":"Enable"} onClick={async()=>{
                  await fetch(`/api/users/${u._id}`,{method:"PATCH",
                    headers:{"Content-Type":"application/json"},
                    body:JSON.stringify({active:!u.active})});
                  setUsers(p=>p.map(x=>x._id===u._id?{...x,active:!u.active}:x));
                }}>{u.active?"Disable":"Enable"}</Btn>
                <Btn size="sm" variant="danger" icon={Trash2} title="Delete" onClick={async()=>{
                  if(!(await confirm({title:"Delete user?",message:`${u.name} will no longer be able to sign in.`,confirmLabel:"Delete",danger:true}))) return;
                  await fetch(`/api/users/${u._id}`,{method:"DELETE"});
                  setUsers(p=>p.filter(x=>x._id!==u._id));
                  showToast("Deleted");
                }}/>
              </div>)},
          ]}/>
      </Card>

    </div>
  );
}
