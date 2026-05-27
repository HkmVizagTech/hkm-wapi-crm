"use client";
import { useState } from "react";
import { PageHeader, Badge, Card, Button, Input } from "@/components/ui";
import { TEMPLATES } from "@/lib/utils";

export default function TemplatesPage() {
  const [search, setSearch] = useState("");
  const [catF,   setCatF]   = useState("ALL");
  const [statF,  setStatF]  = useState("ALL");
  const [expanded, setExpanded] = useState(null);

  const cats = ["ALL", ...new Set(TEMPLATES.map(t => t.category))];
  const list = TEMPLATES.filter(t =>
    (catF  === "ALL" || t.category === catF) &&
    (statF === "ALL" || t.status   === statF) &&
    (!search || t.name.toLowerCase().includes(search.toLowerCase()) || t.body.toLowerCase().includes(search.toLowerCase()))
  );

  const sc = s => s === "APPROVED" ? "#25d366" : s === "PENDING" ? "#ffb300" : "#f44336";

  return (
    <div className="p-6 fade-up">
      <PageHeader
        title="📋 Templates"
        subtitle={`${TEMPLATES.filter(t=>t.status==="APPROVED").length} approved · ${TEMPLATES.length} total`}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <Input placeholder="🔍 Search templates…" value={search}
          onChange={e=>setSearch(e.target.value)} className="flex-1 min-w-48 mb-0"/>
        <div className="flex gap-2 p-1 rounded-xl" style={{ background:"#0d1117", border:"1px solid #1c2a3f" }}>
          {cats.map(c => (
            <button key={c} onClick={()=>setCatF(c)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={{ background:catF===c?"#25d366":"transparent", color:catF===c?"#000":"#8899b0" }}>
              {c}
            </button>
          ))}
        </div>
        <div className="flex gap-2 p-1 rounded-xl" style={{ background:"#0d1117", border:"1px solid #1c2a3f" }}>
          {["ALL","APPROVED","PENDING"].map(s => (
            <button key={s} onClick={()=>setStatF(s)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={{
                background: statF===s ? (s==="APPROVED"?"rgba(37,211,102,0.2)":s==="PENDING"?"rgba(255,179,0,0.2)":"#1c2a3f") : "transparent",
                color: s==="APPROVED"?"#25d366":s==="PENDING"?"#ffb300":"#8899b0"
              }}>
              {s === "ALL" ? "All Status" : s}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {list.map(t => {
          const isExp = expanded === t.id;
          return (
            <div key={t.id} className="rounded-xl border overflow-hidden transition-all"
              style={{
                background:"#111827", borderColor:"#1c2a3f",
                borderLeft:`4px solid ${t.category==="MARKETING"?"#ffb300":"#00c9d4"}`
              }}>
              <div className="p-4">
                {/* Header row */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="font-extrabold text-xs break-all" style={{ fontFamily:"'JetBrains Mono',monospace" }}>
                      {t.name}
                    </div>
                    <div className="flex gap-2 mt-1.5 flex-wrap">
                      <Badge color={t.category==="MARKETING"?"#ffb300":"#00c9d4"}>{t.category}</Badge>
                      <span className="text-xs" style={{ color:"#445566" }}>{t.language}</span>
                      {t.header && <Badge color="#2979ff">{String(t.header).replace(/:.+/,"")}</Badge>}
                    </div>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ background:`${sc(t.status)}18`, color:sc(t.status) }}>
                    {t.status}
                  </span>
                </div>

                {/* Body preview */}
                <div className="rounded-lg p-3 mb-3 text-xs leading-relaxed"
                  style={{ background:"#0d1117", color:"#8899b0",
                    maxHeight: isExp ? "none" : "4.5rem", overflow:"hidden" }}>
                  {t.body}
                </div>

                {/* Params */}
                {t.params.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {t.params.map((p,i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded-full font-bold"
                        style={{ background:"rgba(41,121,255,0.12)", color:"#2979ff" }}>
                        {`{{${i+1}}}`} {p}
                      </span>
                    ))}
                  </div>
                )}

                {/* Buttons */}
                {(t.buttons||[]).map((b,i) => (
                  <span key={i} className="text-xs px-2 py-0.5 rounded-full font-bold mr-1"
                    style={{ background:"rgba(156,39,176,0.12)", color:"#ce93d8" }}>
                    🔗 {b}
                  </span>
                ))}

                <button onClick={()=>setExpanded(isExp ? null : t.id)}
                  className="text-xs mt-2 font-semibold" style={{ color:"#445566" }}>
                  {isExp ? "Show less ↑" : "Show full body ↓"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {list.length === 0 && (
        <div className="text-center py-16" style={{ color:"#445566" }}>
          <div className="text-4xl mb-3">📋</div>
          <p className="font-semibold" style={{ color:"#8899b0" }}>No templates match</p>
        </div>
      )}
    </div>
  );
}
