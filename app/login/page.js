"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Flower2, Mail, Lock, AlertTriangle, ArrowRight, Loader2, MessageSquare, Send, Bot } from "lucide-react";

const FEATURES = [
  { Icon:Send,          t:"Bulk campaigns",  d:"Reach thousands of devotees with approved templates" },
  { Icon:MessageSquare, t:"Shared inbox",    d:"One team, every WhatsApp conversation" },
  { Icon:Bot,           t:"AI assistant",    d:"Instant answers on timings, sevas and donations" },
];

function Field({ Icon, ...p }) {
  return (
    <div style={{position:"relative"}}>
      <Icon size={16} color="#5a6b82" style={{position:"absolute",left:13,top:"50%",transform:"translateY(-50%)"}}/>
      <input {...p} style={{width:"100%",background:"#0b0f17",border:"1px solid #1c2a3f",borderRadius:10,
        padding:"12px 14px 12px 38px",color:"#e8edf5",fontSize:14,outline:"none"}}/>
    </div>
  );
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [pass,  setPass]  = useState("");
  const [err,   setErr]   = useState("");
  const [load,  setLoad]  = useState(false);
  const router = useRouter();

  const submit = async e => {
    e.preventDefault(); setLoad(true); setErr("");
    const r = await fetch("/api/auth/login", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ email, password:pass }),
    });
    if (r.ok) { localStorage.setItem("crm_auth","1"); router.push("/dashboard"); }
    else { setErr("Invalid email or password"); setLoad(false); }
  };

  const label = {display:"block",fontSize:11,fontWeight:700,color:"#8899b0",textTransform:"uppercase",letterSpacing:".6px",marginBottom:7};

  return (
    <div style={{minHeight:"var(--vh100)",display:"flex",background:"#07090f",
      backgroundImage:"radial-gradient(ellipse 60% 50% at 20% 0%,rgba(37,211,102,.10),transparent), radial-gradient(ellipse 50% 40% at 100% 100%,rgba(0,201,212,.07),transparent)"}}>

      {/* Brand panel (desktop) */}
      <div className="login-brand" style={{flex:1,padding:"56px 64px",flexDirection:"column",justifyContent:"space-between",
        borderRight:"1px solid #1c2a3f"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:42,height:42,borderRadius:12,background:"linear-gradient(135deg,#25d366,#00c9d4)",color:"#04130a",
            display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 6px 20px rgba(37,211,102,.3)"}}>
            <Flower2 size={24} strokeWidth={2.2}/>
          </div>
          <div style={{fontWeight:800,fontSize:18}}>HKM Vizag CRM</div>
        </div>
        <div>
          <h2 style={{fontSize:38,fontWeight:800,lineHeight:1.15,letterSpacing:"-1px",maxWidth:460}}>
            Every devotee,<br/>one conversation away.
          </h2>
          <p style={{color:"#8899b0",fontSize:15,marginTop:14,maxWidth:420,lineHeight:1.6}}>
            Manage WhatsApp outreach for Hare Krishna Movement Visakhapatnam from a single workspace.
          </p>
          <div style={{marginTop:32,display:"flex",flexDirection:"column",gap:16}}>
            {FEATURES.map(({Icon,t,d})=>(
              <div key={t} style={{display:"flex",gap:14,alignItems:"center"}}>
                <div style={{width:38,height:38,borderRadius:10,background:"rgba(37,211,102,.12)",border:"1px solid rgba(37,211,102,.22)",
                  color:"#25d366",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Icon size={18}/></div>
                <div><div style={{fontWeight:700,fontSize:14}}>{t}</div><div style={{color:"#8899b0",fontSize:12.5}}>{d}</div></div>
              </div>
            ))}
          </div>
        </div>
        <div style={{fontSize:12,color:"#5a6b82"}}>Hare Krishna Movement, Visakhapatnam</div>
      </div>

      {/* Form */}
      <div style={{flex:"0 0 auto",width:"100%",maxWidth:520,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
        <div style={{width:"100%",maxWidth:400}}>
          <div className="login-mobile-logo" style={{textAlign:"center",marginBottom:24}}>
            <div style={{width:54,height:54,margin:"0 auto 12px",borderRadius:16,background:"linear-gradient(135deg,#25d366,#00c9d4)",
              color:"#04130a",display:"flex",alignItems:"center",justifyContent:"center"}}><Flower2 size={30} strokeWidth={2.2}/></div>
            <h1 style={{fontSize:22,fontWeight:800}}>HKM Vizag CRM</h1>
          </div>
          <div className="ui-card" style={{padding:28}}>
            <h2 style={{fontSize:20,fontWeight:800,letterSpacing:"-.3px"}}>Welcome back</h2>
            <p style={{color:"#8899b0",fontSize:13,marginTop:4,marginBottom:22}}>Sign in to your admin workspace</p>
            <form onSubmit={submit}>
              <div style={{marginBottom:14}}>
                <label style={label}>Email</label>
                <Field Icon={Mail} type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="admin@hkmvizag.org"/>
              </div>
              <div style={{marginBottom:18}}>
                <label style={label}>Password</label>
                <Field Icon={Lock} type="password" required value={pass} onChange={e=>setPass(e.target.value)} placeholder="Enter your password"/>
              </div>
              {err && <div style={{display:"flex",alignItems:"center",gap:8,color:"#ff7a70",fontSize:13,fontWeight:600,marginBottom:14,
                padding:"9px 12px",background:"rgba(244,67,54,.1)",border:"1px solid rgba(244,67,54,.25)",borderRadius:9}}>
                <AlertTriangle size={15}/>{err}</div>}
              <button type="submit" disabled={load} className="ui-btn primary" style={{width:"100%",padding:"12px",fontSize:14.5}}>
                {load ? <><Loader2 size={16} style={{animation:"spin .8s linear infinite"}}/>Signing in…</> : <>Sign in<ArrowRight size={16}/></>}
              </button>
            </form>
          </div>
        </div>
      </div>
      <style>{`
        .login-brand{display:none}
        @media (min-width:960px){ .login-brand{display:flex} .login-mobile-logo{display:none} }
      `}</style>
    </div>
  );
}
