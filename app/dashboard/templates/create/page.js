"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const C = {
  g1:"#25d366", g2:"#1aad52", teal:"#00c9d4", blue:"#2979ff",
  amber:"#ffb300", red:"#f44336", purple:"#9c27b0",
  card:"#111827", surf:"#0d1117", border:"#1c2a3f",
  tx:"#e8edf5", txs:"#8899b0", txd:"#445566",
};

const IS = {
  width:"100%", background:C.surf, border:`1px solid ${C.border}`,
  borderRadius:10, padding:"10px 13px", color:C.tx, fontSize:13,
  outline:"none", boxSizing:"border-box", fontFamily:"inherit",
};

const CATEGORIES = ["UTILITY","MARKETING","AUTHENTICATION"];
const LANGUAGES  = [
  {code:"en",    label:"English"},
  {code:"en_US", label:"English (US)"},
  {code:"en_GB", label:"English (GB)"},
  {code:"hi",    label:"Hindi"},
  {code:"te",    label:"Telugu"},
  {code:"ta",    label:"Tamil"},
  {code:"kn",    label:"Kannada"},
  {code:"mr",    label:"Marathi"},
  {code:"gu",    label:"Gujarati"},
  {code:"bn",    label:"Bengali"},
];
const BTN_TYPES  = ["QUICK_REPLY","URL","PHONE_NUMBER"];

