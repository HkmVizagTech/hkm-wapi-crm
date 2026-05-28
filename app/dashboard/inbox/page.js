"use client";
import { useState, useEffect, useRef } from "react";
import { TEMPLATES, relTime } from "@/lib/utils";

const C = {
  g1:"#25d366", g2:"#1aad52", teal:"#00c9d4", blue:"#2979ff",
  amber:"#ffb300", red:"#f44336", purple:"#9c27b0",
  card:"#111827", surf:"#0d1117", border:"#1c2a3f",
  tx:"#e8edf5", txs:"#8899b0", txd:"#445566",
  wa:"#075e54", waBg:"#e5ddd5",
};

const IS = {
  background:C.surf, border:`1px solid ${C.border}`, borderRadius:10,
  padding:"10px 13px", color:C.tx, fontSize:13, outline:"none",
  boxSizing:"border-box", fontFamily:"inherit",
};

const AVC = [C.g1, C.teal, C.blue, C.purple, C.amber];
const avc  = s => AVC[(s||"A").charCodeAt(0) % AVC.length];

function Avatar({name, size=40}) {
  const c = avc(name||"?");
  return (
    <div style={{width:size,height:size,borderRadius:"50%",flexShrink:0,
      background:`${c}20`,border:`2px solid ${c}40`,
      display:"flex",alignItems:"center",justifyContent:"center",
      fontSize:size*.34,fontWeight:800,color:c}}>
      {(name||"?").slice(0,2).toUpperCase()}
    </div>
  );
}

