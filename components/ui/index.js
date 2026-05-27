"use client";

/* ─── Button ─────────────────────────────────────────── */
export function Button({ children, variant = "primary", size = "md", onClick, disabled, className = "", type = "button" }) {
  const base = "inline-flex items-center gap-2 font-bold rounded-xl transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed";
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2.5 text-sm", lg: "px-6 py-3 text-base" };
  const variants = {
    primary: "bg-gradient-to-r from-[#25d366] to-[#1aad52] text-black hover:opacity-90",
    ghost:   "bg-transparent text-[#8899b0] border border-[#1c2a3f] hover:text-white hover:border-[#243650]",
    danger:  "bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20",
    teal:    "bg-gradient-to-r from-[#00c9d4] to-[#0097a7] text-black hover:opacity-90",
    amber:   "bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20",
    blue:    "bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20",
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
}

/* ─── Input ──────────────────────────────────────────── */
export function Input({ label, hint, error, className = "", ...props }) {
  return (
    <div className="mb-3">
      {label && <label className="block text-xs font-bold text-[#8899b0] uppercase tracking-wider mb-1.5">{label}</label>}
      <input
        className={`w-full bg-[#0d1117] border ${error ? "border-red-500" : "border-[#1c2a3f]"} rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-[#445566] focus:outline-none focus:border-[#25d366] focus:ring-1 focus:ring-[#25d366]/30 ${className}`}
        {...props}/>
      {hint  && <p className="text-xs text-[#445566] mt-1">{hint}</p>}
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}

/* ─── Textarea ───────────────────────────────────────── */
export function Textarea({ label, hint, error, className = "", ...props }) {
  return (
    <div className="mb-3">
      {label && <label className="block text-xs font-bold text-[#8899b0] uppercase tracking-wider mb-1.5">{label}</label>}
      <textarea
        className={`w-full bg-[#0d1117] border ${error ? "border-red-500" : "border-[#1c2a3f]"} rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-[#445566] focus:outline-none focus:border-[#25d366] focus:ring-1 focus:ring-[#25d366]/30 resize-y min-h-[80px] leading-relaxed ${className}`}
        {...props}/>
      {hint  && <p className="text-xs text-[#445566] mt-1">{hint}</p>}
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}

/* ─── Select ─────────────────────────────────────────── */
export function Select({ label, hint, children, className = "", ...props }) {
  return (
    <div className="mb-3">
      {label && <label className="block text-xs font-bold text-[#8899b0] uppercase tracking-wider mb-1.5">{label}</label>}
      <select
        className={`w-full bg-[#0d1117] border border-[#1c2a3f] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#25d366] cursor-pointer ${className}`}
        {...props}>
        {children}
      </select>
      {hint && <p className="text-xs text-[#445566] mt-1">{hint}</p>}
    </div>
  );
}

/* ─── Card ───────────────────────────────────────────── */
export function Card({ children, className = "", accent }) {
  return (
    <div className={`bg-[#111827] border border-[#1c2a3f] rounded-xl p-5 ${accent ? `border-t-[3px]` : ""} ${className}`}
      style={accent ? { borderTopColor: accent } : {}}>
      {children}
    </div>
  );
}

/* ─── Badge ──────────────────────────────────────────── */
export function Badge({ children, color = "#25d366" }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border"
      style={{ background: `${color}18`, color, borderColor: `${color}30` }}>
      {children}
    </span>
  );
}

/* ─── Spinner ────────────────────────────────────────── */
export function Spinner({ size = 16, color = "#25d366" }) {
  return (
    <div className="spin flex-shrink-0 rounded-full border-2"
      style={{ width: size, height: size, borderColor: "#1c2a3f", borderTopColor: color }}/>
  );
}

/* ─── Modal ──────────────────────────────────────────── */
export function Modal({ open, onClose, title, children, width = "max-w-lg" }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`bg-[#111827] border border-[#1c2a3f] rounded-2xl w-full ${width} max-h-[90vh] flex flex-col fade-up`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1c2a3f]">
          <h2 className="font-extrabold text-base">{title}</h2>
          <button onClick={onClose} className="text-[#8899b0] hover:text-white text-xl leading-none">×</button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-4">{children}</div>
      </div>
    </div>
  );
}

/* ─── Table ──────────────────────────────────────────── */
export function Table({ headers, rows, empty = "No data found." }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[#1c2a3f]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#1c2a3f]">
            {headers.map((h, i) => (
              <th key={i} className="px-4 py-3 text-left text-xs font-bold text-[#8899b0] uppercase tracking-wider whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={headers.length} className="px-4 py-10 text-center text-[#445566]">{empty}</td></tr>
          ) : rows.map((row, i) => (
            <tr key={i} className="border-b border-[#1c2a3f]/50 hover:bg-white/[0.02] transition-colors">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3 whitespace-nowrap">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── PageHeader ─────────────────────────────────────── */
export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-xl font-extrabold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-[#8899b0] mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ─── StatCard ───────────────────────────────────────── */
export function StatCard({ label, value, icon, color, subtext }) {
  return (
    <div className="bg-[#111827] border border-[#1c2a3f] rounded-xl p-5" style={{ borderTop: `3px solid ${color}` }}>
      <div className="text-2xl mb-3">{icon}</div>
      <div className="text-3xl font-extrabold tracking-tight" style={{ color }}>{value}</div>
      <div className="text-xs text-[#8899b0] font-semibold mt-1">{label}</div>
      {subtext && <div className="text-xs text-[#445566] mt-0.5">{subtext}</div>}
    </div>
  );
}

/* ─── Toast ──────────────────────────────────────────── */
export function Toast({ message, type = "success", onClose }) {
  const colors = { success: "#25d366", error: "#f44336", warning: "#ffb300" };
  const icons  = { success: "✓", error: "✕", warning: "⚠" };
  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm cursor-pointer fade-up shadow-2xl"
      style={{ background: colors[type], color: type === "error" ? "#fff" : "#000" }}
      onClick={onClose}>
      {icons[type]} {message}
    </div>
  );
}
