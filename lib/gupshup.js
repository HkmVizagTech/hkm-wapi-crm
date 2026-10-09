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
  if (list.length) {
    const map = new Map();
    for (const t of list) {
      let meta = {};
      try { meta = typeof t.containerMeta === "string" ? JSON.parse(t.containerMeta) : (t.containerMeta||{}); } catch {}
      const nums = [...String(meta.data || t.data || "").matchAll(/\{\{(\d+)\}\}/g)].map(m => Number(m[1]));
      const info = { id:t.id, type:String(t.templateType||"TEXT").toUpperCase(),
                     paramCount: nums.length ? Math.max(...nums) : 0 };
      map.set(t.elementName, info);
      map.set(t.id, info);
    }
    _tplCache = { at:Date.now(), map };
  }
  return _tplCache.map;
}
// Returns { id, type } — type is TEXT | IMAGE | VIDEO | DOCUMENT | ...
export async function resolveGupshupTemplate(nameOrId) {
  const v = String(nameOrId || "").trim();
  if (!v) return null;
  let map = _tplCache.map;
  if (!map || Date.now() - _tplCache.at > 10*60*1000) map = await loadTemplateMap();
  let info = map?.get(v);
  if (!info) { map = await loadTemplateMap(); info = map?.get(v); } // template may be newly approved
  if (!info && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v))
    return { id:v, type:"TEXT" }; // looks like an ID already
  return info || null;
}
export async function resolveGupshupTemplateId(nameOrId) {
  return (await resolveGupshupTemplate(nameOrId))?.id || null;
}

const MEDIA_TYPES = ["IMAGE","VIDEO","DOCUMENT"];
export const isMediaTemplate = type => MEDIA_TYPES.includes(String(type||"").toUpperCase());

// For media-header templates Gupshup expects the media in the `message` field,
// e.g. {"type":"image","image":{"link":"https://..."}} — not inside `template`.
export function buildGupshupMessage(mediaUrl, headerFormat) {
  const fmt = String(headerFormat||"").toUpperCase();
  if (!mediaUrl || !MEDIA_TYPES.includes(fmt)) return { type:"text", text:"Hare Krishna" };
  if (fmt === "IMAGE") return { type:"image", image:{ link:mediaUrl } };
  if (fmt === "VIDEO") return { type:"video", video:{ link:mediaUrl } };
  const filename = decodeURIComponent(String(mediaUrl).split("?")[0].split("/").pop() || "") || "Document.pdf";
  return { type:"document", document:{ link:mediaUrl, filename } };
}

// WhatsApp rejects variables containing new lines, tabs or 4+ spaces in a row
export const cleanParam = v => String(v ?? "").replace(/[\r\n\t]+/g, " ").replace(/ {4,}/g, "   ").trim();

// Returns an error string if params don't satisfy the template, or "" if OK
export function gupshupParamError(tpl, params) {
  const need = tpl?.paramCount || 0;
  if (!need) return "";
  const vals = (params || []).slice(0, need).map(cleanParam);
  const missing = Array.from({length:need}, (_,i) => i).filter(i => !vals[i]).map(i => `{{${i+1}}}`);
  return missing.length ? `Template needs ${need} value(s); missing/empty: ${missing.join(", ")}` : "";
}

// Shared checks before sending: returns an error string, or "" if OK
export function gupshupMediaError(tpl, mediaUrl) {
  if (!isMediaTemplate(tpl?.type)) return "";
  if (!mediaUrl || !String(mediaUrl).startsWith("http"))
    return `Template has a header of type ${tpl.type} — add a public ${tpl.type.toLowerCase()} URL before sending`;
  return "";
}

export async function sendGupshupTemplate(phone, templateName, params=[], mediaUrl=null, headerFormat=null) {
  const tpl = await resolveGupshupTemplate(templateName);
  if (!tpl) return { ok:false, wamid:"", error:`Template "${templateName}" not found in Gupshup app` };
  const mediaErr = gupshupMediaError(tpl, mediaUrl);
  if (mediaErr) return { ok:false, wamid:"", error:mediaErr };
  const paramErr = gupshupParamError(tpl, params);
  if (paramErr) return { ok:false, wamid:"", error:paramErr };
  const template = { id:tpl.id, params: tpl.paramCount ? params.slice(0, tpl.paramCount).map(cleanParam) : params.map(cleanParam) };
  const message  = buildGupshupMessage(mediaUrl, isMediaTemplate(tpl.type) ? tpl.type : headerFormat);
  const body = new URLSearchParams({
    channel:    "whatsapp",
    source:     GUPSHUP_SOURCE,
    destination: String(phone).replace(/^\+/,""),
    "src.name": GUPSHUP_APPNAME,
    template:   JSON.stringify(template),
    message:    JSON.stringify(message),
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
