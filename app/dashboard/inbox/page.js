"use client";
import { useState, useEffect, useRef, useCallback } from "react";

const C = {
  g1:"#25d366", g2:"#1aad52", teal:"#00c9d4", blue:"#2979ff",
  amber:"#ffb300", red:"#f44336", purple:"#9c27b0", orange:"#ff7043",
  card:"#111827", surf:"#0d1117", surf2:"#161f2e", border:"#1c2a3f",
  tx:"#e8edf5", txs:"#8899b0", txd:"#556",
  waBg:"#0b1014",
};

const AVC = [C.g1,C.teal,C.blue,C.purple,C.amber,C.orange];
const avc = s => AVC[(s||"A").charCodeAt(0)%AVC.length];
const initials = n => {
  const s=(n||"?").trim();
  if(/^[+\d\s]+$/.test(s)) return s.replace(/\D/g,"").slice(-2);
  const w=s.split(/\s+/);
  return (w.length>=2?w[0][0]+w[1][0]:s.slice(0,2)).toUpperCase();
};
const relTime = t => {
  if(!t) return "";
  const m=Math.floor((Date.now()-new Date(t))/60000);
  if(m<1) return "now";
  if(m<60) return m+"m";
  const h=Math.floor(m/60);
  if(h<24) return h+"h";
  const d=Math.floor(h/24);
  return d<7?d+"d":new Date(t).toLocaleDateString("en-IN",{day:"numeric",month:"short"});
};

function Avatar({name,size=42,online}){
  const c=avc(name);
  return (
    <div style={{position:"relative",flexShrink:0}}>
      <div style={{width:size,height:size,borderRadius:"50%",
        background:`${c}22`,border:`2px solid ${c}44`,
        display:"flex",alignItems:"center",justifyContent:"center",
        fontSize:size*.34,fontWeight:800,color:c}}>
        {initials(name)}
      </div>
      {online&&<div style={{position:"absolute",bottom:0,right:0,width:size*.28,
        height:size*.28,borderRadius:"50%",background:C.g1,
        border:`2px solid ${C.card}`}}/>}
    </div>
  );
}

const STATUS_COLORS = { open:C.blue, pending:C.amber, resolved:C.g1, snoozed:C.purple };
const PRIORITY_COLORS = { low:C.txd, normal:C.txs, high:C.orange, urgent:C.red };

function StatusPill({status}){
  const col=STATUS_COLORS[status]||C.txs;
  return <span style={{fontSize:10,fontWeight:800,padding:"2px 9px",borderRadius:20,
    background:`${col}1e`,color:col,textTransform:"capitalize"}}>{status}</span>;
}