export default function Inbox() {
  const [convos,    setConvos]    = useState([]);
  const [selected,  setSelected]  = useState(null);
  const [messages,  setMessages]  = useState([]);
  const [reply,     setReply]     = useState("");
  const [replyTab,  setReplyTab]  = useState("text");
  const [tplId,     setTplId]     = useState("");
  const [tplP,      setTplP]      = useState({});
  const [sending,   setSending]   = useState(false);
  const [search,    setSearch]    = useState("");
  const [toast,     setToast]     = useState(null);
  const [loadingMsg,setLoadingMsg]= useState(false);
  const endRef   = useRef();
  const pollRef  = useRef();

  const showToast = (m,t="success") => { setToast({m,t}); setTimeout(()=>setToast(null),3500); };

  // Load conversations
  const loadConvos = async () => {
    const r = await fetch("/api/inbox");
    const d = await r.json();
    setConvos(d.conversations || []);
  };

  useEffect(() => {
    loadConvos();
    // Poll every 5 seconds for new messages
    pollRef.current = setInterval(loadConvos, 5000);
    return () => clearInterval(pollRef.current);
  }, []);

  // Load messages for selected contact
  useEffect(() => {
    if (!selected) return;
    setLoadingMsg(true);
    fetch(`/api/inbox/${encodeURIComponent(selected.phone)}`)
      .then(r=>r.json())
      .then(d => { setMessages(d.messages||[]); setLoadingMsg(false); });

    // Poll messages every 5s
    const poll = setInterval(() => {
      fetch(`/api/inbox/${encodeURIComponent(selected.phone)}`)
        .then(r=>r.json())
        .then(d => setMessages(d.messages||[]));
    }, 5000);
    return () => clearInterval(poll);
  }, [selected?.phone]);

  // Scroll to bottom on new messages
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [messages]);

  const approved = TEMPLATES.filter(t => t.status === "APPROVED");
  const tpl      = approved.find(t => t.id === tplId);
  const tplPList = tpl ? [...tpl.body.matchAll(/\{\{(\d+)\}\}/g)].map(m=>`Param ${m[1]}`) : [];

  const sendMessage = async () => {
    if (!selected) return;
    if (replyTab==="text" && !reply.trim()) return;
    if (replyTab==="template" && !tpl) return;
    setSending(true);

    const body = replyTab==="text"
      ? { phone:selected.phone, type:"text", message:reply, contactName:selected.name }
      : { phone:selected.phone, type:"template", templateName:tpl.name,
          templateLang:tpl.language||"en", params:tplPList.map((_,i)=>tplP[i]||""),
          contactName:selected.name };

    const r = await fetch("/api/messages/send", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify(body),
    });
    const d = await r.json();
    if (r.ok) {
      showToast("Message sent!");
      setReply(""); setTplId(""); setTplP({});
      // Refresh messages
      const mr = await fetch(`/api/inbox/${encodeURIComponent(selected.phone)}`);
      const md = await mr.json();
      setMessages(md.messages||[]);
      loadConvos();
    } else {
      showToast(d.error||"Send failed","error");
    }
    setSending(false);
  };

  const filtered = convos.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );

  const totalUnread = convos.reduce((a,c) => a + (c.unread||0), 0);

  return (
    <div style={{display:"flex",height:"100%",overflow:"hidden"}}>

      {/* ── Left: Conversation list ── */}
      <div style={{width:300,flexShrink:0,borderRight:`1px solid ${C.border}`,
        display:"flex",flexDirection:"column",background:C.surf}}>

        {/* Header */}
        <div style={{padding:"14px 14px 10px",borderBottom:`1px solid ${C.border}`}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
            <h1 style={{fontSize:16,fontWeight:800}}>
              💬 Inbox
              {totalUnread>0&&(
                <span style={{marginLeft:8,background:C.g1,color:"#000",
                  fontSize:10,fontWeight:800,padding:"1px 7px",borderRadius:20}}>
                  {totalUnread}
                </span>
              )}
            </h1>
            <button onClick={loadConvos}
              style={{background:"none",border:"none",color:C.txs,fontSize:16,cursor:"pointer"}}>
              ↻
            </button>
          </div>
          <input style={{...IS,width:"100%",padding:"8px 12px",fontSize:13}}
            placeholder="🔍 Search conversations…"
            value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>

        {/* Conversation list */}
        <div style={{flex:1,overflowY:"auto"}}>
          {filtered.length===0&&(
            <div style={{textAlign:"center",padding:"40px 20px",color:C.txd}}>
              <div style={{fontSize:36,marginBottom:8}}>💬</div>
              <p style={{fontSize:13,color:C.txs,fontWeight:600}}>No conversations yet</p>
              <p style={{fontSize:12,marginTop:4,lineHeight:1.5}}>
                Configure Meta webhook to receive incoming messages
              </p>
            </div>
          )}
          {filtered.map(c=>(
            <div key={c.phone} onClick={()=>setSelected(c)} style={{
              padding:"12px 14px",cursor:"pointer",display:"flex",gap:12,alignItems:"center",
              background:selected?.phone===c.phone?`${C.g1}0a`:"transparent",
              borderLeft:`3px solid ${selected?.phone===c.phone?C.g1:"transparent"}`,
              borderBottom:`1px solid ${C.border}`,transition:"all .12s",
            }}>
              <div style={{position:"relative"}}>
                <Avatar name={c.name} size={44}/>
                {c.unread>0&&(
                  <span style={{position:"absolute",top:-3,right:-3,
                    width:18,height:18,borderRadius:"50%",background:C.g1,
                    color:"#000",fontSize:10,fontWeight:800,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    border:`2px solid ${C.surf}`}}>
                    {c.unread}
                  </span>
                )}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontWeight:c.unread>0?800:600,fontSize:14,
                    overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                    {c.name}
                  </span>
                  <span style={{fontSize:10,color:C.txd,flexShrink:0,marginLeft:6}}>
                    {relTime(c.lastTime)}
                  </span>
                </div>
                <div style={{fontSize:12,color:C.txs,overflow:"hidden",
                  textOverflow:"ellipsis",whiteSpace:"nowrap",marginTop:2}}>
                  {c.lastDir==="outbound"&&<span style={{color:C.g1}}>You: </span>}
                  {c.lastMessage}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right: Chat view ── */}
      {!selected ? (
        <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",
          flexDirection:"column",gap:12,color:C.txd,background:C.bg}}>
          <div style={{fontSize:48}}>💬</div>
          <p style={{fontSize:15,fontWeight:600,color:C.txs}}>Select a conversation</p>
          <p style={{fontSize:13,textAlign:"center",maxWidth:300,lineHeight:1.6}}>
            Incoming messages appear here automatically once you configure the Meta webhook
          </p>
        </div>
      ) : (
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>

          {/* Chat header */}
          <div style={{padding:"12px 20px",borderBottom:`1px solid ${C.border}`,
            display:"flex",alignItems:"center",gap:12,background:C.surf,flexShrink:0}}>
            <Avatar name={selected.name} size={42}/>
            <div style={{flex:1}}>
              <div style={{fontWeight:800,fontSize:15}}>{selected.name}</div>
              <div style={{fontSize:11,color:C.txs,fontFamily:"'JetBrains Mono',monospace"}}>
                {selected.phone}
              </div>
            </div>
            <button onClick={()=>setSelected(null)}
              style={{background:"none",border:"none",color:C.txs,fontSize:20,cursor:"pointer"}}>
              ×
            </button>
          </div>

          {/* Messages */}
          <div style={{flex:1,overflowY:"auto",padding:"16px 20px",
            display:"flex",flexDirection:"column",gap:8,background:"#0f1318"}}>
            {loadingMsg&&(
              <div style={{textAlign:"center",color:C.txd,padding:20}}>Loading messages…</div>
            )}
            {!loadingMsg&&messages.length===0&&(
              <div style={{textAlign:"center",color:C.txd,padding:40}}>
                <div style={{fontSize:32,marginBottom:8}}>🙏</div>
                <p style={{color:C.txs}}>No messages yet with {selected.name}</p>
              </div>
            )}
            {messages.map((m,i)=>{
              const isOut = m.direction==="outbound";
              const sc = {sent:C.blue,delivered:C.teal,read:C.g1,failed:C.red,received:C.txd}[m.status]||C.txd;
              return (
                <div key={m._id||i} style={{display:"flex",
                  justifyContent:isOut?"flex-end":"flex-start",
                  marginBottom:2}}>
                  {!isOut&&<Avatar name={selected.name} size={28}/>}
                  <div style={{
                    maxWidth:"70%",padding:"9px 14px",
                    marginLeft:isOut?0:8, marginRight:isOut?0:0,
                    borderRadius:isOut?"18px 18px 4px 18px":"18px 18px 18px 4px",
                    background:isOut?`linear-gradient(135deg,${C.g2},${C.g1}99)`:C.card,
                    border:isOut?"none":`1px solid ${C.border}`,
                  }}>
                    {/* Media type indicator */}
                    {m.type!=="text"&&m.type!=="template"&&(
                      <div style={{fontSize:11,fontWeight:700,color:isOut?"rgba(0,0,0,.5)":C.txs,
                        marginBottom:4,textTransform:"uppercase"}}>{m.type}</div>
                    )}
                    <p style={{fontSize:13,lineHeight:1.6,
                      color:isOut?"#000":C.tx,
                      whiteSpace:"pre-wrap",wordBreak:"break-word",margin:0}}>
                      {m.body}
                    </p>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",
                      gap:5,marginTop:4}}>
                      <span style={{fontSize:10,color:isOut?"rgba(0,0,0,.45)":C.txd}}>
                        {new Date(m.sentAt).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}
                      </span>
                      {isOut&&(
                        <span style={{fontSize:11,color:sc}}>
                          {m.status==="read"?"👁":m.status==="delivered"?"✓✓":m.status==="sent"?"✓":m.status==="failed"?"✕":""}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={endRef}/>
          </div>

          {/* Reply box */}
          <div style={{borderTop:`1px solid ${C.border}`,background:C.card,flexShrink:0}}>
            {/* Tab selector */}
            <div style={{display:"flex",gap:3,padding:"10px 16px 0"}}>
              {[{id:"text",l:"💬 Text"},{id:"template",l:"📋 Template"}].map(t=>(
                <button key={t.id} onClick={()=>setReplyTab(t.id)} style={{
                  padding:"6px 14px",borderRadius:"8px 8px 0 0",border:`1px solid ${C.border}`,
                  borderBottom:"none",background:replyTab===t.id?C.surf:"transparent",
                  color:replyTab===t.id?C.g1:C.txs,fontSize:12,fontWeight:700,cursor:"pointer"}}>
                  {t.l}
                </button>
              ))}
            </div>

            <div style={{padding:"12px 16px 16px",background:C.surf}}>
              {replyTab==="text"&&(
                <div style={{display:"flex",gap:10,alignItems:"flex-end"}}>
                  <textarea
                    style={{...IS,flex:1,resize:"none",minHeight:44,maxHeight:120,lineHeight:1.5,
                      padding:"10px 13px",borderRadius:12}}
                    placeholder="Type a message…"
                    rows={2}
                    value={reply}
                    onChange={e=>setReply(e.target.value)}
                    onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage();}}}
                  />
                  <button onClick={sendMessage} disabled={sending||!reply.trim()}
                    style={{width:44,height:44,borderRadius:"50%",border:"none",flexShrink:0,
                      background:reply.trim()?`linear-gradient(135deg,${C.g1},${C.g2})`:`${C.border}`,
                      color:reply.trim()?"#000":C.txd,fontSize:18,cursor:"pointer",
                      display:"flex",alignItems:"center",justifyContent:"center"}}>
                    {sending?"⏳":"➤"}
                  </button>
                </div>
              )}

              {replyTab==="template"&&(
                <div>
                  <select style={{...IS,width:"100%",marginBottom:10}}
                    value={tplId} onChange={e=>{setTplId(e.target.value);setTplP({});}}>
                    <option value="">— select approved template —</option>
                    {approved.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  {tpl&&(
                    <>
                      <div style={{background:C.surf,borderRadius:8,padding:10,
                        border:`1px solid ${C.border}`,marginBottom:10,fontSize:12,
                        color:C.txs,lineHeight:1.6,whiteSpace:"pre-wrap"}}>
                        {tpl.body}
                      </div>
                      {tplPList.map((_,i)=>(
                        <input key={i} style={{...IS,width:"100%",marginBottom:8}}
                          placeholder={`{{${i+1}}} value`}
                          value={tplP[i]||""}
                          onChange={e=>setTplP({...tplP,[i]:e.target.value})}/>
                      ))}
                    </>
                  )}
                  <button onClick={sendMessage} disabled={sending||!tpl}
                    style={{width:"100%",padding:"10px",borderRadius:9,border:"none",
                      background:tpl?`linear-gradient(135deg,${C.g1},${C.g2})`:`${C.border}`,
                      color:tpl?"#000":C.txd,fontWeight:700,fontSize:13,cursor:"pointer",
                      opacity:sending?.6:1}}>
                    {sending?"⏳ Sending…":"⚡ Send Template"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {toast&&(
        <div style={{position:"fixed",bottom:20,right:20,zIndex:999,
          padding:"11px 18px",borderRadius:10,fontWeight:700,fontSize:13,cursor:"pointer",
          background:toast.t==="success"?`${C.g1}ee`:`${C.red}ee`,
          color:toast.t==="error"?"#fff":"#000"}} onClick={()=>setToast(null)}>
          {toast.t==="success"?"✓":"✕"} {toast.m}
        </div>
      )}
    </div>
  );
}
