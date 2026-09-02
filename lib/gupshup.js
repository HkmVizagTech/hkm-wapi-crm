const GUPSHUP_APIKEY  = process.env.GUPSHUP_APIKEY  || "sk_0381bd5a455746478c53899f213f838b";
const GUPSHUP_APPNAME = process.env.GUPSHUP_APPNAME || "4KoeJVChI420QyWVhAW1kE7L";
const GUPSHUP_SOURCE  = process.env.GUPSHUP_SOURCE  || "917075176108";
const GUPSHUP_API     = "https://api.gupshup.io/wa/api/v1/template/msg";

export async function sendGupshupTemplate(phone, templateName, params=[], mediaUrl=null, headerFormat=null) {
  const template = { id:templateName, params };
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