export default function TeamInbox(){
  const [convos,setConvos]     = useState([]);
  const [counts,setCounts]     = useState({});
  const [selected,setSelected] = useState(null);
  const [messages,setMessages] = useState([]);
  const [filter,setFilter]     = useState("all");
  const [search,setSearch]     = useState("");
  const [agents,setAgents]     = useState([]);
  const [quickReplies,setQR]   = useState([]);
  const [msgText,setMsgText]   = useState("");
  const [noteText,setNoteText] = useState("");
  const [tab,setTab]           = useState("reply"); // reply | note
  const [showInfo,setShowInfo] = useState(true);
  const [sending,setSending]   = useState(false);
  const [convoData,setConvoData]= useState(null);
  const [mobileView,setMobileView] = useState("list"); // list | chat (mobile)
  const [me] = useState(()=> typeof window!=="undefined" ? (localStorage.getItem("userName")||"Admin") : "Admin");

  const endRef  = useRef();
  const pollRef = useRef();

  const loadConvos = useCallback(async()=>{
    const p = new URLSearchParams({ filter, agent:me });
    if(search) p.set("search",search);
    const r = await fetch(`/api/conversations?${p}`);
    const d = await r.json();
    setConvos(d.conversations||[]);
    setCounts(d.counts||{});
  },[filter,search,me]);

  useEffect(()=>{
    loadConvos();
    pollRef.current=setInterval(loadConvos,5000);
    return ()=>clearInterval(pollRef.current);
  },[loadConvos]);

  useEffect(()=>{
    fetch("/api/agents").then(r=>r.json()).then(d=>setAgents(d.agents||[]));
    fetch("/api/quick-replies").then(r=>r.json()).then(d=>setQR(d.replies||[]));
  },[]);

  const openConvo = async(c)=>{
    setSelected(c); setMobileView("chat");
    // Load messages
    const r=await fetch(`/api/inbox/${encodeURIComponent(c.phone)}`);
    const d=await r.json();
    setMessages(d.messages||[]);
    // Load conversation meta
    const cr=await fetch(`/api/conversations/${encodeURIComponent(c.phone)}`);
    const cd=await cr.json();
    setConvoData(cd.conversation);
    // Mark read
    if(c.unreadCount>0){
      fetch(`/api/conversations/${encodeURIComponent(c.phone)}`,{method:"PATCH",
        headers:{"Content-Type":"application/json"},body:JSON.stringify({unreadCount:0})});
    }
  };

  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:"smooth"}); },[messages]);

  const sendMessage = async()=>{
    if(!msgText.trim()||!selected) return;
    setSending(true);
    const text=msgText; setMsgText("");
    try{
      await fetch("/api/messages/send",{method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({phone:selected.phone,type:"text",message:text,
          contactName:selected.name,agentName:me,provider:convoData?.provider})});
      setMessages(p=>[...p,{_id:Date.now()+"",direction:"outbound",type:"text",
        body:text,status:"sent",sentAt:new Date().toISOString(),agentName:me}]);
    }catch{}
    setSending(false);
  };

  const addNote = async()=>{
    if(!noteText.trim()||!selected) return;
    const text=noteText; setNoteText("");
    const r=await fetch(`/api/conversations/${encodeURIComponent(selected.phone)}/notes`,{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({text,author:me})});
    const d=await r.json();
    setConvoData(p=>({...p,notes:d.notes}));
  };

  const updateConvo = async(patch)=>{
    const r=await fetch(`/api/conversations/${encodeURIComponent(selected.phone)}`,{
      method:"PATCH",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({...patch,resolvedBy:me})});
    const d=await r.json();
    setConvoData(d.conversation);
    loadConvos();
  };

  const filters=[
    {id:"all",       label:"All",        icon:"📥"},
    {id:"mine",      label:"Mine",       icon:"👤"},
    {id:"unassigned",label:"Unassigned", icon:"📭"},
    {id:"open",      label:"Open",       icon:"🔵"},
    {id:"resolved",  label:"Resolved",   icon:"✅"},
  ];

  return (
    <div style={{display:"flex",height:"100%",background:C.waBg,overflow:"hidden"}}>

      {/* ===== LEFT: Conversation List ===== */}
      <div style={{
        width:340,flexShrink:0,borderRight:`1px solid ${C.border}`,
        display:"flex",flexDirection:"column",background:C.card,
        ...(mobileView==="chat"?{display:"none"}:{}),
      }} className="convo-list">
        {/* Header */}
        <div style={{padding:"12px 14px",borderBottom:`1px solid ${C.border}`}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
            <h1 style={{fontSize:17,fontWeight:800}}>💬 Team Inbox</h1>
            <button onClick={loadConvos} style={{background:"none",border:"none",
              color:C.txs,fontSize:16,cursor:"pointer"}}>↻</button>
          </div>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="🔍 Search name or number"
            style={{width:"100%",background:C.surf,border:`1px solid ${C.border}`,
              borderRadius:9,padding:"8px 12px",color:C.tx,fontSize:13,
              outline:"none",boxSizing:"border-box"}}/>
        </div>

        {/* Filter tabs */}
        <div style={{display:"flex",gap:4,padding:"8px 10px",overflowX:"auto",
          borderBottom:`1px solid ${C.border}`}}>
          {filters.map(f=>(
            <button key={f.id} onClick={()=>setFilter(f.id)} style={{
              padding:"5px 11px",borderRadius:20,border:"none",flexShrink:0,
              background:filter===f.id?C.g1:C.surf,
              color:filter===f.id?"#000":C.txs,
              fontSize:11,fontWeight:700,cursor:"pointer",
              display:"flex",alignItems:"center",gap:4}}>
              {f.label}
              {counts[f.id]>0&&(
                <span style={{fontSize:9,padding:"0 5px",borderRadius:10,
                  background:filter===f.id?"rgba(0,0,0,.2)":C.border,
                  color:filter===f.id?"#000":C.txs}}>{counts[f.id]}</span>
              )}
            </button>
          ))}
        </div>

        {/* List */}
        <div style={{flex:1,overflowY:"auto"}}>
          {convos.length===0&&(
            <div style={{textAlign:"center",padding:"40px 20px",color:C.txd}}>
              <div style={{fontSize:36,marginBottom:8}}>📭</div>
              <p style={{fontSize:13}}>No conversations</p>
            </div>
          )}
          {convos.map(c=>{
            const active=selected?.phone===c.phone;
            return (
              <div key={c.phone} onClick={()=>openConvo(c)} style={{
                padding:"11px 14px",cursor:"pointer",display:"flex",gap:11,
                background:active?`${C.g1}0e`:"transparent",
                borderLeft:`3px solid ${active?C.g1:"transparent"}`,
                borderBottom:`1px solid ${C.border}66`}}>
                <Avatar name={c.name||c.phone} size={44}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",justifyContent:"space-between",gap:6,marginBottom:2}}>
                    <span style={{fontWeight:c.unreadCount>0?800:600,fontSize:14,
                      overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                      {c.name||c.phone}
                    </span>
                    <span style={{fontSize:10,color:C.txd,flexShrink:0}}>{relTime(c.lastMessageAt)}</span>
                  </div>
                  <div style={{fontSize:12,color:c.unreadCount>0?C.txs:C.txd,
                    overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:4}}>
                    {c.lastMessageDir==="outbound"&&<span style={{color:C.g1}}>You: </span>}
                    {c.lastMessageText||"No messages"}
                  </div>
                  <div style={{display:"flex",gap:5,alignItems:"center",flexWrap:"wrap"}}>
                    <StatusPill status={c.status}/>
                    {c.assignedTo?(
                      <span style={{fontSize:9,padding:"1px 7px",borderRadius:20,
                        background:`${C.teal}18`,color:C.teal,fontWeight:700}}>
                        {c.assignedTo.split("@")[0].split(" ")[0]}
                      </span>
                    ):(
                      <span style={{fontSize:9,padding:"1px 7px",borderRadius:20,
                        background:`${C.txd}22`,color:C.txd,fontWeight:700}}>unassigned</span>
                    )}
                    {c.aiMode==="auto"&&<span style={{fontSize:9}}>🤖</span>}
                    <span style={{fontSize:9,padding:"1px 6px",borderRadius:20,fontWeight:700,
                      background:c.provider==="gupshup"?`${C.orange}18`:`${C.g1}18`,
                      color:c.provider==="gupshup"?C.orange:C.g1}}>
                      {c.provider==="gupshup"?"Gupshup":"Flaxxa"}
                    </span>
                    {(c.labels||[]).slice(0,2).map(l=>(
                      <span key={l} style={{fontSize:9,padding:"1px 6px",borderRadius:20,
                        background:`${C.purple}18`,color:C.purple}}>{l}</span>
                    ))}
                  </div>
                </div>
                {c.unreadCount>0&&(
                  <div style={{minWidth:18,height:18,borderRadius:9,background:C.g1,
                    color:"#000",fontSize:10,fontWeight:800,display:"flex",
                    alignItems:"center",justifyContent:"center",padding:"0 5px",
                    alignSelf:"center"}}>{c.unreadCount}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ===== MIDDLE: Chat Thread ===== */}
      <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0,
        ...(mobileView==="list"?{}:{}),
      }} className="chat-panel">
        {!selected?(
          <div style={{flex:1,display:"flex",flexDirection:"column",
            alignItems:"center",justifyContent:"center",color:C.txd}}>
            <div style={{fontSize:52,marginBottom:12}}>💬</div>
            <p style={{fontSize:15,fontWeight:600,color:C.txs}}>Select a conversation</p>
            <p style={{fontSize:13,marginTop:4}}>Choose from the list to start chatting</p>
          </div>
        ):(
          <>
            {/* Chat header */}
            <div style={{padding:"10px 16px",borderBottom:`1px solid ${C.border}`,
              background:C.card,display:"flex",alignItems:"center",gap:12}}>
              <button onClick={()=>{setSelected(null);setMobileView("list");}}
                className="mobile-back" style={{background:"none",border:"none",
                color:C.txs,fontSize:20,cursor:"pointer",display:"none"}}>←</button>
              <Avatar name={selected.name||selected.phone} size={40}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:800,fontSize:15,overflow:"hidden",
                  textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{selected.name||selected.phone}</div>
                <div style={{fontSize:11,color:C.txs}}>{selected.phone}</div>
              </div>
              {/* Quick actions */}
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                {convoData?.status!=="resolved"?(
                  <button onClick={()=>updateConvo({status:"resolved"})}
                    style={{padding:"6px 12px",borderRadius:8,border:`1px solid ${C.g1}44`,
                      background:`${C.g1}12`,color:C.g1,fontSize:12,fontWeight:700,cursor:"pointer"}}>
                    ✓ Resolve
                  </button>
                ):(
                  <button onClick={()=>updateConvo({status:"open"})}
                    style={{padding:"6px 12px",borderRadius:8,border:`1px solid ${C.border}`,
                      background:"transparent",color:C.txs,fontSize:12,fontWeight:700,cursor:"pointer"}}>
                    ↺ Reopen
                  </button>
                )}
                <button onClick={()=>setShowInfo(s=>!s)}
                  style={{padding:"6px 10px",borderRadius:8,border:`1px solid ${C.border}`,
                    background:showInfo?C.surf:"transparent",color:C.txs,fontSize:14,cursor:"pointer"}}>
                  ⓘ
                </button>
              </div>
            </div>

            {/* Messages */}
            <div style={{flex:1,overflowY:"auto",padding:"14px 16px",
              display:"flex",flexDirection:"column",gap:3}}>
              {messages.map((m,i)=>{
                const isOut=m.direction==="outbound";
                const showDate=i===0||new Date(m.sentAt).toDateString()!==new Date(messages[i-1].sentAt).toDateString();
                return (
                  <div key={m._id||i}>
                    {showDate&&(
                      <div style={{textAlign:"center",margin:"12px 0"}}>
                        <span style={{fontSize:11,color:C.txd,padding:"3px 12px",
                          borderRadius:20,background:C.card,border:`1px solid ${C.border}`}}>
                          {new Date(m.sentAt).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}
                        </span>
                      </div>
                    )}
                    <div style={{display:"flex",justifyContent:isOut?"flex-end":"flex-start",marginBottom:2}}>
                      <div style={{maxWidth:"70%",padding:"8px 12px 6px",
                        borderRadius:isOut?"16px 16px 4px 16px":"16px 16px 16px 4px",
                        background:isOut?`linear-gradient(135deg,${C.g2},${C.g1})`:C.card,
                        border:isOut?"none":`1px solid ${C.border}`}}>
                        {m.isAiGenerated&&<div style={{fontSize:9,fontWeight:700,
                          color:isOut?"rgba(0,0,0,.5)":C.txd,marginBottom:2}}>🤖 AI</div>}
                        {m.type==="image"&&m.mediaUrl&&(
                          <img src={m.mediaUrl} style={{maxWidth:200,borderRadius:8,
                            marginBottom:4,display:"block"}} onError={e=>e.target.style.display="none"}/>
                        )}
                        <p style={{fontSize:14,lineHeight:1.5,margin:0,
                          color:isOut?"#000":C.tx,whiteSpace:"pre-wrap",wordBreak:"break-word"}}>{m.body}</p>
                        <div style={{display:"flex",gap:5,justifyContent:"flex-end",
                          alignItems:"center",marginTop:3}}>
                          {m.agentName&&isOut&&<span style={{fontSize:9,
                            color:"rgba(0,0,0,.4)"}}>{m.agentName.split(" ")[0]}</span>}
                          <span style={{fontSize:10,color:isOut?"rgba(0,0,0,.45)":C.txd}}>
                            {new Date(m.sentAt).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}
                          </span>
                          {isOut&&<span style={{fontSize:11,color:
                            m.status==="read"?"#4fc3f7":m.status==="delivered"?"rgba(0,0,0,.5)":"rgba(0,0,0,.4)"}}>
                            {m.status==="read"?"✓✓":m.status==="delivered"?"✓✓":"✓"}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={endRef}/>
            </div>

            {/* Composer with reply/note tabs */}
            <div style={{borderTop:`1px solid ${C.border}`,background:C.card}}>
              <div style={{display:"flex",gap:2,padding:"6px 12px 0"}}>
                {[{id:"reply",l:"💬 Reply"},{id:"note",l:"📝 Internal Note"}].map(t=>(
                  <button key={t.id} onClick={()=>setTab(t.id)} style={{
                    padding:"6px 14px",borderRadius:"8px 8px 0 0",border:"none",
                    background:tab===t.id?(t.id==="note"?`${C.amber}18`:C.surf):"transparent",
                    color:tab===t.id?(t.id==="note"?C.amber:C.tx):C.txs,
                    fontSize:12,fontWeight:700,cursor:"pointer"}}>{t.l}</button>
                ))}
              </div>
              <div style={{padding:"10px 12px 12px",
                background:tab==="note"?`${C.amber}08`:"transparent"}}>
                {tab==="reply"?(
                  <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
                    <textarea value={msgText} onChange={e=>setMsgText(e.target.value)}
                      onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage();}}}
                      placeholder="Type a message… (/ for quick replies)"
                      rows={1} style={{flex:1,background:C.surf,border:`1px solid ${C.border}`,
                        borderRadius:10,padding:"10px 13px",color:C.tx,fontSize:14,
                        outline:"none",resize:"none",fontFamily:"inherit",maxHeight:120}}/>
                    <button onClick={sendMessage} disabled={sending||!msgText.trim()}
                      style={{padding:"10px 18px",borderRadius:10,border:"none",
                        background:sending||!msgText.trim()?C.border:`linear-gradient(135deg,${C.g1},${C.g2})`,
                        color:sending||!msgText.trim()?C.txd:"#000",fontWeight:800,
                        fontSize:14,cursor:"pointer"}}>➤</button>
                  </div>
                ):(
                  <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
                    <textarea value={noteText} onChange={e=>setNoteText(e.target.value)}
                      placeholder="Add internal note (only agents see this)…"
                      rows={1} style={{flex:1,background:C.surf,border:`1px solid ${C.amber}44`,
                        borderRadius:10,padding:"10px 13px",color:C.tx,fontSize:14,
                        outline:"none",resize:"none",fontFamily:"inherit",maxHeight:120}}/>
                    <button onClick={addNote} disabled={!noteText.trim()}
                      style={{padding:"10px 18px",borderRadius:10,border:"none",
                        background:!noteText.trim()?C.border:C.amber,
                        color:!noteText.trim()?C.txd:"#000",fontWeight:800,
                        fontSize:13,cursor:"pointer"}}>Save Note</button>
                  </div>
                )}
                {/* Quick replies */}
                {tab==="reply"&&msgText.startsWith("/")&&quickReplies.length>0&&(
                  <div style={{marginTop:8,display:"flex",gap:6,flexWrap:"wrap"}}>
                    {quickReplies.filter(q=>q.shortcut.includes(msgText.slice(1))).map(q=>(
                      <button key={q._id} onClick={()=>setMsgText(q.message)}
                        style={{padding:"5px 10px",borderRadius:8,border:`1px solid ${C.border}`,
                          background:C.surf,color:C.txs,fontSize:11,cursor:"pointer"}}>
                        {q.shortcut} — {q.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ===== RIGHT: Contact Info + Actions ===== */}
      {selected&&showInfo&&(
        <div style={{width:300,flexShrink:0,borderLeft:`1px solid ${C.border}`,
          background:C.card,overflowY:"auto",display:"flex",flexDirection:"column"}}
          className="info-panel">
          {/* Contact card */}
          <div style={{padding:"20px 16px",textAlign:"center",borderBottom:`1px solid ${C.border}`}}>
            <div style={{display:"flex",justifyContent:"center",marginBottom:10}}>
              <Avatar name={selected.name||selected.phone} size={64}/>
            </div>
            <div style={{fontWeight:800,fontSize:16}}>{selected.name||selected.phone}</div>
            <div style={{fontSize:12,color:C.txs,marginTop:2}}>{selected.phone}</div>
            <a href={`tel:${selected.phone}`} style={{display:"inline-block",marginTop:10,
              padding:"6px 16px",borderRadius:20,border:`1px solid ${C.border}`,
              color:C.teal,fontSize:12,fontWeight:700,textDecoration:"none"}}>📞 Call</a>
          </div>

          {/* Assignment */}
          <div style={{padding:"14px 16px",borderBottom:`1px solid ${C.border}`}}>
            <label style={{display:"block",fontSize:11,fontWeight:700,color:C.txs,
              textTransform:"uppercase",letterSpacing:".5px",marginBottom:8}}>Assigned Agent</label>
            <select value={convoData?.assignedTo||""}
              onChange={e=>updateConvo({assignedTo:e.target.value})}
              style={{width:"100%",background:C.surf,border:`1px solid ${C.border}`,
                borderRadius:9,padding:"9px 12px",color:C.tx,fontSize:13,outline:"none"}}>
              <option value="">Unassigned</option>
              {agents.map(a=>(
                <option key={a.email} value={a.name}>{a.name} ({a.role})</option>
              ))}
            </select>
            <button onClick={()=>updateConvo({assignedTo:me})}
              style={{width:"100%",marginTop:8,padding:"8px",borderRadius:9,border:"none",
                background:`${C.teal}18`,color:C.teal,fontSize:12,fontWeight:700,cursor:"pointer"}}>
              Assign to me
            </button>
          </div>

          {/* Status + Priority */}
          <div style={{padding:"14px 16px",borderBottom:`1px solid ${C.border}`}}>
            <label style={{display:"block",fontSize:11,fontWeight:700,color:C.txs,
              textTransform:"uppercase",letterSpacing:".5px",marginBottom:8}}>Status</label>
            <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:12}}>
              {["open","pending","resolved"].map(s=>(
                <button key={s} onClick={()=>updateConvo({status:s})} style={{
                  padding:"5px 12px",borderRadius:20,border:"none",
                  background:convoData?.status===s?STATUS_COLORS[s]:C.surf,
                  color:convoData?.status===s?"#000":C.txs,
                  fontSize:11,fontWeight:700,cursor:"pointer",textTransform:"capitalize"}}>{s}</button>
              ))}
            </div>
            <label style={{display:"block",fontSize:11,fontWeight:700,color:C.txs,
              textTransform:"uppercase",letterSpacing:".5px",marginBottom:8}}>Priority</label>
            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
              {["low","normal","high","urgent"].map(p=>(
                <button key={p} onClick={()=>updateConvo({priority:p})} style={{
                  padding:"5px 11px",borderRadius:20,border:`1px solid ${convoData?.priority===p?PRIORITY_COLORS[p]:C.border}`,
                  background:convoData?.priority===p?`${PRIORITY_COLORS[p]}1e`:"transparent",
                  color:convoData?.priority===p?PRIORITY_COLORS[p]:C.txs,
                  fontSize:11,fontWeight:700,cursor:"pointer",textTransform:"capitalize"}}>{p}</button>
              ))}
            </div>
          </div>

          {/* AI Mode */}
          <div style={{padding:"14px 16px",borderBottom:`1px solid ${C.border}`}}>
            <label style={{display:"block",fontSize:11,fontWeight:700,color:C.txs,
              textTransform:"uppercase",letterSpacing:".5px",marginBottom:8}}>AI Mode</label>
            <div style={{display:"flex",gap:5}}>
              {[{v:"auto",l:"🤖 Auto"},{v:"draft",l:"✏️ Draft"},{v:"human",l:"👤 Human"}].map(m=>(
                <button key={m.v} onClick={()=>{
                  updateConvo({aiMode:m.v});
                  fetch("/api/contacts/ai-mode",{method:"POST",headers:{"Content-Type":"application/json"},
                    body:JSON.stringify({phone:selected.phone,mode:m.v})});
                }} style={{
                  flex:1,padding:"7px 4px",borderRadius:8,border:"none",
                  background:convoData?.aiMode===m.v?C.g1:C.surf,
                  color:convoData?.aiMode===m.v?"#000":C.txs,
                  fontSize:11,fontWeight:700,cursor:"pointer"}}>{m.l}</button>
              ))}
            </div>
          </div>

          {/* Provider Switcher */}
          <div style={{padding:"14px 16px",borderBottom:`1px solid ${C.border}`}}>
            <label style={{display:"block",fontSize:11,fontWeight:700,color:C.txs,
              textTransform:"uppercase",letterSpacing:".5px",marginBottom:8}}>
              📡 Reply Via
            </label>
            <div style={{display:"flex",gap:6}}>
              {[
                {v:"flaxxa",  l:"Flaxxa",  sub:"90631 72108"},
                {v:"gupshup", l:"Gupshup", sub:"70751 76108"},
              ].map(p=>(
                <button key={p.v} onClick={()=>updateConvo({provider:p.v})} style={{
                  flex:1,padding:"8px 6px",borderRadius:9,cursor:"pointer",
                  border:`2px solid ${convoData?.provider===p.v?C.g1:C.border}`,
                  background:convoData?.provider===p.v?`${C.g1}0e`:C.surf,
                  textAlign:"center"}}>
                  <div style={{fontWeight:800,fontSize:12,
                    color:convoData?.provider===p.v?C.g1:C.tx}}>
                    {convoData?.provider===p.v?"✓ ":""}{p.l}
                  </div>
                  <div style={{fontSize:10,color:C.txs,marginTop:1}}>{p.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Internal Notes */}
          <div style={{padding:"14px 16px",flex:1}}>
            <label style={{display:"block",fontSize:11,fontWeight:700,color:C.txs,
              textTransform:"uppercase",letterSpacing:".5px",marginBottom:10}}>
              📝 Internal Notes ({convoData?.notes?.length||0})
            </label>
            {(convoData?.notes||[]).length===0&&(
              <p style={{fontSize:12,color:C.txd}}>No notes yet. Switch to "Internal Note" tab to add one.</p>
            )}
            {(convoData?.notes||[]).slice().reverse().map((n,i)=>(
              <div key={i} style={{background:`${C.amber}0c`,border:`1px solid ${C.amber}22`,
                borderRadius:8,padding:"8px 10px",marginBottom:8}}>
                <p style={{fontSize:12,color:C.tx,margin:0,lineHeight:1.5}}>{n.text}</p>
                <div style={{fontSize:10,color:C.txd,marginTop:4}}>
                  {n.author} · {relTime(n.createdAt)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @media (max-width:768px){
          .convo-list{width:100%!important;}
          .chat-panel{display:${mobileView==="chat"?"flex":"none"}!important;}
          .info-panel{display:none!important;}
          .mobile-back{display:block!important;}
        }
      `}</style>
    </div>
  );
}
