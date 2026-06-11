"use client";
import { useState, useEffect, useRef } from "react";
import { TEMPLATES, relTime } from "@/lib/utils";

const C = {
  g1:"#25d366", g2:"#1aad52", teal:"#00c9d4", blue:"#2979ff",
  amber:"#ffb300", red:"#f44336", purple:"#9c27b0",
  card:"#111827", surf:"#0d1117", border:"#1c2a3f",
  tx:"#e8edf5", txs:"#8899b0", txd:"#445566",
  waBg:"#0b1014",
};

const AVC = [C.g1, C.teal, C.blue, C.purple, C.amber];
const avc  = s => AVC[(s||"A").charCodeAt(0) % AVC.length];

function Avatar({ name, size=40 }) {
  const c = avc(name||"?");
  return (
    <div style={{
      width:size, height:size, borderRadius:"50%", flexShrink:0,
      background:`${c}20`, border:`2px solid ${c}40`,
      display:"flex", alignItems:"center", justifyContent:"center",
      fontSize:size*.34, fontWeight:800, color:c,
    }}>
      {(name||"?").slice(0,2).toUpperCase()}
    </div>
  );
}

function parseBody(s){try{const c=typeof s==="string"?JSON.parse(s):s;if(Array.isArray(c))return c.find(x=>x.type==="BODY")?.text||"";}catch{}return s||"";}
function parseParams(s){const b=parseBody(s);return[...b.matchAll(/\{\{(\d+)\}\}/g)].map(m=>`Param ${m[1]}`);}
function normalizeTpl(t){
  if(t.components)return{id:t.id,name:t.name,status:t.status,category:t.category,
    language:t.language,body:parseBody(t.components),params:parseParams(t.components)};
  return t;
}