export default function CreateTemplate() {
  const router = useRouter();

  // Form state
  const [name,      setName]     = useState("");
  const [category,  setCategory] = useState("UTILITY");
  const [language,  setLanguage] = useState("en");
  const [header,    setHeader]   = useState(false);
  const [hFormat,   setHFormat]  = useState("TEXT");
  const [hText,     setHText]    = useState("");
  const [body,      setBody]     = useState("");
  const [footer,    setFooter]   = useState("");
  const [buttons,   setButtons]  = useState([]);
  const [saving,    setSaving]   = useState(false);
  const [result,    setResult]   = useState(null);
  const [toast,     setToast]    = useState(null);

  const showToast = (m,t="success") => { setToast({m,t}); setTimeout(()=>setToast(null),4000); };

  // Extract {{n}} params from body
  const params = [...new Set([...body.matchAll(/\{\{(\d+)\}\}/g)].map(m=>m[1]))].sort();

  // Fill param placeholder in preview
  const preview = body.replace(/\{\{(\d+)\}\}/g, (_, n) => `[param${n}]`);

  // Add / remove buttons
  const addBtn    = () => setButtons(b=>[...b, {type:"QUICK_REPLY", text:"", url:"", phone:""}]);
  const removeBtn = i  => setButtons(b=>b.filter((_,j)=>j!==i));
  const updateBtn = (i,k,v) => setButtons(b=>b.map((btn,j)=>j===i?{...btn,[k]:v}:btn));

  const submit = async () => {
    if (!name.trim())  { showToast("Template name is required","error"); return; }
    if (!body.trim())  { showToast("Body text is required","error"); return; }
    if (!/^[a-z0-9_]+$/.test(name)) {
      showToast("Name must be lowercase letters, numbers and underscores only","error"); return;
    }
    setSaving(true); setResult(null);
    const res = await fetch("/api/templates/create", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({
        name, category, language,
        header, headerFormat:hFormat, headerText:hText,
        bodyText:body, footerText:footer,
        buttons: buttons.filter(b=>b.text.trim()),
      }),
    });
    const data = await res.json();
    if (res.ok && data.ok) {
      setResult({ ok:true, id:data.templateId, status:data.status });
      showToast("Template submitted for Meta approval! ✓");
    } else {
      setResult({ ok:false, error:data.error, hint:data.hint });
      showToast(data.error||"Submission failed","error");
    }
    setSaving(false);
  };

  return (
    <div style={{padding:24, display:"grid", gridTemplateColumns:"1fr 360px", gap:20, maxWidth:1100, margin:"0 auto"}}>

      {/* ── Left: Form ── */}
      <div>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:22}}>
          <Link href="/dashboard/templates" style={{color:C.txs,fontSize:14,textDecoration:"none"}}>← Templates</Link>
          <h1 style={{fontSize:20,fontWeight:800}}>Create Template</h1>
        </div>

        {/* Basic info */}
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:20,marginBottom:14}}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:14}}>Basic Info</div>
          <div style={{marginBottom:12}}>
            <label style={{display:"block",fontSize:11,fontWeight:700,color:C.txs,
              textTransform:"uppercase",letterSpacing:".5px",marginBottom:6}}>
              Template Name *
            </label>
            <input style={IS} placeholder="e.g. donation_receipt_v2"
              value={name} onChange={e=>setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,""))}/>
            <p style={{fontSize:11,color:C.txd,marginTop:4}}>
              Lowercase letters, numbers and underscores only. Cannot be changed after creation.
            </p>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div>
              <label style={{display:"block",fontSize:11,fontWeight:700,color:C.txs,
                textTransform:"uppercase",letterSpacing:".5px",marginBottom:6}}>Category *</label>
              <select style={IS} value={category} onChange={e=>setCategory(e.target.value)}>
                {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
              <p style={{fontSize:11,color:C.txd,marginTop:4}}>
                UTILITY = transactional · MARKETING = promotional
              </p>
            </div>
            <div>
              <label style={{display:"block",fontSize:11,fontWeight:700,color:C.txs,
                textTransform:"uppercase",letterSpacing:".5px",marginBottom:6}}>Language *</label>
              <select style={IS} value={language} onChange={e=>setLanguage(e.target.value)}>
                {LANGUAGES.map(l=><option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Header */}
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:20,marginBottom:14}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
            <div style={{fontWeight:700,fontSize:14}}>Header <span style={{color:C.txd,fontSize:12,fontWeight:400}}>(optional)</span></div>
            <button onClick={()=>setHeader(h=>!h)} style={{
              padding:"5px 12px",borderRadius:20,border:`1px solid ${C.border}`,
              background:header?`${C.g1}18`:"transparent",
              color:header?C.g1:C.txs,fontSize:12,fontWeight:700,cursor:"pointer"}}>
              {header?"✓ Enabled":"+ Add Header"}
            </button>
          </div>
          {header&&<>
            <div style={{marginBottom:12}}>
              <label style={{display:"block",fontSize:11,fontWeight:700,color:C.txs,
                textTransform:"uppercase",letterSpacing:".5px",marginBottom:6}}>Format</label>
              <div style={{display:"flex",gap:6}}>
                {["TEXT","IMAGE","DOCUMENT","VIDEO"].map(f=>(
                  <button key={f} onClick={()=>setHFormat(f)} style={{
                    padding:"6px 14px",borderRadius:8,border:`1px solid ${hFormat===f?C.g1:C.border}`,
                    background:hFormat===f?`${C.g1}18`:"transparent",
                    color:hFormat===f?C.g1:C.txs,fontSize:12,fontWeight:700,cursor:"pointer"}}>
                    {f==="TEXT"?"T":f==="IMAGE"?"🖼":f==="DOCUMENT"?"📄":"🎥"} {f}
                  </button>
                ))}
              </div>
            </div>
            {hFormat==="TEXT"&&(
              <div>
                <label style={{display:"block",fontSize:11,fontWeight:700,color:C.txs,
                  textTransform:"uppercase",letterSpacing:".5px",marginBottom:6}}>Header Text</label>
                <input style={IS} placeholder="e.g. Donation Receipt"
                  value={hText} onChange={e=>setHText(e.target.value)} maxLength={60}/>
                <p style={{fontSize:11,color:C.txd,marginTop:4}}>{hText.length}/60</p>
              </div>
            )}
            {hFormat!=="TEXT"&&(
              <div style={{padding:12,borderRadius:8,background:`${C.blue}08`,
                border:`1px solid ${C.blue}20`,fontSize:12,color:C.txs}}>
                💡 {hFormat} headers require a media URL when sending. The template will be approved
                without a specific file — you provide the URL at send time.
              </div>
            )}
          </>}
        </div>

        {/* Body */}
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:20,marginBottom:14}}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:14}}>Body *</div>
          <textarea style={{...IS,minHeight:120,resize:"vertical",lineHeight:1.7}}
            placeholder={"Dear *{{1}}*,\n\nThank you for your donation of *₹{{2}}/-* towards *{{3}}*.\n\nMay Lord Krishna bless you 🙏"}
            value={body} onChange={e=>setBody(e.target.value)} maxLength={1024}/>
          <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
            <p style={{fontSize:11,color:C.txd}}>
              Use {`{{1}}`} {`{{2}}`} for variables · *bold* _italic_ ~strikethrough~
            </p>
            <p style={{fontSize:11,color:C.txd}}>{body.length}/1024</p>
          </div>
          {params.length>0&&(
            <div style={{marginTop:10,padding:10,borderRadius:8,
              background:`${C.blue}08`,border:`1px solid ${C.blue}20`}}>
              <p style={{fontSize:11,fontWeight:700,color:C.blue,marginBottom:6}}>
                {params.length} variable{params.length>1?"s":""} detected:
              </p>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {params.map(p=>(
                  <span key={p} style={{fontSize:11,padding:"2px 9px",borderRadius:20,
                    background:`${C.blue}18`,color:C.blue,fontWeight:700}}>{`{{${p}}}`}</span>
                ))}
              </div>
            </div>
          )}
          {/* Quick insert buttons */}
          <div style={{marginTop:10,display:"flex",gap:6,flexWrap:"wrap"}}>
            <p style={{fontSize:11,color:C.txd,width:"100%",marginBottom:4}}>Quick insert:</p>
            {[`{{${(params.length||0)+1}}}`,`*bold*`,`_italic_`,`\n`].map((s,i)=>(
              <button key={i} onClick={()=>setBody(b=>b+s)} style={{
                padding:"4px 10px",borderRadius:6,border:`1px solid ${C.border}`,
                background:C.surf,color:C.txs,fontSize:12,cursor:"pointer",fontFamily:"monospace"}}>
                {s==="\n"?"↵ newline":s}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:20,marginBottom:14}}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:14}}>
            Footer <span style={{color:C.txd,fontSize:12,fontWeight:400}}>(optional)</span>
          </div>
          <input style={IS} placeholder="e.g. Hare Krishna Movement Visakhapatnam"
            value={footer} onChange={e=>setFooter(e.target.value)} maxLength={60}/>
          <p style={{fontSize:11,color:C.txd,marginTop:4}}>{footer.length}/60</p>
        </div>

        {/* Buttons */}
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:20,marginBottom:20}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
            <div style={{fontWeight:700,fontSize:14}}>
              Buttons <span style={{color:C.txd,fontSize:12,fontWeight:400}}>(optional, max 3)</span>
            </div>
            {buttons.length<3&&(
              <button onClick={addBtn} style={{padding:"5px 12px",borderRadius:20,
                border:`1px solid ${C.border}`,background:`${C.g1}18`,
                color:C.g1,fontSize:12,fontWeight:700,cursor:"pointer"}}>
                + Add Button
              </button>
            )}
          </div>
          {buttons.length===0&&(
            <p style={{fontSize:13,color:C.txd,textAlign:"center",padding:"16px 0"}}>
              No buttons. Add quick replies, URLs or phone numbers.
            </p>
          )}
          {buttons.map((btn,i)=>(
            <div key={i} style={{background:C.surf,borderRadius:10,padding:14,
              border:`1px solid ${C.border}`,marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                <div style={{display:"flex",gap:4}}>
                  {BTN_TYPES.map(t=>(
                    <button key={t} onClick={()=>updateBtn(i,"type",t)} style={{
                      padding:"4px 10px",borderRadius:6,border:`1px solid ${btn.type===t?C.g1:C.border}`,
                      background:btn.type===t?`${C.g1}18`:"transparent",
                      color:btn.type===t?C.g1:C.txs,fontSize:11,fontWeight:700,cursor:"pointer"}}>
                      {t==="QUICK_REPLY"?"↩ Reply":t==="URL"?"🔗 URL":"📞 Phone"}
                    </button>
                  ))}
                </div>
                <button onClick={()=>removeBtn(i)} style={{background:"none",
                  border:"none",color:C.red,fontSize:18,cursor:"pointer",padding:0}}>×</button>
              </div>
              <input style={{...IS,marginBottom:btn.type!=="QUICK_REPLY"?8:0}}
                placeholder="Button text (e.g. Donate Now)"
                value={btn.text} onChange={e=>updateBtn(i,"text",e.target.value)} maxLength={25}/>
              {btn.type==="URL"&&(
                <input style={IS} placeholder="https://hkmvizag.org/donate"
                  value={btn.url} onChange={e=>updateBtn(i,"url",e.target.value)}/>
              )}
              {btn.type==="PHONE_NUMBER"&&(
                <input style={IS} placeholder="+918977761187"
                  value={btn.phone} onChange={e=>updateBtn(i,"phone",e.target.value)}/>
              )}
            </div>
          ))}
        </div>

        {/* Result */}
        {result&&(
          <div style={{padding:"14px 18px",borderRadius:10,marginBottom:16,
            background:result.ok?`${C.g1}10`:`${C.red}10`,
            border:`1px solid ${result.ok?C.g1:C.red}30`,
            color:result.ok?C.g1:C.red}}>
            {result.ok?(
              <div>
                <div style={{fontWeight:800,fontSize:15,marginBottom:6}}>
                  ✓ Submitted for Meta approval!
                </div>
                <div style={{fontSize:13}}>Template ID: <strong>{result.id}</strong></div>
                <div style={{fontSize:13}}>Status: <strong>{result.status||"PENDING"}</strong></div>
                <div style={{fontSize:12,color:C.txs,marginTop:8,lineHeight:1.6}}>
                  Meta typically approves templates within 24 hours.
                  Once approved it will appear in your Templates list automatically.
                </div>
              </div>
            ):(
              <div>
                <div style={{fontWeight:700,marginBottom:4}}>✕ {result.error}</div>
                {result.hint&&<div style={{fontSize:12,opacity:.8}}>{result.hint}</div>}
              </div>
            )}
          </div>
        )}

        <button onClick={submit} disabled={saving||!name||!body} style={{
          width:"100%",padding:"13px",borderRadius:10,border:"none",
          background:`linear-gradient(135deg,${C.g1},${C.g2})`,
          color:"#000",fontSize:15,fontWeight:800,cursor:"pointer",
          opacity:saving||!name||!body?.5:1,
          display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          {saving?"⏳ Submitting to Meta…":"🚀 Submit Template for Approval"}
        </button>
        <p style={{fontSize:11,color:C.txd,textAlign:"center",marginTop:8}}>
          Requires WABA_ID + META_TOKEN in Railway environment variables
        </p>
      </div>

      {/* ── Right: WhatsApp Preview ── */}
      <div style={{position:"sticky",top:20,height:"fit-content"}}>
        <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:C.txs}}>
          📱 WhatsApp Preview
        </div>
        {/* Phone frame */}
        <div style={{background:"#0a0a0a",borderRadius:36,padding:12,
          border:"3px solid #333",boxShadow:"0 20px 60px rgba(0,0,0,.5)"}}>
          {/* Screen */}
          <div style={{background:"#e5ddd5",borderRadius:26,overflow:"hidden"}}>
            {/* Chat header */}
            <div style={{background:"#075e54",padding:"10px 14px",
              display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:36,height:36,borderRadius:"50%",background:"#25d366",
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🕉</div>
              <div>
                <div style={{fontWeight:700,fontSize:13,color:"#fff"}}>HKM Vizag</div>
                <div style={{fontSize:11,color:"rgba(255,255,255,.7)"}}>Business Account</div>
              </div>
            </div>
            {/* Chat body */}
            <div style={{padding:14,minHeight:300,background:"#e5ddd5",
              backgroundImage:"url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.02'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")"
              }}>
              {/* Message bubble */}
              <div style={{maxWidth:"85%",background:"#fff",borderRadius:"0 12px 12px 12px",
                padding:"8px 12px",boxShadow:"0 1px 2px rgba(0,0,0,.15)"}}>

                {/* Header preview */}
                {header&&hFormat==="TEXT"&&hText&&(
                  <div style={{fontWeight:800,fontSize:13,color:"#111",marginBottom:6,
                    paddingBottom:6,borderBottom:"1px solid #eee"}}>{hText}</div>
                )}
                {header&&hFormat==="IMAGE"&&(
                  <div style={{background:"#f0f0f0",borderRadius:8,height:120,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    marginBottom:8,fontSize:28}}>🖼</div>
                )}
                {header&&hFormat==="DOCUMENT"&&(
                  <div style={{background:"#f0f0f0",borderRadius:8,padding:10,
                    display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                    <span style={{fontSize:24}}>📄</span>
                    <span style={{fontSize:12,color:"#555"}}>Document.pdf</span>
                  </div>
                )}

                {/* Body */}
                <p style={{fontSize:13,lineHeight:1.6,color:"#111",whiteSpace:"pre-wrap",
                  wordBreak:"break-word",margin:0}}>
                  {preview||<span style={{color:"#aaa"}}>Your message body will appear here…</span>}
                </p>

                {/* Footer */}
                {footer&&(
                  <p style={{fontSize:11,color:"#888",marginTop:6,marginBottom:0}}>{footer}</p>
                )}

                {/* Time */}
                <div style={{textAlign:"right",fontSize:10,color:"#aaa",marginTop:4}}>
                  10:30 AM ✓✓
                </div>
              </div>

              {/* Buttons preview */}
              {buttons.filter(b=>b.text).length>0&&(
                <div style={{maxWidth:"85%",marginTop:2,display:"flex",flexDirection:"column",gap:2}}>
                  {buttons.filter(b=>b.text).map((btn,i)=>(
                    <div key={i} style={{background:"#fff",borderRadius:8,
                      padding:"8px 12px",textAlign:"center",
                      boxShadow:"0 1px 2px rgba(0,0,0,.15)",
                      color:"#00a5f4",fontSize:13,fontWeight:600}}>
                      {btn.type==="URL"?"🔗":btn.type==="PHONE_NUMBER"?"📞":"↩"} {btn.text}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Template info summary */}
        <div style={{marginTop:16,background:C.card,border:`1px solid ${C.border}`,
          borderRadius:12,padding:14}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:10}}>Template Summary</div>
          {[
            {l:"Name",    v:name||"—"},
            {l:"Category",v:category},
            {l:"Language",v:language},
            {l:"Variables",v:params.length>0?params.map(p=>`{{${p}}}`).join(", "):"None"},
            {l:"Buttons",  v:buttons.filter(b=>b.text).length||"None"},
            {l:"Header",   v:header?(hFormat+(hFormat==="TEXT"&&hText?" — "+hText:"")):"None"},
          ].map(r=>(
            <div key={r.l} style={{display:"flex",gap:10,padding:"6px 0",
              borderBottom:`1px solid ${C.border}50`,fontSize:12}}>
              <span style={{width:70,flexShrink:0,color:C.txs,fontWeight:600}}>{r.l}</span>
              <span style={{color:C.tx,wordBreak:"break-all"}}>{r.v}</span>
            </div>
          ))}
        </div>

        {/* Requirements note */}
        <div style={{marginTop:12,padding:12,borderRadius:10,fontSize:12,lineHeight:1.7,
          background:`${C.amber}08`,border:`1px solid ${C.amber}25`,color:C.txs}}>
          <strong style={{color:C.amber}}>⚠ Required env vars in Railway:</strong><br/>
          <code style={{fontSize:11,color:C.tx}}>WABA_ID</code> — WhatsApp Business Account ID<br/>
          <code style={{fontSize:11,color:C.tx}}>META_TOKEN</code> — Meta System User Token<br/>
          <span style={{fontSize:11,color:C.txd}}>Find both in Meta Business Manager → WhatsApp → API Setup</span>
        </div>
      </div>

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
