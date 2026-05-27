export function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  const rows = lines.slice(1).map(line => {
    const cols = []; let cur = "", inQ = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') { inQ = !inQ; }
      else if (line[i] === "," && !inQ) { cols.push(cur.trim()); cur = ""; }
      else cur += line[i];
    }
    cols.push(cur.trim());
    const row = {};
    headers.forEach((h, i) => row[h] = (cols[i] || "").replace(/^"|"$/g, ""));
    return row;
  }).filter(r => Object.values(r).some(v => v));
  return { headers, rows };
}

export function downloadCSV(filename, headers, rows) {
  const lines = [
    headers.join(","),
    ...rows.map(r => headers.map(h => `"${(r[h] || "").replace(/"/g, '""')}"`).join(","))
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function fmt(n) { return n >= 1000 ? (n / 1000).toFixed(1) + "k" : String(n ?? 0); }

export function relativeTime(date) {
  if (!date) return "—";
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(date).toLocaleDateString();
}

export const STATUS_COLOR = {
  sent:      "#2979ff",
  delivered: "#00c9d4",
  read:      "#25d366",
  failed:    "#f44336",
  pending:   "#ffb300",
};

export const TEMPLATES = [
  { id:"27247353134867330", name:"regular_donation_success_message",      status:"APPROVED", category:"UTILITY",   language:"en",
    body:"🌼 Hare Krishna! 🌼\n\nDear *{{1}}*,\n\nThank you for your generous support towards *{{3}}*. 🙏\n\nYour donation of *₹{{2}}/-* has been successfully received.\n\nMay Lord Krishna always shower His blessings upon you and your family.",
    params:["Donor Name","Amount","Seva Name","Seva Name repeat"] },
  { id:"4327878714159509",  name:"campaigner_onboarding_info",             status:"APPROVED", category:"UTILITY",   language:"en",
    body:"Hare Krishna,\n{{1}}\n\nYour registration as a campaigner for the *Hare Krishna Vaikuntam Project* is successful.\n\nAccess your unique contribution link: {{2}}",
    params:["Campaigner Name","Campaign URL"] },
  { id:"2804076009767380",  name:"annadana_acknowledgement_receipt",       status:"APPROVED", category:"UTILITY",   language:"en",
    body:"Hare Krishna {{1}}! 🙏\n\nWe have received your contribution of *₹{{2}}* for the Subhojanam Seva.\n\nPlease find your *Acknowledgment Receipt* attached.\n\nMay Lord Krishna bless you! ✨",
    params:["Donor Name","Amount"], header:"DOCUMENT" },
  { id:"2764912273855016",  name:"thank_you_page",                         status:"APPROVED", category:"UTILITY",   language:"en_GB",
    body:"Hare Krishna 🙏\n\nDear {{1}},\n\nThank you for supporting Annadhana Seva. We have received your donation of ₹{{2}}/-\n\nMay Lord Krishna bless you and your family.",
    params:["Donor Name","Amount"], header:"DOCUMENT" },
  { id:"2440651626367846",  name:"andseva_monthly_success_reciept",        status:"APPROVED", category:"UTILITY",   language:"en",
    body:"Hare Krishna, {{1}}! 🙏\n\nWe have received your monthly Seva of *₹{{2}}* for Anndana Seva.\n\nPlease find your official donation receipt attached.\n\nThank you for your kindness! ✨",
    params:["Donor Name","Amount"], header:"DOCUMENT" },
  { id:"2198233050944538",  name:"known_contacts_donation",                status:"APPROVED", category:"MARKETING", language:"en",
    body:"*Hare Krishna!*\n\nEvery day, many people struggle to get a proper meal. With your small contribution, ISKCON's Hare Krishna Movement is providing *Nutritious food* to those in need.\n\nJoin ISKCON in this meaningful initiative 🙏",
    params:[], header:"IMAGE", buttons:["Donate Now"] },
  { id:"1966400694251336",  name:"campaigns_donation_success_reciept",     status:"APPROVED", category:"UTILITY",   language:"en",
    body:"Hare Krishna, {{1}}! 🙏\n\nThank you for your contribution of *₹{{2}}* towards the *Mandir Nirman Seva*.\n\nWe have attached your official donation receipt. 🏛️\n\nMay the Lord bless you and your family.",
    params:["Donor Name","Amount"], header:"DOCUMENT" },
  { id:"1930852564282449",  name:"prasadam_qr_system",                     status:"APPROVED", category:"UTILITY",   language:"en",
    body:"Hare Krishna *{{1}}*,\n\nThank you for your kind support as a {{2}}.\n\nPlease find your *Prasadam QR Code* attached for *{{3}}.*\n\nKindly present this QR code at the Prasadam Hall. 🙏",
    params:["Name","Role","Event Name"], buttons:["View QR"] },
  { id:"1649169906099549",  name:"campaigner_donation_notification",        status:"APPROVED", category:"UTILITY",   language:"en",
    body:"Hare Krishna, {{1}}.\n\nA new contribution has been recorded through your campaign link.\n\nDonor: {{2}}\nAmount: ₹{{3}}\n\nView your updated total on the campaign page.",
    params:["Campaigner Name","Donor Name","Amount"] },
  { id:"1604684390803689",  name:"campaigner_registration_notification",    status:"APPROVED", category:"UTILITY",   language:"en",
    body:"Hare Krishna Prabhu,\n\nA new campaigner has successfully registered for the temple fundraising campaign.\n\nPlease review and take necessary action.",
    params:[], header:"TEXT", buttons:["View Dashboard"] },
  { id:"1521655262855276",  name:"subhojanam_seva_pending",                 status:"APPROVED", category:"UTILITY",   language:"en",
    body:"Hare Krishna *{{1}}*!\n\nYour transaction of *₹{{2}}* for *{{3}}* is pending.\n\n*{{4}}*\n\nIf already completed, please ignore this message.",
    params:["Name","Amount","Purpose","Deadline Note"], header:"IMAGE", buttons:["Transaction Link"] },
  { id:"1467116448478464",  name:"common_qr_template",                     status:"APPROVED", category:"UTILITY",   language:"en",
    body:"Hare Krishna {{1}}! 🙏\n\n{{2}}\n📅 {{3}} | ⏰ {{4}}\n📍 {{5}}\nPass includes: {{7}}\n\nShow this QR at the required checkpoint. Help: {{6}}",
    params:["Name","Event Name","Date","Time","Location","Help Contact","Pass Type"], header:"IMAGE" },
  { id:"1460764965596688",  name:"dcc_api_failed_direct_message",          status:"APPROVED", category:"UTILITY",   language:"en",
    body:"🌼 *Hare Krishna!* 🌼\n\nDear *{{1}}*,\n\nThank you for supporting *Annadana Seva*. 🙏\n\nYour donation of *₹{{2}}/-* has been received.\n\nMay Lord Krishna shower His blessings upon you.",
    params:["Donor Name","Amount"] },
  { id:"1442442767567914",  name:"prasadam_update",                        status:"APPROVED", category:"MARKETING", language:"en_US",
    body:"Hare Krishna\n\n1. {{1}}\n\n2. {{2}}\n\nWith Regards,\nHare Krishna Movement",
    params:["Update Line 1","Update Line 2"], header:"IMAGE", buttons:["Support & Contribute"] },
  { id:"1121671320103406",  name:"preacher_group_alert",                   status:"APPROVED", category:"UTILITY",   language:"en",
    body:"Hare Krishna Prabhu\n\nA new donation has been processed.\n\nCampaigner: *{{1}}*\nDonor: *{{2}}*\nAmount: *₹{{3}}*\n\nLog in to your dashboard to view progress.",
    params:["Campaigner Name","Donor Name","Amount"] },
  { id:"1012641364557635",  name:"prasadam_delivery",                      status:"PENDING",  category:"MARKETING", language:"en",
    body:"Hare Krishna\n\n1. {{1}}\n\n2. {{2}}\n\nWith Regards,\nHare Krishna Movement",
    params:["LR No / Courier","Invoice Date"], header:"IMAGE", buttons:["Support & Contribute"] },
  { id:"989082673650879",   name:"common_donation_success_reciept",        status:"APPROVED", category:"UTILITY",   language:"en",
    body:"Hare Krishna *{{1}}*! 🙏\n\nWe have received your contribution of *₹{{2}}/-* for the *{{3}}*.\n\nPlease find your Acknowledgment Receipt attached.\n\nThank you! May Lord Krishna bless you! ✨",
    params:["Donor Name","Amount","Seva Name"], header:"DOCUMENT" },
  { id:"915305181425842",   name:"campaigner_registration_link_success",   status:"APPROVED", category:"UTILITY",   language:"en",
    body:"Hare Krishna, {{1}}!\n\nYour registration as a Campaigner for the *Hare Krishna Vaikuntam Project* has been Approved! ✅\n\nYour ID: {{2}}\n\nRegards,\nHare Krishna Movement Visakhapatnam",
    params:["Campaigner Name","Campaigner ID"] },
  { id:"653952429258723",   name:"delivery_update_prasadam",               status:"APPROVED", category:"MARKETING", language:"en",
    body:"Hare Krishna\n\n1. {{1}}\n\n2. {{2}}\n\nWith Regards,\nHare Krishna Movement",
    params:["LR No / Courier Info","Invoice Date"], header:"IMAGE", buttons:["Support & Contribute"] },
];
