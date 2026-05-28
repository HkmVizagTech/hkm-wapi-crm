"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const [email, setEmail]     = useState("");
  const [pass,  setPass]      = useState("");
  const [err,   setErr]       = useState("");
  const [load,  setLoad]      = useState(false);
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

  return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",
      background:"#07090f",padding:20,backgroundImage:"radial-gradient(ellipse 60% 40% at 50% 0%,rgba(37,211,102,.08),transparent)"}}>
      <div style={{width:"100%",maxWidth:400}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{width:60,height:60,margin:"0 auto 12px",borderRadius:16,
            background:"linear-gradient(135deg,#25d366,#00c9d4)",
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:28}}>🕉</div>
          <h1 style={{fontSize:24,fontWeight:800,color:"#e8edf5"}}>HKM Vizag CRM</h1>
          <p style={{color:"#8899b0",fontSize:13,marginTop:4}}>WhatsApp Message Management</p>
        </div>
        <div style={{background:"#111827",border:"1px solid #1c2a3f",borderRadius:14,padding:24}}>
          <form onSubmit={submit}>
            <div style={{marginBottom:14}}>
              <label style={{display:"block",fontSize:11,fontWeight:700,color:"#8899b0",
                textTransform:"uppercase",letterSpacing:".5px",marginBottom:7}}>Email</label>
              <input type="email" required value={email} onChange={e=>setEmail(e.target.value)}
                placeholder="admin@hkmvizag.org"
                style={{width:"100%",background:"#0d1117",border:"1px solid #1c2a3f",borderRadius:10,
                  padding:"11px 14px",color:"#e8edf5",fontSize:14,outline:"none",boxSizing:"border-box"}}/>
            </div>
            <div style={{marginBottom:16}}>
              <label style={{display:"block",fontSize:11,fontWeight:700,color:"#8899b0",
                textTransform:"uppercase",letterSpacing:".5px",marginBottom:7}}>Password</label>
              <input type="password" required value={pass} onChange={e=>setPass(e.target.value)}
                placeholder="••••••••"
                style={{width:"100%",background:"#0d1117",border:"1px solid #1c2a3f",borderRadius:10,
                  padding:"11px 14px",color:"#e8edf5",fontSize:14,outline:"none",boxSizing:"border-box"}}/>
            </div>
            {err && <div style={{color:"#f44336",fontSize:13,fontWeight:600,marginBottom:12,
              padding:"8px 12px",background:"rgba(244,67,54,.1)",borderRadius:8}}>⚠ {err}</div>}
            <button type="submit" disabled={load}
              style={{width:"100%",padding:"12px",border:"none",borderRadius:10,
                background:"linear-gradient(135deg,#25d366,#1aad52)",
                color:"#000",fontSize:15,fontWeight:800,cursor:"pointer",opacity:load?.6:1}}>
              {load ? "Signing in…" : "→ Sign In"}
            </button>
          </form>
        </div>
        <p style={{textAlign:"center",fontSize:11,color:"#445566",marginTop:12}}>
          Hare Krishna Movement Visakhapatnam
        </p>
      </div>
    </div>
  );
}
