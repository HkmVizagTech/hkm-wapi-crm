export function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return { headers:[], rows:[] };
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g,""));
  const rows = lines.slice(1).map(line => {
    const cols=[]; let cur="", inQ=false;
    for (const ch of line) {
      if (ch==='"') inQ=!inQ;
      else if (ch==="," && !inQ) { cols.push(cur.trim()); cur=""; }
      else cur+=ch;
    }
    cols.push(cur.trim());
    const row={};
    headers.forEach((h,i) => row[h]=(cols[i]||"").replace(/^"|"$/g,""));
    return row;
  }).filter(r=>Object.values(r).some(v=>v));
  return { headers, rows };
}

export function downloadCSV(filename, headers, rows) {
  const lines = [headers.join(","), ...rows.map(r=>headers.map(h=>`"${(r[h]||"").replace(/"/g,'""')}"`).join(","))];
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([lines.join("\n")],{type:"text/csv"}));
  a.download = filename; a.click();
}

export const relTime = d => {
  if (!d) return "—";
  const m = Math.floor((Date.now()-new Date(d))/60000);
  if (m<1) return "just now"; if (m<60) return m+"m ago";
  const h=Math.floor(m/60); if (h<24) return h+"h ago";
  return new Date(d).toLocaleDateString();
};

export const SCOLOR = { sent:"#2979ff", delivered:"#00c9d4", read:"#25d366", failed:"#f44336", pending:"#ffb300" };

