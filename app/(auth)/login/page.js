"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail]     = useState("");
  const [password, setPass]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    const res = await signIn("credentials", { email, password, redirect: false });
    if (res?.error) { setError("Invalid credentials"); setLoading(false); }
    else window.location.href = "/dashboard";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#07090f] px-4">
      <div className="w-full max-w-md bg-[#111827] border border-[#1c2a3f] rounded-2xl p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#25d366] to-[#00c9d4] flex items-center justify-center text-3xl">
            🕉
          </div>
          <h1 className="text-2xl font-extrabold">HKM Vizag CRM</h1>
          <p className="text-[#8899b0] text-sm mt-1">WhatsApp Message Management</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#8899b0] uppercase tracking-wider mb-2">
              Email
            </label>
            <input type="email" required value={email} onChange={e=>setEmail(e.target.value)}
              className="w-full bg-[#0d1117] border border-[#1c2a3f] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#25d366]"
              placeholder="admin@hkmvizag.org"/>
          </div>
          <div>
            <label className="block text-xs font-bold text-[#8899b0] uppercase tracking-wider mb-2">
              Password
            </label>
            <input type="password" required value={password} onChange={e=>setPass(e.target.value)}
              className="w-full bg-[#0d1117] border border-[#1c2a3f] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#25d366]"
              placeholder="••••••••"/>
          </div>
          {error && <p className="text-red-400 text-sm font-semibold">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-[#25d366] to-[#1aad52] text-black font-bold rounded-xl text-sm disabled:opacity-40">
            {loading ? "Signing in…" : "→ Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