/* ── Compose bottom sheet ── */
function ComposeSheet({ contact, token, onSent, onClose }) {
  const [tab,    setTab]   = useState("text");
  const [msg,    setMsg]   = useState("");
  const [tplId,  setTplId] = useState("");
  const [tplP,   setTplP]  = useState({});
  const [loading,setLoad]  = useState(false);
  const [err,    setErr]   = useState("");
  const [templates,setTpls]= useState([]);
  const textRef = useRef();

  useEffect(() => {
    fetch("/api/templates").then(r=>r.json()).then(d=>{
      if(d.templates?.length) setTpls(d.templates.map(normalizeTpl));
    });
    if(tab==="text") setTimeout(()=>textRef.current?.focus(), 300);
  }, []);

  const approved = templates.filter(t=>t.status==="APPROVED");
  const tpl      = approved.find(t=>t.id===tplId);
  const tplPList = tpl ? parseParams(tpl.components||tpl.body) : [];

  const send = async () => {
    if(tab==="text" && !msg.trim()) return;
    if(tab==="template" && !tpl) return;
    setLoad(true); setErr("");
    try {
      const body = tab==="text"
        ? { phone:contact.phone, type:"text", message:msg, contactName:contact.name }
        : { phone:contact.phone, type:"template", templateName:tpl.name,
            templateLang:tpl.language||"en",
            params:tpl.params.map((_,i)=>tplP[i]||""),
            contactName:contact.name };
      const r = await fetch("/api/messages/send",{
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify(body),
      });
      const d = await r.json();
      if(r.ok) {
        const preview = tab==="text" ? msg : `[Template: ${tpl.name}]`;
        onSent({ _id:Date.now()+"", direction:"outbound", type:tab,
          body:preview, status:"sent",
          sentAt:new Date().toISOString(), wamid:d.wamid||"" });
        setMsg(""); setTplId(""); setTplP({});
      } else { setErr(d.error||"Send failed"); }
    } catch(e) { setErr(e.message); }
    setLoad(false);
  };

  const IS = {
    width:"100%", background:C.surf, border:`1px solid ${C.border}`,
    borderRadius:10, padding:"10px 13px", color:C.tx, fontSize:14,
    outline:"none", boxSizing:"border-box", fontFamily:"inherit",
  };

  return (
    <div style={{position:"fixed",inset:0,zIndex:100,
      display:"flex",flexDirection:"column",justifyContent:"flex-end",
      background:"rgba(0,0,0,.7)"}}>
      <div style={{background:C.card,borderRadius:"20px 20px 0 0",
        border:`1px solid ${C.border}`,maxHeight:"85vh",
        display:"flex",flexDirection:"column",
        animation:"slideUp .25s ease"}}>
        {/* Handle */}
        <div style={{display:"flex",justifyContent:"center",padding:"10px 0 4px"}}>
          <div style={{width:40,height:4,borderRadius:2,background:C.border}}/>
        </div>
        {/* Header */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
          padding:"0 16px 10px"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <Avatar name={contact.name} size={36}/>
            <div>
              <div style={{fontWeight:800,fontSize:14}}>{contact.name||contact.phone}</div>
              <div style={{fontSize:11,color:C.txs}}>{contact.phone}</div>
            </div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",
            color:C.txs,fontSize:24,cursor:"pointer",lineHeight:1}}>×</button>
        </div>
        {/* Tabs */}
        <div style={{display:"flex",gap:3,margin:"0 16px 12px",
          background:C.surf,borderRadius:10,padding:3}}>
          {[{id:"text",l:"💬 Text"},{id:"template",l:"📋 Template"}].map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{
              flex:1,padding:"8px 0",borderRadius:8,border:"none",
              background:tab===t.id?C.g1:"transparent",
              color:tab===t.id?"#000":C.txs,
              fontSize:13,fontWeight:700,cursor:"pointer"}}>
              {t.l}
            </button>
          ))}
        </div>
        {/* Content */}
        <div style={{flex:1,overflowY:"auto",padding:"0 16px"}}>
          {tab==="text" && <>
            <textarea ref={textRef}
              style={{...IS,minHeight:100,resize:"none",lineHeight:1.6}}
              placeholder="Type your message…"
              value={msg} onChange={e=>setMsg(e.target.value)}
              maxLength={4096}
              onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey&&!e.ctrlKey){e.preventDefault();send();}}}/>
            <p style={{fontSize:11,color:C.txd,marginTop:4}}>{msg.length}/4096 · Enter to send</p>
          </>}
          {tab==="template" && <>
            <div style={{marginBottom:10}}>
              <label style={{display:"block",fontSize:11,fontWeight:700,color:C.txs,
                textTransform:"uppercase",letterSpacing:".5px",marginBottom:6}}>
                Template ({approved.length} approved)
              </label>
              <select style={IS} value={tplId}
                onChange={e=>{setTplId(e.target.value);setTplP({});}}>
                <option value="">— select a template —</option>
                {approved.map(t=>(
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            {tpl && <>
              <div style={{background:C.surf,borderRadius:8,padding:10,
                border:`1px solid ${C.border}`,marginBottom:10,
                fontSize:12,color:C.txs,lineHeight:1.6,whiteSpace:"pre-wrap"}}>
                {tpl.body}
              </div>
              {tpl.params.map((p,i)=>(
                <div key={i} style={{marginBottom:10}}>
                  <label style={{display:"block",fontSize:11,fontWeight:700,
                    color:C.txs,textTransform:"uppercase",letterSpacing:".5px",marginBottom:6}}>
                    {`{{${i+1}}}`} — {p}
                  </label>
                  <input style={IS} placeholder={`Enter ${p}`}
                    value={tplP[i]||""}
                    onChange={e=>setTplP({...tplP,[i]:e.target.value})}/>
                </div>
              ))}
              {tpl.params.length===0&&(
                <p style={{fontSize:12,color:C.txd,marginBottom:10}}>
                  No variables — ready to send as-is.
                </p>
              )}
            </>}
          </>}
          {err && (
            <div style={{padding:"8px 12px",borderRadius:8,marginBottom:10,
              background:`${C.red}10`,border:`1px solid ${C.red}30`,
              color:C.red,fontSize:13,fontWeight:600}}>
              ✕ {err}
            </div>
          )}
        </div>
        {/* Send button */}
        <div style={{padding:"12px 16px 32px",display:"flex",gap:10}}>
          <button onClick={onClose} style={{padding:"12px 20px",borderRadius:10,
            border:`1px solid ${C.border}`,background:"transparent",
            color:C.txs,fontWeight:700,fontSize:14,cursor:"pointer",flexShrink:0}}>
            Cancel
          </button>
          <button onClick={send}
            disabled={loading||(tab==="text"?!msg.trim():!tpl)}
            style={{flex:1,padding:"12px",borderRadius:10,border:"none",
              background:loading||(tab==="text"?!msg.trim():!tpl)
                ?C.border:`linear-gradient(135deg,${C.g1},${C.g2})`,
              color:loading||(tab==="text"?!msg.trim():!tpl)?C.txd:"#000",
              fontWeight:800,fontSize:14,cursor:"pointer",
              display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
            {loading ? (
              <><div style={{width:16,height:16,border:`2px solid rgba(0,0,0,.2)`,
                borderTopColor:"#000",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>
              Sending…</>
            ) : "⚡ Send"}
          </button>
        </div>
      </div>
      <style>{`
        @keyframes slideUp{from{transform:translateY(100%);opacity:0}to{transform:none;opacity:1}}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>
    </div>
  );
}

/* ── Main Inbox ── */
export default function Inbox() {
  const [convos,    setConvos]   = useState([]);
  const [selected,  setSelected] = useState(null);
  const [messages,  setMessages] = useState([]);
  const [compose,   setCompose]  = useState(false);
  const [search,    setSearch]   = useState("");
  const [loadMsg,   setLoadMsg]  = useState(false);
  const endRef   = useRef();
  const pollRef  = useRef();
  const msgPoll  = useRef();

  const loadConvos = async () => {
    const r = await fetch("/api/inbox");
    const d = await r.json();
    setConvos(d.conversations||[]);
  };

  useEffect(() => {
    loadConvos();
    pollRef.current = setInterval(loadConvos, 5000);
    return () => clearInterval(pollRef.current);
  }, []);

  const selectConvo = async (c) => {
    setSelected(c);
    setLoadMsg(true);
    clearInterval(msgPoll.current);
    const loadMsgs = async () => {
      const r = await fetch(`/api/inbox/${encodeURIComponent(c.phone)}`);
      const d = await r.json();
      setMessages(d.messages||[]);
      setLoadMsg(false);
    };
    await loadMsgs();
    msgPoll.current = setInterval(loadMsgs, 4000);
  };

  useEffect(() => {
    endRef.current?.scrollIntoView({behavior:"smooth"});
  }, [messages]);

  useEffect(() => {
    return () => clearInterval(msgPoll.current);
  }, []);

  const handleSent = (msg) => {
    setCompose(false);
    setMessages(prev=>[...prev, msg]);
    loadConvos();
  };

  const goBack = () => {
    setSelected(null);
    clearInterval(msgPoll.current);
    setMessages([]);
    loadConvos();
  };

  const filtered = convos.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );

  const totalUnread = convos.reduce((a,c)=>a+(c.unread||0),0);

  const statusIcon = s => s==="read"?"👁":s==="delivered"?"✓✓":s==="sent"?"✓":s==="failed"?"✕":"";
  const statusColor= s => ({read:C.g1,delivered:C.teal,sent:C.blue,failed:C.red})[s]||C.txd;

  /* ── Chat View ── */
  if (selected) return (
    <div style={{display:"flex",flexDirection:"column",
      height:"100%",background:C.waBg}}>
      {/* Chat header */}
      <div style={{background:C.card,borderBottom:`1px solid ${C.border}`,
        padding:"10px 14px",display:"flex",alignItems:"center",
        gap:12,flexShrink:0}}>
        <button onClick={goBack} style={{background:"none",border:"none",
          color:C.txs,fontSize:22,cursor:"pointer",padding:"0 4px 0 0",
          lineHeight:1,flexShrink:0}}>←</button>
        <Avatar name={selected.name} size={40}/>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:800,fontSize:15,overflow:"hidden",
            textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{selected.name||selected.phone}</div>
          <div style={{fontSize:11,color:C.txs,fontFamily:"'JetBrains Mono',monospace",
            overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
            {selected.phone}
          </div>
        </div>
        <button onClick={()=>setCompose(true)}
          style={{padding:"8px 14px",borderRadius:20,border:"none",
            background:`linear-gradient(135deg,${C.g1},${C.g2})`,
            color:"#000",fontWeight:700,fontSize:13,cursor:"pointer",flexShrink:0}}>
          ✉ Reply
        </button>
      </div>

      {/* Messages */}
      <div style={{flex:1,overflowY:"auto",padding:"12px 14px",
        display:"flex",flexDirection:"column",gap:4}}>
        {loadMsg && (
          <p style={{textAlign:"center",color:C.txd,fontSize:13,padding:20}}>
            Loading messages…
          </p>
        )}
        {!loadMsg && messages.length===0 && (
          <div style={{textAlign:"center",color:C.txd,marginTop:60}}>
            <div style={{fontSize:40,marginBottom:10}}>🙏</div>
            <p style={{fontWeight:600,color:C.txs}}>No messages yet</p>
            <p style={{fontSize:13,marginTop:4}}>
              Tap <strong style={{color:C.g1}}>✉ Reply</strong> to start
            </p>
          </div>
        )}

        {/* Date grouping */}
        {messages.map((m, i) => {
          const isOut  = m.direction==="outbound";
          const showDate = i===0 ||
            new Date(m.sentAt).toDateString() !==
            new Date(messages[i-1].sentAt).toDateString();
          const timeStr = new Date(m.sentAt).toLocaleTimeString([],
            {hour:"2-digit",minute:"2-digit"});
          const dateStr = new Date(m.sentAt).toLocaleDateString("en-IN",
            {day:"numeric",month:"short",year:"numeric"});

          return (
            <div key={m._id||i}>
              {/* Date separator */}
              {showDate && (
                <div style={{display:"flex",alignItems:"center",
                  gap:10,margin:"10px 0",padding:"0 4px"}}>
                  <div style={{flex:1,height:1,background:C.border}}/>
                  <span style={{fontSize:11,color:C.txd,fontWeight:600,
                    padding:"2px 10px",borderRadius:20,
                    background:C.card,border:`1px solid ${C.border}`,
                    whiteSpace:"nowrap"}}>
                    {dateStr}
                  </span>
                  <div style={{flex:1,height:1,background:C.border}}/>
                </div>
              )}

              {/* Message bubble */}
              <div style={{display:"flex",
                justifyContent:isOut?"flex-end":"flex-start",
                marginBottom:2,alignItems:"flex-end",gap:6}}>
                {!isOut && (
                  <Avatar name={selected.name} size={26}/>
                )}
                <div style={{
                  maxWidth:"75%",
                  padding:"8px 12px 6px",
                  borderRadius:isOut?"18px 18px 4px 18px":"18px 18px 18px 4px",
                  background:isOut
                    ?`linear-gradient(135deg,${C.g2},${C.g1})`
                    :C.card,
                  border:isOut?"none":`1px solid ${C.border}`,
                  boxShadow:"0 1px 4px rgba(0,0,0,.3)",
                }}>
                  {/* Media type label */}
                  {m.type&&m.type!=="text"&&m.type!=="template"&&(
                    <div style={{fontSize:10,fontWeight:700,
                      color:isOut?"rgba(0,0,0,.5)":C.txs,
                      marginBottom:3,textTransform:"uppercase"}}>
                      {m.type}
                    </div>
                  )}
                  <p style={{
                    fontSize:14,lineHeight:1.55,margin:0,
                    color:isOut?"#000":C.tx,
                    whiteSpace:"pre-wrap",wordBreak:"break-word",
                  }}>{m.body}</p>
                  {/* Time + status */}
                  <div style={{display:"flex",alignItems:"center",
                    justifyContent:"flex-end",gap:4,marginTop:3}}>
                    <span style={{fontSize:10,
                      color:isOut?"rgba(0,0,0,.45)":C.txd}}>
                      {timeStr}
                    </span>
                    {isOut && (
                      <span style={{fontSize:12,color:statusColor(m.status)}}>
                        {statusIcon(m.status)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef}/>
      </div>

      {/* Quick reply bar */}
      <div style={{background:C.card,borderTop:`1px solid ${C.border}`,
        padding:"8px 14px 16px",flexShrink:0,
        paddingBottom:"max(16px,env(safe-area-inset-bottom,16px))"}}>
        <button onClick={()=>setCompose(true)}
          style={{width:"100%",padding:"11px 16px",borderRadius:12,
            border:`1px solid ${C.border}`,background:C.surf,
            color:C.txd,fontSize:14,textAlign:"left",cursor:"pointer",
            display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <span>Type a message…</span>
          <span style={{fontSize:18,color:C.g1}}>➤</span>
        </button>
      </div>

      {compose && (
        <ComposeSheet
          contact={selected}
          onSent={handleSent}
          onClose={()=>setCompose(false)}
        />
      )}
    </div>
  );

  /* ── Conversation List ── */
  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      {/* Header */}
      <div style={{background:C.card,borderBottom:`1px solid ${C.border}`,
        padding:"12px 14px",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",
          justifyContent:"space-between",marginBottom:10}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <h1 style={{fontSize:18,fontWeight:800}}>💬 Inbox</h1>
            {totalUnread>0 && (
              <span style={{background:C.g1,color:"#000",fontSize:11,
                fontWeight:800,padding:"1px 8px",borderRadius:20}}>
                {totalUnread}
              </span>
            )}
          </div>
          <button onClick={loadConvos}
            style={{background:"none",border:"none",
              color:C.txs,fontSize:18,cursor:"pointer"}}>↻</button>
        </div>
        {/* Search */}
        <input
          style={{width:"100%",background:C.surf,border:`1px solid ${C.border}`,
            borderRadius:10,padding:"9px 13px",color:C.tx,fontSize:13,
            outline:"none",boxSizing:"border-box"}}
          placeholder="🔍  Search conversations…"
          value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>

      {/* Conversation list */}
      <div style={{flex:1,overflowY:"auto"}}>
        {filtered.length===0 ? (
          <div style={{textAlign:"center",padding:"48px 20px",color:C.txd}}>
            <div style={{fontSize:44,marginBottom:12}}>💬</div>
            <p style={{fontWeight:600,color:C.txs,fontSize:15}}>No conversations yet</p>
            <p style={{fontSize:13,marginTop:6,lineHeight:1.6,maxWidth:240,margin:"8px auto 0"}}>
              Configure your Flaxxa webhook to receive incoming WhatsApp messages here
            </p>
          </div>
        ) : filtered.map(c => {
          const active = selected?.phone===c.phone;
          return (
            <div key={c.phone} onClick={()=>selectConvo(c)} style={{
              padding:"13px 14px",cursor:"pointer",
              display:"flex",gap:12,alignItems:"center",
              background:active?`${C.g1}08`:"transparent",
              borderLeft:`3px solid ${active?C.g1:"transparent"}`,
              borderBottom:`1px solid ${C.border}`,
              transition:"background .12s",
            }}>
              <div style={{position:"relative"}}>
                <Avatar name={c.name} size={48}/>
                {c.unread>0 && (
                  <span style={{position:"absolute",top:-2,right:-2,
                    width:18,height:18,borderRadius:"50%",
                    background:C.g1,color:"#000",
                    fontSize:10,fontWeight:800,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    border:`2px solid ${C.surf}`}}>
                    {c.unread > 9 ? "9+" : c.unread}
                  </span>
                )}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",justifyContent:"space-between",
                  alignItems:"center",marginBottom:3}}>
                  <span style={{fontWeight:c.unread>0?800:600,fontSize:15,
                    overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",
                    flex:1,paddingRight:8}}>
                    {c.name||c.phone}
                  </span>
                  <span style={{fontSize:11,color:C.txd,flexShrink:0}}>
                    {relTime(c.lastTime)}
                  </span>
                </div>
                <div style={{fontSize:13,color:c.unread>0?C.txs:C.txd,
                  overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",
                  fontWeight:c.unread>0?600:400}}>
                  {c.lastDir==="outbound"&&(
                    <span style={{color:C.g1,marginRight:3}}>You:</span>
                  )}
                  {c.lastMessage||"No messages yet"}
                </div>
              </div>
              {/* Unread dot */}
              {c.unread>0 && (
                <div style={{width:10,height:10,borderRadius:"50%",
                  background:C.g1,flexShrink:0}}/>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
