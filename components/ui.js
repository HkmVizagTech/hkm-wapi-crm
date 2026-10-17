"use client";
/* Shared UI primitives — styling lives in app/globals.css (.ui-*, .page-*, .stat-*). */
import { Loader2, Inbox } from "lucide-react";

export function PageHeader({ icon: Icon, title, subtitle, actions }) {
  return (
    <div className="page-head">
      {Icon && <div className="ph-icon"><Icon size={21} strokeWidth={2.1}/></div>}
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="ph-actions">{actions}</div>}
    </div>
  );
}

export function Card({ title, icon: Icon, actions, pad = true, className = "", style, children }) {
  return (
    <div className={`ui-card ${pad ? "ui-card-pad" : ""} ${className}`} style={style}>
      {(title || actions) && (
        <div className="ui-card-title" style={{ justifyContent:"space-between" }}>
          <span style={{ display:"flex", alignItems:"center", gap:8 }}>
            {Icon && <Icon size={16} color="var(--brand)"/>}{title}
          </span>
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}

export function StatCard({ icon: Icon, label, value, color = "var(--brand)", loading, hint }) {
  return (
    <div className="ui-card stat-card card-hover">
      <div className="bar" style={{ background:color }}/>
      <div className="ico" style={{ background:`color-mix(in srgb, ${color} 16%, transparent)`, color }}>
        {Icon && <Icon size={18}/>}
      </div>
      <div className="val" style={{ color }}>
        {loading ? <div className="skeleton" style={{ height:28, width:70 }}/> : value}
      </div>
      <div className="lbl">{label}{hint && <span style={{ color:"var(--tx3)", fontWeight:500 }}> · {hint}</span>}</div>
    </div>
  );
}

export function Badge({ tone = "", icon: Icon, children, style }) {
  return <span className={`ui-badge ${tone}`} style={style}>{Icon && <Icon size={11}/>}{children}</span>;
}

export function Btn({ variant = "", size = "", icon: Icon, loading, children, className = "", ...rest }) {
  return (
    <button className={`ui-btn ${variant} ${size} ${className}`} disabled={loading || rest.disabled} {...rest}>
      {loading ? <Loader2 size={14} style={{ animation:"spin .8s linear infinite" }}/> : Icon && <Icon size={size === "sm" ? 13 : 15}/>}
      {children}
    </button>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, hint, action }) {
  return (
    <div style={{ textAlign:"center", padding:"44px 20px", color:"var(--tx3)" }}>
      <div style={{ width:54, height:54, margin:"0 auto 12px", borderRadius:16, display:"flex", alignItems:"center",
        justifyContent:"center", background:"var(--card2)", border:"1px solid var(--line)", color:"var(--tx2)" }}>
        <Icon size={24}/>
      </div>
      <p style={{ fontSize:14, fontWeight:700, color:"var(--tx2)" }}>{title}</p>
      {hint && <p style={{ fontSize:12, marginTop:4 }}>{hint}</p>}
      {action && <div style={{ marginTop:14 }}>{action}</div>}
    </div>
  );
}

export function Spinner({ size = 18 }) {
  return <Loader2 size={size} style={{ animation:"spin .8s linear infinite", color:"var(--brand)" }}/>;
}