export const TEMPLATES = [
  {id:"27247353134867330",name:"regular_donation_success_message",status:"APPROVED",category:"UTILITY",language:"en",body:"🌼 Hare Krishna! 🌼\n\nDear *{{1}}*,\n\nThank you for your generous support towards *{{3}}*. 🙏\n\nYour donation of *₹{{2}}/-* has been received.\n\nMay Lord Krishna bless you and your family.",params:["Donor Name","Amount","Seva Name","Seva Name repeat"]},
  {id:"4327878714159509",name:"campaigner_onboarding_info",status:"APPROVED",category:"UTILITY",language:"en",body:"Hare Krishna, {{1}}\n\nYour registration as a campaigner is successful.\n\nAccess your link: {{2}}",params:["Campaigner Name","Campaign URL"]},
  {id:"2804076009767380",name:"annadana_acknowledgement_receipt",status:"APPROVED",category:"UTILITY",language:"en",body:"Hare Krishna {{1}}! 🙏\n\nWe received your contribution of *₹{{2}}* for Subhojanam Seva.\n\nPlease find your receipt attached. May Lord Krishna bless you! ✨",params:["Donor Name","Amount"],header:"DOCUMENT"},
  {id:"2764912273855016",name:"thank_you_page",status:"APPROVED",category:"UTILITY",language:"en_GB",body:"Hare Krishna 🙏\n\nDear {{1}},\n\nThank you for supporting Annadhana Seva. We received your donation of ₹{{2}}/-\n\nMay Lord Krishna bless you.",params:["Donor Name","Amount"],header:"DOCUMENT"},
  {id:"2440651626367846",name:"andseva_monthly_success_reciept",status:"APPROVED",category:"UTILITY",language:"en",body:"Hare Krishna, {{1}}! 🙏\n\nWe received your monthly Seva of *₹{{2}}* for Anndana Seva. Receipt attached. Thank you! ✨",params:["Donor Name","Amount"],header:"DOCUMENT"},
  {id:"2198233050944538",name:"known_contacts_donation",status:"APPROVED",category:"MARKETING",language:"en",body:"*Hare Krishna!*\n\nWith your contribution, ISKCON is providing *Nutritious food* to those in need. Join us 🙏",params:[],header:"IMAGE",buttons:["Donate Now"]},
  {id:"1966400694251336",name:"campaigns_donation_success_reciept",status:"APPROVED",category:"UTILITY",language:"en",body:"Hare Krishna, {{1}}! 🙏\n\nThank you for *₹{{2}}* towards Mandir Nirman Seva. Receipt attached. 🏛️",params:["Donor Name","Amount"],header:"DOCUMENT"},
  {id:"1930852564282449",name:"prasadam_qr_system",status:"APPROVED",category:"UTILITY",language:"en",body:"Hare Krishna *{{1}}*,\n\nThank you for your support as {{2}}.\n\nYour Prasadam QR Code for *{{3}}* is attached. Present at Prasadam Hall. 🙏",params:["Name","Role","Event Name"],buttons:["View QR"]},
  {id:"1649169906099549",name:"campaigner_donation_notification",status:"APPROVED",category:"UTILITY",language:"en",body:"Hare Krishna, {{1}}.\n\nNew contribution via your campaign:\nDonor: {{2}}\nAmount: ₹{{3}}",params:["Campaigner Name","Donor Name","Amount"]},
  {id:"1604684390803689",name:"campaigner_registration_notification",status:"APPROVED",category:"UTILITY",language:"en",body:"Hare Krishna Prabhu,\n\nA new campaigner has registered. Please review.",params:[],buttons:["View Dashboard"]},
  {id:"1521655262855276",name:"subhojanam_seva_pending",status:"APPROVED",category:"UTILITY",language:"en",body:"Hare Krishna *{{1}}*!\n\nYour transaction of *₹{{2}}* for *{{3}}* is pending.\n*{{4}}*",params:["Name","Amount","Purpose","Deadline Note"],header:"IMAGE",buttons:["Transaction Link"]},
  {id:"1467116448478464",name:"common_qr_template",status:"APPROVED",category:"UTILITY",language:"en",body:"Hare Krishna {{1}}! 🙏\n\n{{2}}\n📅 {{3}} | ⏰ {{4}}\n📍 {{5}}\nPass: {{7}}\nHelp: {{6}}",params:["Name","Event","Date","Time","Location","Help Contact","Pass Type"],header:"IMAGE"},
  {id:"1460764965596688",name:"dcc_api_failed_direct_message",status:"APPROVED",category:"UTILITY",language:"en",body:"🌼 *Hare Krishna!* 🌼\n\nDear *{{1}}*, thank you for supporting Annadana Seva. 🙏\n\nYour donation of *₹{{2}}/-* has been received.",params:["Donor Name","Amount"]},
  {id:"1442442767567914",name:"prasadam_update",status:"APPROVED",category:"MARKETING",language:"en_US",body:"Hare Krishna\n\n1. {{1}}\n2. {{2}}\n\nWith Regards,\nHare Krishna Movement",params:["Update 1","Update 2"],header:"IMAGE",buttons:["Support & Contribute"]},
  {id:"1121671320103406",name:"preacher_group_alert",status:"APPROVED",category:"UTILITY",language:"en",body:"Hare Krishna Prabhu\n\nNew donation processed:\nCampaigner: *{{1}}*\nDonor: *{{2}}*\nAmount: *₹{{3}}*",params:["Campaigner Name","Donor Name","Amount"]},
  {id:"1012641364557635",name:"prasadam_delivery",status:"PENDING",category:"MARKETING",language:"en",body:"Hare Krishna\n\n1. {{1}}\n2. {{2}}\n\nWith Regards,\nHare Krishna Movement",params:["LR No","Invoice Date"],header:"IMAGE",buttons:["Support & Contribute"]},
  {id:"989082673650879",name:"common_donation_success_reciept",status:"APPROVED",category:"UTILITY",language:"en",body:"Hare Krishna *{{1}}*! 🙏\n\nWe received your contribution of *₹{{2}}/-* for *{{3}}*. Receipt attached. May Lord Krishna bless you! ✨",params:["Donor Name","Amount","Seva Name"],header:"DOCUMENT"},
  {id:"915305181425842",name:"campaigner_registration_link_success",status:"APPROVED",category:"UTILITY",language:"en",body:"Hare Krishna, {{1}}!\n\nYour registration as a Campaigner has been Approved! ✅\n\nYour ID: {{2}}",params:["Campaigner Name","Campaigner ID"]},
  {id:"653952429258723",name:"delivery_update_prasadam",status:"APPROVED",category:"MARKETING",language:"en",body:"Hare Krishna\n\n1. {{1}}\n2. {{2}}\n\nWith Regards,\nHare Krishna Movement",params:["LR No / Courier","Invoice Date"],header:"IMAGE",buttons:["Support & Contribute"]},
];
