const BASE  = "https://wapi.flaxxa.com";
const TOKEN = process.env.FLAXXA_TOKEN;

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ token: TOKEN, ...body }),
  });
  return res.json();
}

async function get(path) {
  const res = await fetch(`${BASE}${path}?token=${TOKEN}`);
  return res.json();
}

export async function sendText(phone, message, header = "", footer = "") {
  return post("/api/v1/sendmessage", {
    phone, message,
    ...(header && { header }),
    ...(footer && { footer }),
  });
}

export async function sendTemplate(phone, templateName, language = "en", params = []) {
  return post("/api/v1/sendtemplatemessage", {
    phone,
    template_name:     templateName,
    template_language: language,
    components: params.length
      ? [{ type: "body", parameters: params.map(v => ({ type: "text", text: v })) }]
      : [],
  });
}

export async function sendTemplateWithMedia(phone, templateName, language = "en", mediaUrl, params = []) {
  return post("/api/v1/sendtemplatemessage", {
    phone,
    template_name:     templateName,
    template_language: language,
    components: [
      { type: "header", parameters: [{ type: "image", image: { link: mediaUrl } }] },
      ...(params.length
        ? [{ type: "body", parameters: params.map(v => ({ type: "text", text: v })) }]
        : []),
    ],
  });
}

export async function getTemplates() {
  return get("/api/v1/getTemplates");
}

export async function getContacts() {
  return get("/api/v1/getContacts");
}
