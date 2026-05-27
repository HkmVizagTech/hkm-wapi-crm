"use client";
import { useState, useEffect, useRef } from "react";
import { Button, Input, Modal, Table, PageHeader, Badge, Spinner } from "@/components/ui";
import { useToast }    from "@/hooks/useToast";
import { Toast }       from "@/components/ui";
import { parseCSV, downloadCSV, relativeTime } from "@/lib/utils";

export default function ContactsPage() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search,  setSearch]    = useState("");
  const [addOpen, setAddOpen]   = useState(false);
  const [csvOpen, setCsvOpen]   = useState(false);
  const [form,    setForm]      = useState({ name:"", phone:"", email:"", tags:"", notes:"" });
  const [saving,  setSaving]    = useState(false);
  const [csvRows, setCsvRows]   = useState([]);
  const [csvErr,  setCsvErr]    = useState("");
  const [importing, setImporting] = useState(false);
  const fileRef = useRef();
  const { toast, showToast, clearToast } = useToast();

  useEffect(() => { loadContacts(); }, []);

  const loadContacts = async () => {
    setLoading(true);
    const res = await fetch("/api/contacts");
    const d   = await res.json();
    setContacts(d.contacts || []);
    setLoading(false);
  };

  const saveContact = async () => {
    if (!form.name || !form.phone) return;
    setSaving(true);
    const res = await fetch("/api/contacts", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ ...form, tags: form.tags.split(",").map(t=>t.trim()).filter(Boolean) }),
    });
    if (res.ok) {
      showToast("Contact added!"); setAddOpen(false);
      setForm({ name:"",phone:"",email:"",tags:"",notes:"" });
      loadContacts();
    } else {
      const d = await res.json();
      showToast(d.error || "Failed", "error");
    }
    setSaving(false);
  };

  const handleCSVFile = e => {
    const file = e.target.files[0]; if (!file) return;
    setCsvErr(""); setCsvRows([]);
    const reader = new FileReader();
    reader.onload = ev => {
      const { headers, rows } = parseCSV(ev.target.result);
      if (!headers.includes("phone")) { setCsvErr('CSV must have a "phone" column'); return; }
      if (!rows.length) { setCsvErr("No data rows found"); return; }
      setCsvRows(rows);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const importCSV = async () => {
    if (!csvRows.length) return;
    setImporting(true);
    const contacts = csvRows.map(r => ({
      phone: r.phone?.trim(),
      name:  r.name  || r.phone,
      email: r.email || "",
      tags:  r.tags  ? r.tags.split(";").map(t=>t.trim()) : [],
      notes: r.notes || "",
    })).filter(c => c.phone);
    const res = await fetch("/api/contacts/import", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ contacts }),
    });
    const d = await res.json();
    showToast(`${d.inserted} imported, ${d.skipped} skipped`);
    setCsvOpen(false); setCsvRows([]); loadContacts();
    setImporting(false);
  };

  const downloadSample = () => downloadCSV("contacts_sample.csv",
    ["phone","name","email","tags","notes"],
    [{ phone:"918977761187", name:"Mukunda", email:"mukunda@example.com", tags:"devotee;vip", notes:"Regular donor" }]
  );

  const filtered = contacts.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) || c.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 fade-up">
      <PageHeader
        title="👥 Contacts"
        subtitle={`${contacts.length} total contacts`}
        actions={<>
          <Button variant="ghost" size="sm" onClick={() => setCsvOpen(true)}>📁 Import CSV</Button>
          <Button size="sm" onClick={() => setAddOpen(true)}>+ Add Contact</Button>
        </>}
      />

      <Input placeholder="🔍  Search by name, phone or email…"
        value={search} onChange={e=>setSearch(e.target.value)} className="mb-4"/>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size={32}/></div>
      ) : (
        <Table
          headers={["Name","Phone","Email","Tags","Messages","Added"]}
          empty="No contacts yet. Add manually or import CSV."
          rows={filtered.map(c => [
            <span className="font-semibold">{c.name}</span>,
            <span className="font-mono text-xs" style={{ color:"#8899b0" }}>{c.phone}</span>,
            <span className="text-xs" style={{ color:"#8899b0" }}>{c.email || "—"}</span>,
            <div className="flex gap-1 flex-wrap">
              {(c.tags||[]).map(t => <Badge key={t} color="#00c9d4">{t}</Badge>)}
            </div>,
            <span className="text-xs font-bold" style={{ color:"#25d366" }}>{c.totalMessagesSent || 0}</span>,
            <span className="text-xs" style={{ color:"#445566" }}>{relativeTime(c.addedAt)}</span>,
          ])}
        />
      )}

      {/* Add contact modal */}
      <Modal open={addOpen} onClose={()=>setAddOpen(false)} title="Add Contact">
        <Input label="Name *" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Mukunda Das"/>
        <Input label="Phone * (with country code)" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="918977761187"/>
        <Input label="Email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="mukunda@example.com"/>
        <Input label="Tags (comma-separated)" value={form.tags} onChange={e=>setForm({...form,tags:e.target.value})} placeholder="devotee, vip, donor"/>
        <Input label="Notes" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Any notes…"/>
        <div className="flex gap-3 mt-4">
          <Button variant="ghost" onClick={()=>setAddOpen(false)} className="flex-1 justify-center">Cancel</Button>
          <Button onClick={saveContact} disabled={saving||!form.name||!form.phone} className="flex-1 justify-center">
            {saving ? <><Spinner size={14} color="#000"/> Saving…</> : "Save Contact"}
          </Button>
        </div>
      </Modal>

      {/* CSV import modal */}
      <Modal open={csvOpen} onClose={()=>setCsvOpen(false)} title="Import Contacts from CSV" width="max-w-2xl">
        <div className="mb-4 p-4 rounded-xl border" style={{ background:"#0d1117", borderColor:"#1c2a3f" }}>
          <p className="text-xs font-bold mb-2" style={{ color:"#8899b0" }}>REQUIRED CSV FORMAT</p>
          <div className="overflow-x-auto">
            <table className="text-xs w-full">
              <thead><tr>
                {["phone *","name","email","tags (;-separated)","notes"].map(h=>(
                  <th key={h} className="px-3 py-2 text-left font-bold rounded" style={{ background:"rgba(37,211,102,0.1)", color:"#25d366" }}>{h}</th>
                ))}
              </tr></thead>
              <tbody><tr>
                {["918977761187","Mukunda","m@ex.com","devotee;vip","Regular donor"].map((v,i)=>(
                  <td key={i} className="px-3 py-2" style={{ color:"#8899b0" }}>{v}</td>
                ))}
              </tr></tbody>
            </table>
          </div>
        </div>
        <Button variant="teal" className="w-full justify-center mb-4" onClick={downloadSample}>
          ⬇ Download Sample CSV
        </Button>
        <input ref={fileRef} type="file" accept=".csv" onChange={handleCSVFile} className="hidden"/>
        <div onClick={()=>fileRef.current?.click()} className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors hover:border-[#25d366]/50"
          style={{ borderColor:"#1c2a3f" }}>
          <div className="text-3xl mb-2">📁</div>
          <div className="font-bold text-sm">Tap to upload CSV</div>
          <div className="text-xs mt-1" style={{ color:"#8899b0" }}>or drag & drop</div>
        </div>
        {csvErr && <p className="text-red-400 text-sm mt-3 font-semibold">{csvErr}</p>}
        {csvRows.length > 0 && (
          <div className="mt-4 p-3 rounded-xl border" style={{ background:"rgba(37,211,102,0.05)", borderColor:"rgba(37,211,102,0.2)" }}>
            <p className="text-sm font-bold" style={{ color:"#25d366" }}>✓ {csvRows.length} contacts ready to import</p>
            <div className="mt-2 max-h-32 overflow-y-auto space-y-1">
              {csvRows.slice(0,5).map((r,i) => (
                <div key={i} className="text-xs" style={{ color:"#8899b0" }}>{r.name||r.phone} — {r.phone}</div>
              ))}
              {csvRows.length > 5 && <div className="text-xs" style={{ color:"#445566" }}>+{csvRows.length-5} more…</div>}
            </div>
          </div>
        )}
        <div className="flex gap-3 mt-4">
          <Button variant="ghost" onClick={()=>setCsvOpen(false)} className="flex-1 justify-center">Cancel</Button>
          <Button onClick={importCSV} disabled={!csvRows.length||importing} className="flex-1 justify-center">
            {importing ? <><Spinner size={14} color="#000"/> Importing…</> : `Import ${csvRows.length} Contacts`}
          </Button>
        </div>
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast}/>}
    </div>
  );
}
