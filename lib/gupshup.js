const GUPSHUP_APIKEY  = process.env.GUPSHUP_APIKEY  || "sk_0381bd5a455746478c53899f213f838b";
const GUPSHUP_APPNAME = process.env.GUPSHUP_APPNAME || "4KoeJVChI420QyWVhAW1kE7L";
const GUPSHUP_SOURCE  = process.env.GUPSHUP_SOURCE  || "917075176108";
const GUPSHUP_API     = "https://api.gupshup.io/wa/api/v1/template/msg";

// Human-readable version of the business WhatsApp number people actually message.
// Derived from GUPSHUP_SOURCE so it always matches the number being used.
export function displayBusinessPhone() {
  const n = String(GUPSHUP_SOURCE).replace(/\D/g, "");
  if (n.startsWith("91") && n.length === 12) return `+91 ${n.slice(2, 5)} ${n.slice(5)}`;
  return n;
}

// Gupshup's template API needs the template's ID (a UUID), not its name.
// Sending the name gets "submitted" back, then fails silently on Gupshup's side.
let _tplCache = { at:0, map:null };
async function loadTemplateMap() {
  const list = await getGupshupTemplates();
  if (list.length) _tplCache = { at:Date.now(), map:new Map(list.map(t => [t.elementName, t.id])) };
  return _tplCache.map;
}
export async function resolveGupshupTemplateId(nameOrId) {
  const v = String(nameOrId || "").trim();
  if (!v) return null;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)) return v; // already an ID
  let map = _tplCache.map;
  if (!map || Date.now() - _tplCache.at > 10*60*1000) map = await loadTemplateMap();
  let id = map?.get(v);
  if (!id) { map = await loadTemplateMap(); id = map?.get(v); } // template may be newly approved
  return id || null;
}

export async function sendGupshupTemplate(phone, templateName, params=[], mediaUrl=null, headerFormat=null) {
  const templateId = await resolveGupshupTemplateId(templateName);
  if (!templateId) return { ok:false, wamid:"", error:`Template "${templateName}" not found in Gupshup app` };
  const template = { id:templateId, params };
  if (mediaUrl && headerFormat) {
    const fmt = headerFormat.toUpperCase();
    if (fmt==="IMAGE")    template.header = { type:"IMAGE",    link:mediaUrl };
    if (fmt==="VIDEO")    template.header = { type:"VIDEO",    link:mediaUrl };
    if (fmt==="DOCUMENT") template.header = { type:"DOCUMENT", link:mediaUrl };
  }
  const body = new URLSearchParams({
    channel:    "whatsapp",
    source:     GUPSHUP_SOURCE,
    destination: String(phone).replace(/^\+/,""),
    "src.name": GUPSHUP_APPNAME,
    template:   JSON.stringify(template),
    message:    JSON.stringify({ type:"text", text:"Hare Krishna" }),
  });
  const r = await fetch(GUPSHUP_API, {
    method:"POST",
    headers:{ "apikey":GUPSHUP_APIKEY, "Content-Type":"application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const d = await r.json().catch(()=>({}));
  const ok = d.status === "submitted";
  return { ok, wamid:d.messageId||"", error:d.message||"" };
}

const GUPSHUP_APPID = process.env.GUPSHUP_APPID || "fa55cc14-ca7a-4e66-825b-c1d8a55dbfdf";

export async function getGupshupTemplates() {
  try {
    const r = await fetch(
      `https://api.gupshup.io/wa/app/${GUPSHUP_APPID}/template`,
      { headers:{ "apikey":GUPSHUP_APIKEY }, cache:"no-store" }
    );
    const d = await r.json().catch(()=>({}));
    return d.templates || [];
  } catch { return []; }
}

export async function sendGupshupText(phone, text) {
  const body = new URLSearchParams({
    channel: "whatsapp",
    source:  GUPSHUP_SOURCE,
    destination: String(phone).replace(/^\+/,""),
    "src.name": GUPSHUP_APPNAME,
    message: JSON.stringify({ type:"text", text }),
  });
  const r = await fetch("https://api.gupshup.io/wa/api/v1/msg", {
    method:"POST",
    headers:{ "apikey":GUPSHUP_APIKEY, "Content-Type":"application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const d = await r.json().catch(()=>({}));
  const ok = d.status === "submitted";
  return { ok, wamid:d.messageId||"", error:d.message||"" };
}
