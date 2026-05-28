const BASE = "https://wapi.flaxxa.com";
const tok  = () => process.env.FLAXXA_TOKEN;

async function post(path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({ token: tok(), ...body }),
  });
  return r.json();
}
async function get(path) {
  const r = await fetch(`${BASE}${path}?token=${tok()}`);
  return r.json();
}
export const sendText     = (phone, message)               => post("/api/v1/sendmessage",         { phone, message });
export const sendTemplate = (phone, name, lang, params=[]) => post("/api/v1/sendtemplatemessage", {
  phone, template_name:name, template_language:lang||"en",
  components: params.length ? [{ type:"body", parameters:params.map(v=>({type:"text",text:v})) }] : [],
});
export const getTemplates = () => get("/api/v1/getTemplates");
export const getContacts  = () => get("/api/v1/getContacts");
