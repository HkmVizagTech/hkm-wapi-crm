"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email,    setEmail]   = useState("");
  const [password, setPass]    = useState("");
  const [loading,  setLoading] = useState(false);
  const [error,    setError]   = useState("");
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (res.ok) {
      localStorage.setItem("crm_auth", "true");
      router.push("/dashboard");
    } else {
      setError(data.error || "Invalid credentials");
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center",
      justifyContent:"center", background:"#07090f", padding:"20px",
      backgroundImage:"radial-gradient(ellipse 60% 40% at 50% 0%, rgba(37,211,102,0.08), transparent)" }}>
      <div style={{ width:"100%", maxWidth:420 }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ width:64, height:64, margin:"0 auto 16px",
            borderRadius:18, background:"linear-gradient(135deg,#25d366,#00c9d4)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:30, boxShadow:"0 0 40px rgba(37,211,102,0.25)" }}>🕉</div>
          <h1 style={{ fontSize:26, fontWeight:800, color:"#e8edf5", letterSpacing:"-0.5px" }}>
            HKM Vizag CRM
          </h1>
          <p style={{ color:"#8899b0", fontSize:14, marginTop:6 }}>
            WhatsApp Message Management
          </p>
        </div>

        <div style={{ background:"#111827", border:"1px solid #1c2a3f",
          borderRadius:16, padding:28 }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom:16 }}>
              <label style={{ display:"block", fontSize:11, fontWeight:700,
                color:"#8899b0", textTransform:"uppercase", letterSpacing:"0.6px",
                marginBottom:8 }}>Email</label>
              <input type="email" required value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@hkmvizag.org"
                style={{ width:"100%", background:"#0d1117", border:"1px solid #1c2a3f",
                  borderRadius:10, padding:"12px 14px", color:"#e8edf5", fontSize:14,
                  outline:"none", boxSizing:"border-box" }}/>
            </div>
            <div style={{ marginBottom:16 }}>
              <label style={{ display:"block", fontSize:11, fontWeight:700,
                color:"#8899b0", textTransform:"uppercase", letterSpacing:"0.6px",
                marginBottom:8 }}>Password</label>
              <input type="password" required value={password}
                onChange={e => setPass(e.target.value)}
                placeholder="••••••••"
                style={{ width:"100%", background:"#0d1117", border:"1px solid #1c2a3f",
                  borderRadius:10, padding:"12px 14px", color:"#e8edf5", fontSize:14,
                  outline:"none", boxSizing:"border-box" }}/>
            </div>
            {error && (
              <div style={{ color:"#f44336", fontSize:13, fontWeight:600,
                marginBottom:14, padding:"8px 12px", background:"rgba(244,67,54,0.1)",
                borderRadius:8, border:"1px solid rgba(244,67,54,0.3)" }}>
                ⚠ {error}
              </div>
            )}
            <button type="submit" disabled={loading}
              style={{ width:"100%", padding:"13px", borderRadius:10, border:"none",
                background:"linear-gradient(135deg,#25d366,#1aad52)",
                color:"#000", fontSize:15, fontWeight:800, cursor:"pointer",
                opacity: loading ? 0.6 : 1 }}>
              {loading ? "Signing in…" : "→ Sign In"}
            </button>
          </form>
        </div>
        <p style={{ textAlign:"center", fontSize:11, color:"#445566", marginTop:14 }}>
          Hare Krishna Movement Visakhapatnam
        </p>
      </div>
    </div>
  );
}
