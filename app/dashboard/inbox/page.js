"use client";
import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { useConfirm, useToast } from "@/components/Feedback";
import { Inbox, CheckCircle2, MessageSquare, Search, RefreshCw, ArrowLeft, Info, Check, CheckCheck, Clock, Loader2,
         AlertCircle, SendHorizontal, StickyNote, Phone, Bot, PencilLine, UserRound, Radio, FileText, Download,
         ImageOff, Heart, X, Sparkles, RotateCcw } from "lucide-react";

const C = {
  g1:"#25d366", g2:"#1aad52", teal:"#00c9d4", blue:"#2979ff",
  amber:"#ffb300", red:"#f44336", purple:"#9c27b0", orange:"#ff7043",
  card:"#111827", surf:"#0d1117", surf2:"#161f2e", border:"#1c2a3f",
  tx:"#e8edf5", txs:"#8899b0", txd:"#445566",
  waBg:"#07090f",
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

// Renders the attachment of a message (photo, sticker, video, voice note, document).
function MediaBlock({m}){
  const [failed,setFailed]=useState(false);
  const url=m.mediaUrl, type=m.type;
  const box={display:"flex",alignItems:"center",gap:8,padding:"10px 12px",borderRadius:10,
    background:"rgba(0,0,0,.25)",marginBottom:6,fontSize:12,color:"#c5d0dd",textDecoration:"none"};
  if(!["image","sticker","video","audio","voice","file","document"].includes(type)) return null;
  if(!url||failed) return (
    <div style={{...box,color:C.txs}}>
      <ImageOff size={17}/>
      <span>{type==="image"||type==="sticker"?"Photo":type==="video"?"Video":type==="audio"||type==="voice"?"Voice message":"File"} no longer available
        <span style={{display:"block",fontSize:10,opacity:.75}}>The provider link expired before it was saved</span></span>
    </div>
  );
  if(type==="image"||type==="sticker") return (
    <a href={url} target="_blank" rel="noreferrer">
      <img src={url} alt="" loading="lazy" onError={()=>setFailed(true)}
        style={{maxWidth:type==="sticker"?130:260,width:"100%",maxHeight:320,objectFit:type==="sticker"?"contain":"cover",borderRadius:10,marginBottom:6,display:"block"}}/>
    </a>
  );
  if(type==="video") return <video src={url} controls preload="metadata" onError={()=>setFailed(true)}
    style={{maxWidth:260,width:"100%",borderRadius:10,marginBottom:6,display:"block",background:"#000"}}/>;
  if(type==="audio"||type==="voice") return <audio src={url} controls preload="none" onError={()=>setFailed(true)}
    style={{width:240,maxWidth:"100%",marginBottom:6,display:"block"}}/>;
  return (
    <a href={url} target="_blank" rel="noreferrer" style={box}>
      <FileText size={18} color={C.teal}/>
      <span style={{flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.body||"Document"}</span>
      <Download size={15}/>
    </a>
  );
}

function Tick({status,err}){
  if(status==="sending") return <Clock size={12} color="rgba(255,255,255,.55)"/>;
  if(status==="failed") return <span title={err} style={{display:"inline-flex",alignItems:"center",gap:3,fontSize:10,fontWeight:700,color:"#ff7a70"}}><AlertCircle size={12}/>Not sent</span>;
  if(status==="read") return <CheckCheck size={14} color="#53bdeb"/>;
  if(status==="delivered") return <CheckCheck size={14} color="rgba(255,255,255,.55)"/>;
  return <Check size={14} color="rgba(255,255,255,.55)"/>;
}

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

  const convosRef = useRef([]);
  const pollRef = useRef();

  const askConfirm = useConfirm(), toast = useToast();
  const PAGE = 30, MSG_PAGE = 40;
  const [hasMoreConvos,setHasMoreConvos] = useState(false);
  const [loadingConvos,setLoadingConvos] = useState(true);
  const [loadingMoreConvos,setLoadingMoreConvos] = useState(false);
  const [hasOlder,setHasOlder]           = useState(false);
  const [loadingOlder,setLoadingOlder]   = useState(false);
  const [loadingChat,setLoadingChat]     = useState(false);
  const lastOutRef  = useRef(-1);
  const msgBoxRef   = useRef(null);       // scroll container of the chat
  const stickRef    = useRef(true);       // true while the user is at the bottom of the chat
  const restoreRef  = useRef(null);       // scrollHeight before older messages were prepended
  const loadingMoreRef = useRef(false);

  // First page of the conversation list. Polled: refreshes page 1 in place and keeps any
  // older pages the user already scrolled through.
  const loadConvos = useCallback(async()=>{
    if(typeof document!=="undefined" && document.hidden) return;
    const p = new URLSearchParams({ filter, agent:me, limit:String(PAGE) });
    if(search) p.set("search",search);
    try{
      const r = await fetch(`/api/conversations?${p}`);
      const d = await r.json();
      const first = d.conversations||[];
      setConvos(prev=>{
        const keep = new Set(first.map(c=>c.phone));
        const next = prev.length>PAGE ? [...first, ...prev.slice(PAGE).filter(c=>!keep.has(c.phone))] : first;
        convosRef.current = next;
        return next;
      });
      if(convosRef.current.length<=PAGE) setHasMoreConvos(!!d.hasMore);
      setCounts(d.counts||{});
    }catch{}
    setLoadingConvos(false);
  },[filter,search,me]);

  // Next page when the list is scrolled near the bottom
  const loadMoreConvos = useCallback(async()=>{
    if(loadingMoreRef.current || !hasMoreConvos) return;
    loadingMoreRef.current = true; setLoadingMoreConvos(true);
    try{
      const p = new URLSearchParams({ filter, agent:me, limit:String(PAGE), skip:String(convosRef.current.length) });
      if(search) p.set("search",search);
      const d = await (await fetch(`/api/conversations?${p}`)).json();
      setConvos(prev=>{
        const have = new Set(prev.map(c=>c.phone));
        const next = [...prev, ...(d.conversations||[]).filter(c=>!have.has(c.phone))];
        convosRef.current = next; return next;
      });
      setHasMoreConvos(!!d.hasMore);
    }catch{}
    loadingMoreRef.current = false; setLoadingMoreConvos(false);
  },[filter,search,me,hasMoreConvos]);

  const onListScroll = e=>{
    const el=e.currentTarget;
    if(el.scrollHeight-el.scrollTop-el.clientHeight<240) loadMoreConvos();
  };

  useEffect(()=>{
    setLoadingConvos(true);
    setConvos([]); convosRef.current=[]; setHasMoreConvos(false);
    loadConvos();
    pollRef.current=setInterval(loadConvos,5000);
    return ()=>clearInterval(pollRef.current);
  },[loadConvos]);

  useEffect(()=>{
    fetch("/api/agents").then(r=>r.json()).then(d=>setAgents(d.agents||[]));
    fetch("/api/quick-replies").then(r=>r.json()).then(d=>setQR(d.replies||[]));
  },[]);

  // Live updates: poll the newest page of the open conversation so new WhatsApp messages
  // (and AI drafts, delivery ticks) appear without a refresh. Older messages already
  // loaded by scrolling up are kept. Pauses while the tab is hidden.
  const selectedRef = useRef(null);
  useEffect(()=>{ selectedRef.current = selected; },[selected]);

  const refreshMessages = useCallback(async()=>{
    const phone = selectedRef.current?.phone;
    if(!phone || document.hidden) return;
    try{
      const r=await fetch(`/api/inbox/${encodeURIComponent(phone)}?limit=${MSG_PAGE}`,{cache:"no-store"});
      const d=await r.json();
      if(selectedRef.current?.phone!==phone || !d.messages) return;
      setMessages(prev=>{
        const sig = l => l.map(m=>m._id+":"+m.status).join("|");
        const latest = d.messages;
        const cut = latest.length ? new Date(latest[0].sentAt) : null;
        const older = cut ? prev.filter(m=>!m._optimistic && !m._error && new Date(m.sentAt)<cut) : [];
        // keep optimistic bubbles until the server returns the real message
        const pending = prev.filter(m=>m._error || (m._optimistic && !latest.some(x=>x.direction==="outbound" && x.body===m.body && Math.abs(new Date(x.sentAt)-new Date(m.sentAt))<120000)));
        const next = [...older, ...latest, ...pending];
        return sig(prev)===sig(next) ? prev : next;
      });
      if(d.messages.some(m=>m.direction==="inbound")){
        const hadUnread = (convosRef.current.find(c=>c.phone===phone)?.unreadCount||0)>0;
        if(hadUnread) fetch(`/api/conversations/${encodeURIComponent(phone)}`,{method:"PATCH",
          headers:{"Content-Type":"application/json"},body:JSON.stringify({unreadCount:0})}).then(loadConvos);
      }
    }catch{}
  },[]);

  useEffect(()=>{
    if(!selected) return;
    const t=setInterval(refreshMessages,3000);
    const onVis=()=>{ if(!document.hidden){ refreshMessages(); loadConvos(); } };
    document.addEventListener("visibilitychange",onVis);
    return ()=>{ clearInterval(t); document.removeEventListener("visibilitychange",onVis); };
  },[selected?.phone,refreshMessages]);

  const openConvo = async(c)=>{
    setSelected(c); setMobileView("chat");
    setMessages([]); setHasOlder(false); setLoadingChat(true); stickRef.current=true;
    // Load newest messages
    try{
      const r=await fetch(`/api/inbox/${encodeURIComponent(c.phone)}?limit=${MSG_PAGE}`);
      const d=await r.json();
      if(selectedRef.current?.phone===c.phone || !selectedRef.current){ setMessages(d.messages||[]); setHasOlder(!!d.hasMore); }
    }catch{}
    setLoadingChat(false);
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

  // Deep link from other pages: /dashboard/inbox?phone=91XXXXXXXXXX opens that person's chat
  useEffect(()=>{
    const sp=new URLSearchParams(window.location.search);
    const ph=sp.get("phone"); if(!ph) return;
    (async()=>{
      let c=null;
      try{ c=(await (await fetch(`/api/conversations/${encodeURIComponent(ph)}`)).json()).conversation; }catch{}
      openConvo(c||{phone:ph,name:sp.get("name")||ph,unreadCount:0,status:"open"});
      window.history.replaceState(null,"","/dashboard/inbox");
    })();
  },[]);

  // WhatsApp-style: scrolling to the top loads older messages, keeping your place
  const loadOlder = useCallback(async()=>{
    const phone = selectedRef.current?.phone;
    if(!phone || loadingMoreRef.current || !hasOlder) return;
    const oldest = messagesRef.current.find(m=>!m._optimistic&&!m._error);
    if(!oldest) return;
    loadingMoreRef.current = true; setLoadingOlder(true);
    try{
      const d = await (await fetch(`/api/inbox/${encodeURIComponent(phone)}?limit=${MSG_PAGE}&before=${encodeURIComponent(oldest.sentAt)}`)).json();
      if(selectedRef.current?.phone===phone){
        restoreRef.current = msgBoxRef.current?.scrollHeight ?? null;
        setMessages(prev=>{
          const have=new Set(prev.map(m=>m._id));
          return [...(d.messages||[]).filter(m=>!have.has(m._id)), ...prev];
        });
        setHasOlder(!!d.hasMore);
      }
    }catch{}
    loadingMoreRef.current = false; setLoadingOlder(false);
  },[hasOlder]);

  const messagesRef = useRef([]);
  useEffect(()=>{ messagesRef.current = messages; },[messages]);

  const onChatScroll = e=>{
    const el=e.currentTarget;
    stickRef.current = el.scrollHeight-el.scrollTop-el.clientHeight < 120;
    if(el.scrollTop<160) loadOlder();
  };

  // After messages change: keep position when older ones were prepended, otherwise
  // stay pinned to the bottom (only if the user was already there).
  useLayoutEffect(()=>{
    const el=msgBoxRef.current; if(!el) return;
    if(restoreRef.current!=null){
      el.scrollTop = el.scrollHeight - restoreRef.current;
      restoreRef.current = null;
    } else if(stickRef.current){
      el.scrollTop = el.scrollHeight;
    }
  },[messages,loadingChat]);

  // Close (resolve) or reopen a chat straight from the list — no need to open it first
  const setChatStatus = async(c, status, e, skipConfirm)=>{
    e?.stopPropagation();
    if(status==="resolved" && !skipConfirm){
      const ok = await askConfirm({title:"Close this chat?",
        message:`${c.name||c.phone} will move to Closed. It reopens automatically if they message again.`,
        confirmLabel:"Close chat"});
      if(!ok) return;
    }
    const patch = {status, resolvedBy:me};
    try{
      const r = await fetch(`/api/conversations/${encodeURIComponent(c.phone)}`,{method:"PATCH",
        headers:{"Content-Type":"application/json"},body:JSON.stringify(patch)});
      if(!r.ok) throw new Error();
      const d = await r.json();
      // drop it from the list if it no longer matches the active filter
      const leaves = (filter==="open"&&status!=="open") || (filter==="resolved"&&status!=="resolved");
      setConvos(prev=>{
        const next = leaves ? prev.filter(x=>x.phone!==c.phone) : prev.map(x=>x.phone===c.phone?{...x,status}:x);
        convosRef.current = next; return next;
      });
      if(selectedRef.current?.phone===c.phone){
        if(status==="resolved"){
          // Chat finished: go back to the empty "Select a conversation" screen —
          // never jump to another person's chat.
          setSelected(null); selectedRef.current=null;
          setConvoData(null); setMessages([]); setHasOlder(false);
          setMobileView("list");
        } else setConvoData(d.conversation);
      }
      toast(status==="resolved"?"Chat closed":"Chat reopened");
      loadConvos();
    }catch{ toast("Could not update the chat","error"); }
  };

  // "Close" only closes the view: nothing is deleted or changed, you land back on "Select a conversation".
  const closeView = ()=>{
    setSelected(null); selectedRef.current=null;
    setConvoData(null); setMessages([]); setHasOlder(false);
    setMobileView("list");
  };

  const sendMessage = async()=>{
    if(!msgText.trim()||!selected) return;
    setSending(true);
    const text=msgText; setMsgText("");
    const tempId="tmp-"+Date.now();
    stickRef.current=true;
    setMessages(p=>[...p,{_id:tempId,_optimistic:true,direction:"outbound",type:"text",
      body:text,status:"sending",sentAt:new Date().toISOString(),agentName:me}]);
    try{
      const r=await fetch("/api/messages/send",{method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({phone:selected.phone,type:"text",message:text,
          contactName:selected.name,agentName:me,provider:convoData?.provider})});
      if(!r.ok) throw new Error((await r.json().catch(()=>({}))).error||"Send failed");
      refreshMessages();
    }catch(e){
      setMessages(p=>p.map(m=>m._id===tempId?{...m,_optimistic:false,status:"failed",_error:e.message}:m));
    }
    setSending(false);
    loadConvos();
  };

  const approveDraft = async (m) => {
    try{
      await fetch("/api/messages/send",{method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({phone:selected.phone,type:"text",message:m.body,
          contactName:selected.name,agentName:me,provider:convoData?.provider,draftId:m._id})});
      setMessages(p=>p.map(x=>x._id===m._id?{...x,status:"sent",agentName:me}:x));
    }catch{}
  };

  const discardDraft = async (m) => {
    if(!await askConfirm({title:"Discard AI draft?",message:"The suggested reply will be deleted and nothing is sent.",confirmLabel:"Discard",danger:true})) return;
    await fetch(`/api/messages/draft/${m._id}`,{method:"DELETE"});
    setMessages(p=>p.filter(x=>x._id!==m._id));
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
    // Resolving closes the chat: drop it from the open lists and return to the list view
    if(patch.status==="resolved"){
      setSelected(null); setConvoData(null); setMessages([]); setMobileView("list");
      setConvos(prev=>{
        const next = filter==="resolved" ? prev : prev.filter(c=>c.phone!==selected.phone);
        convosRef.current = next; return next;
      });
    } else setConvoData(d.conversation);
    loadConvos();
  };

  const filters=[
    {id:"all",       label:"All"},
    {id:"mine",      label:"Mine"},
    {id:"unassigned",label:"Unassigned"},
    {id:"open",      label:"Open"},
    {id:"resolved",  label:"Closed"},
  ];

  return (
    <div style={{display:"flex",height:"100%",minHeight:0,background:C.waBg,overflow:"hidden",position:"relative"}}>

      {/* ===== LEFT: Conversation List ===== */}
      <div style={{
        width:"clamp(280px,28vw,360px)",flexShrink:0,borderRight:`1px solid ${C.border}`,
        display:"flex",flexDirection:"column",background:C.card,
      }} className="convo-list">
        {/* Header */}
        <div style={{padding:"12px 14px",borderBottom:`1px solid ${C.border}`}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
            <h1 style={{fontSize:17,fontWeight:800,display:"flex",alignItems:"center",gap:9}}><MessageSquare size={19} color={C.g1}/>Team Inbox</h1>
            <button onClick={loadConvos} title="Refresh" style={{background:"none",border:`1px solid ${C.border}`,borderRadius:8,
              color:C.txs,padding:6,display:"flex",cursor:"pointer"}}><RefreshCw size={14}/></button>
          </div>
          <div style={{position:"relative"}}>
            <Search size={15} color={C.txd} style={{position:"absolute",left:11,top:"50%",transform:"translateY(-50%)"}}/>
            <input value={search} onChange={e=>setSearch(e.target.value)}
              type="search" name="inbox-search" autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder="Search name or number"
              style={{width:"100%",background:C.surf,border:`1px solid ${C.border}`,
                borderRadius:9,padding:"9px 12px 9px 34px",color:C.tx,fontSize:13,
                outline:"none",boxSizing:"border-box"}}/>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="no-scrollbar" style={{display:"flex",gap:4,padding:"8px 10px",overflowX:"auto",
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
                  background:filter===f.id?"rgba(255,255,255,.25)":C.border,
                  color:filter===f.id?"#000":C.txs}}>{counts[f.id]}</span>
              )}
            </button>
          ))}
        </div>

        {/* List */}
        <div style={{flex:1,overflowY:"auto"}} onScroll={onListScroll}>
          {loadingConvos&&convos.length===0&&[0,1,2,3,4,5].map(i=>(
            <div key={i} style={{display:"flex",gap:11,padding:"12px 14px"}}>
              <div className="skeleton" style={{width:44,height:44,borderRadius:"50%"}}/>
              <div style={{flex:1}}><div className="skeleton" style={{height:12,width:"60%",marginBottom:8}}/><div className="skeleton" style={{height:10,width:"85%"}}/></div>
            </div>))}
          {!loadingConvos&&convos.length===0&&(
            <div style={{textAlign:"center",padding:"40px 20px",color:C.txd}}>
              <Inbox size={34} style={{marginBottom:8}}/>
              <p style={{fontSize:13}}>No conversations</p>
            </div>
          )}
          {convos.map(c=>{
            const active=selected?.phone===c.phone;
            return (
              <div key={c.phone} onClick={()=>openConvo(c)} className="convo-row" style={{
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
                    {c.lastMessageText==="[reaction]"?"Reacted to a message":(c.lastMessageText||"No messages")}
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
                    {c.aiMode==="auto"&&<Bot size={12} color={C.txs}/>}
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
                <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",justifyContent:"center",gap:7,flexShrink:0}}>
                  {c.unreadCount>0&&(
                    <div style={{minWidth:18,height:18,borderRadius:9,background:C.g1,
                      color:"#000",fontSize:10,fontWeight:800,display:"flex",
                      alignItems:"center",justifyContent:"center",padding:"0 5px"}}>{c.unreadCount}</div>
                  )}
                </div>
              </div>
            );
          })}
          {loadingMoreConvos&&<div style={{textAlign:"center",padding:"12px",color:C.txs,fontSize:11}}>
            <Loader2 size={15} style={{animation:"spin .8s linear infinite",verticalAlign:"middle",marginRight:6}}/>Loading more</div>}
          {!hasMoreConvos&&convos.length>PAGE&&<div style={{textAlign:"center",padding:"12px",color:C.txd,fontSize:11}}>End of list</div>}
        </div>
      </div>

      {/* ===== MIDDLE: Chat Thread ===== */}
      <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0,
        ...(mobileView==="list"?{}:{}),
      }} className="chat-panel">
        {!selected?(
          <div style={{flex:1,display:"flex",flexDirection:"column",
            alignItems:"center",justifyContent:"center",color:C.txd}}>
            <div style={{width:72,height:72,borderRadius:22,background:C.card,border:`1px solid ${C.border}`,display:"flex",
              alignItems:"center",justifyContent:"center",marginBottom:14,color:C.g1}}><MessageSquare size={32}/></div>
            <p style={{fontSize:15,fontWeight:600,color:C.txs}}>Select a conversation</p>
            <p style={{fontSize:13,marginTop:4}}>Choose from the list to start chatting</p>
          </div>
        ):(
          <>
            {/* Chat header */}
            <div style={{padding:"10px 16px",borderBottom:`1px solid ${C.border}`,
              background:C.card,display:"flex",alignItems:"center",gap:12}}>
              <button onClick={closeView} aria-label="Back to conversations" title="Back"
                style={{background:"none",border:`1px solid ${C.border}`,borderRadius:9,color:C.txs,cursor:"pointer",
                  display:"flex",padding:7}}><ArrowLeft size={18}/></button>
              <Avatar name={selected.name||selected.phone} size={40}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:800,fontSize:15,overflow:"hidden",
                  textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{selected.name||selected.phone}</div>
                <div style={{fontSize:11,color:C.txs}}>{selected.phone}</div>
              </div>
              {/* Quick actions */}
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                
                <button onClick={()=>setShowInfo(s=>!s)}
                  style={{padding:"6px 10px",borderRadius:8,border:`1px solid ${C.border}`,
                    background:showInfo?C.surf:"transparent",color:C.txs,display:"flex",cursor:"pointer"}}>
                  <Info size={16}/>
                </button>
              </div>
            </div>

            {/* Messages */}
            <div ref={msgBoxRef} onScroll={onChatScroll} style={{flex:1,overflowY:"auto",padding:"14px 16px",
              display:"flex",flexDirection:"column",gap:3,overscrollBehavior:"contain",
              background:"#0b141a",
              backgroundImage:"radial-gradient(rgba(255,255,255,.05) 1px, transparent 1px)",
              backgroundSize:"22px 22px"}}>
              {loadingOlder&&<div style={{textAlign:"center",padding:"6px 0",color:C.txs,fontSize:11}}>
                <Loader2 size={15} style={{animation:"spin .8s linear infinite",verticalAlign:"middle",marginRight:6}}/>Loading older messages</div>}
              {!hasOlder&&!loadingChat&&messages.length>0&&<div style={{textAlign:"center",padding:"4px 0 10px",color:C.txd,fontSize:11}}>Start of conversation</div>}
              {loadingChat&&<div style={{margin:"auto",color:C.txs,fontSize:12,display:"flex",alignItems:"center",gap:8}}>
                <Loader2 size={16} style={{animation:"spin .8s linear infinite"}}/>Loading messages</div>}
              {(()=>{ lastOutRef.current = messages.reduce((a,m,i)=>m.direction==="outbound"&&m.status!=="draft"?i:a,-1); return null; })()}
              {messages.map((m,i)=>{
                const isOut=m.direction==="outbound";
                if(m.type==="reaction"){
                  const emo=(m.body||"").split(" ")[0];
                  const hasEmo=emo&&!emo.startsWith("[")&&emo!=="Removed";
                  return (
                    <div key={m._id||i} style={{display:"flex",justifyContent:isOut?"flex-end":"flex-start",margin:"4px 0"}}>
                      <span style={{display:"inline-flex",alignItems:"center",gap:7,fontSize:12,color:C.txs,padding:"4px 11px",
                        borderRadius:20,background:C.card,border:`1px solid ${C.border}`}}>
                        {hasEmo?<span style={{fontSize:16,lineHeight:1}}>{emo}</span>:<Heart size={13} color={C.red}/>}
                        {m.body?.startsWith("Removed")?"Removed a reaction":"Reacted to a message"}
                      </span>
                    </div>
                  );
                }
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
                      <div style={{maxWidth:"min(70%,520px)",padding:"7px 11px 5px",
                        borderRadius:isOut?"16px 16px 4px 16px":"16px 16px 16px 4px",
                        background:isOut?"#005c4b":"#111827",
                        border:"none",boxShadow:"0 1px 1px rgba(11,20,26,.13)",
                        opacity:m.status==="sending"?.65:1,
                        ...(m.status==="draft"?{background:C.surf,border:`2px dashed ${C.amber}66`}:{})}}>
                        {m.isAiGenerated&&<div style={{fontSize:10,fontWeight:700,display:"flex",alignItems:"center",gap:4,
                          color:"rgba(255,255,255,.55)",marginBottom:3}}><Bot size={11}/>AI reply</div>}
                        {m.status==="draft"&&<div style={{fontSize:10,fontWeight:700,display:"flex",alignItems:"center",gap:4,
                          color:C.amber,marginBottom:3}}><PencilLine size={11}/>Draft - awaiting approval</div>}
                        <MediaBlock m={m}/>
                        {!(["image","sticker","video","audio","voice"].includes(m.type)&&/^(📷|🎥|🎵|🎉|\[)/.test(m.body||""))&&m.type!=="file"&&m.type!=="document"&&(
                          <p style={{fontSize:14,lineHeight:1.5,margin:0,
                            color:"#e9edef",whiteSpace:"pre-wrap",wordBreak:"break-word"}}>{m.body}</p>
                        )}
                        {m.status==="draft"&&(
                          <div style={{display:"flex",gap:6,marginTop:8}}>
                            <button onClick={()=>approveDraft(m)}
                              style={{flex:1,padding:"7px",borderRadius:8,border:"none",
                                background:`linear-gradient(135deg,${C.g2},${C.g1})`,
                                color:"#000",fontSize:12,fontWeight:800,cursor:"pointer"}}>
                              <span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",gap:5}}><SendHorizontal size={13}/>Send</span>
                            </button>
                            <button onClick={()=>discardDraft(m)}
                              style={{flex:1,padding:"7px",borderRadius:8,border:`1px solid ${C.red}50`,
                                background:"transparent",color:C.red,fontSize:12,fontWeight:800,cursor:"pointer"}}>
                              <span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",gap:5}}><X size={13}/>Discard</span>
                            </button>
                          </div>
                        )}
                        <div style={{display:"flex",gap:5,justifyContent:"flex-end",
                          alignItems:"center",marginTop:3}}>
                          {m.agentName&&isOut&&<span style={{fontSize:9,
                            color:"rgba(255,255,255,.5)"}}>{m.agentName.split(" ")[0]}</span>}
                          <span style={{fontSize:10,color:"rgba(255,255,255,.5)"}}>
                            {new Date(m.sentAt).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}
                          </span>
                          {isOut&&i===lastOutRef.current&&m.status!=="failed"&&m.status!=="sending"&&(
                            <span style={{fontSize:10,fontWeight:700,color:m.status==="read"?"#53bdeb":"rgba(255,255,255,.55)"}}>
                              {m.status==="read"?`Seen${m.readAt?" "+new Date(m.readAt).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}):""}`
                                :m.status==="delivered"?"Delivered":"Sent"}</span>)}
                          {isOut&&<span title={m.status==="read"?`Seen ${m.readAt?new Date(m.readAt).toLocaleString():""}`:m.status==="delivered"?`Delivered ${m.deliveredAt?new Date(m.deliveredAt).toLocaleString():""}`:m.status} style={{display:"inline-flex"}}><Tick status={m.status} err={m._error}/></span>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Composer with reply/note tabs */}
            <div style={{borderTop:`1px solid ${C.border}`,background:C.card}}>
              <div style={{display:"flex",gap:2,padding:"6px 12px 0"}}>
                {[{id:"reply",l:"Reply",I:MessageSquare},{id:"note",l:"Internal note",I:StickyNote}].map(t=>(
                  <button key={t.id} onClick={()=>setTab(t.id)} style={{
                    padding:"6px 14px",borderRadius:"8px 8px 0 0",border:"none",
                    background:tab===t.id?(t.id==="note"?`${C.amber}18`:C.surf):"transparent",
                    color:tab===t.id?(t.id==="note"?C.amber:C.tx):C.txs,
                    fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}><t.I size={13}/>{t.l}</button>
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
            <a href={`tel:${selected.phone}`} style={{display:"inline-flex",alignItems:"center",gap:6,marginTop:10,
              padding:"6px 16px",borderRadius:20,border:`1px solid ${C.border}`,
              color:C.teal,fontSize:12,fontWeight:700,textDecoration:"none"}}><Phone size={13}/>Call</a>
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
              {[{v:"auto",l:"Auto",I:Bot},{v:"draft",l:"Draft",I:PencilLine},{v:"human",l:"Human",I:UserRound}].map(m=>(
                <button key={m.v} onClick={()=>{
                  updateConvo({aiMode:m.v});
                  fetch("/api/contacts/ai-mode",{method:"POST",headers:{"Content-Type":"application/json"},
                    body:JSON.stringify({phone:selected.phone,mode:m.v})});
                }} style={{
                  flex:1,padding:"7px 4px",borderRadius:8,border:"none",
                  background:convoData?.aiMode===m.v?C.g1:C.surf,
                  color:convoData?.aiMode===m.v?"#000":C.txs,
                  fontSize:11,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}><m.I size={12}/>{m.l}</button>
              ))}
            </div>
          </div>

          {/* Provider Switcher */}
          <div style={{padding:"14px 16px",borderBottom:`1px solid ${C.border}`}}>
            <label style={{display:"block",fontSize:11,fontWeight:700,color:C.txs,
              textTransform:"uppercase",letterSpacing:".5px",marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
              <Radio size={12}/>Reply via
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
              textTransform:"uppercase",letterSpacing:".5px",marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
              <StickyNote size={12}/>Internal notes ({convoData?.notes?.length||0})
            </label>
            {(convoData?.notes||[]).length===0&&(
              <p style={{fontSize:12,color:C.txd}}>No notes yet. Use the "Internal note" tab to add one.</p>
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
          .convo-list{width:100%!important;display:${mobileView==="chat"?"none":"flex"}!important;}
          .chat-panel{display:${mobileView==="chat"?"flex":"none"}!important;}
          .info-panel{display:none!important;}
        }
        .convo-row:hover{background:rgba(255,255,255,.03)!important}
        .convo-row .row-action{opacity:0;transition:opacity .12s}
        .convo-row:hover .row-action,.convo-row:focus-within .row-action{opacity:1}
        @media (hover:none){ .convo-row .row-action{opacity:1} }
        @media (max-width:1180px){ .info-panel{position:absolute;right:0;top:0;bottom:0;z-index:20;box-shadow:-20px 0 40px rgba(0,0,0,.5);} }
      `}</style>
    </div>
  );
}
