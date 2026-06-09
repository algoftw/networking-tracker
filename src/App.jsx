import { useState, useEffect, useRef, useMemo } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDBZZ_6aSaBQJpfOCzawiOiGlQfZee3S0Y",
  authDomain: "networking-tracker-a134a.firebaseapp.com",
  projectId: "networking-tracker-a134a",
  storageBucket: "networking-tracker-a134a.firebasestorage.app",
  messagingSenderId: "967222059152",
  appId: "1:967222059152:web:3293dd366e66938bea7815"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const contactsCol = collection(db, "contacts");
const settingsDoc = doc(db, "settings", "resume");

const STORAGE_KEY = "finance-contacts";

const emptyContact = { id: "", firstName: "", lastName: "", profession: "Investment Banking Analyst", email: "", company: "", linkedin: "", phone: "", city: "", status: "Contacted", notes: "", lastContacted: "", responded: false };

const CITY_OPTIONS = ["New York", "Chicago", "San Francisco", "Dallas", "Houston", "Other"];

function daysSince(dateStr) { if (!dateStr) return null; const d = new Date(dateStr); if (isNaN(d)) return null; return Math.floor((new Date() - d) / 864e5); }
function formatDaysAgo(days) { if (days === null) return null; if (days === 0) return "Today"; if (days === 1) return "1 day ago"; if (days < 30) return `${days}d ago`; if (days < 365) return `${Math.floor(days / 30)}mo ${days % 30}d ago`; return `${Math.floor(days / 365)}y ${Math.floor((days % 365) / 30)}mo ago`; }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

const STATUS_OPTIONS = ["Contacted", "Followed Up", "Connected", "Spoke With", "No Response"];
const SC = {
  Contacted:      { bg: "#e0f2fe", text: "#0369a1", dot: "#0ea5e9", fill: "#0ea5e9" },
  "Followed Up":  { bg: "#fef3c7", text: "#92400e", dot: "#f59e0b", fill: "#f59e0b" },
  Connected:      { bg: "#dcfce7", text: "#166534", dot: "#22c55e", fill: "#22c55e" },
  "Spoke With":   { bg: "#ede9fe", text: "#6d28d9", dot: "#8b5cf6", fill: "#8b5cf6" },
  "No Response":  { bg: "#fef2f2", text: "#991b1b", dot: "#ef4444", fill: "#ef4444" },
};

// Palette
const P = {
  bg: "#F4E3BB",        // warm golden background
  bg2: "#f5efdf",       // card bg
  bg3: "#ebe4d4",       // bar track
  border: "#dfd8c8",    // borders
  forest: "#154734",    // UTD green
  orange: "#e87500",    // UTD orange
  text: "#1e293b",      // primary text
  textMd: "#475569",    // medium text
  textLt: "#94a3b8",    // light text
  white: "#fefcf3",     // warm cream for cards/inputs
  accent: "#154734",    // primary accent = forest green
  success: "#16a34a",
  danger: "#dc2626",
  warn: "#d97706",
};

const serif = "'DM Serif Display', Georgia, serif";
const sans = "'DM Sans', 'Helvetica Neue', sans-serif";

/* ─── Sub-components ─── */
function HBar({ label, value, max, color, suffix = "" }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontFamily: sans, fontSize: 13, color: P.text, fontWeight: 500 }}>{label}</span>
        <span style={{ fontFamily: sans, fontSize: 12, fontWeight: 600, color }}>{value}{suffix}</span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: P.bg3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, borderRadius: 3, background: color, transition: "width 0.6s cubic-bezier(.4,0,.2,1)" }} />
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color, icon }) {
  return (
    <div style={{ background: P.white, border: `1px solid ${P.border}`, borderRadius: 16, padding: "24px 22px", flex: "1 1 180px", minWidth: 160, position: "relative", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      <div style={{ position: "absolute", top: -30, right: -30, width: 90, height: 90, borderRadius: "50%", background: color, opacity: 0.07, pointerEvents: "none" }} />
      <div style={{ fontSize: 11, fontFamily: sans, fontWeight: 600, letterSpacing: 1.2, textTransform: "uppercase", color: P.textLt, marginBottom: 10 }}>{icon} {label}</div>
      <div style={{ fontFamily: serif, fontSize: 38, fontWeight: 400, color, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontFamily: sans, fontSize: 12, color: P.textMd, marginTop: 8 }}>{sub}</div>}
    </div>
  );
}

function DonutChart({ data, size = 150 }) {
  const total = data.reduce((a, d) => a + d.value, 0);
  if (total === 0) return <div style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center", color: P.textLt, fontFamily: sans, fontSize: 12 }}>No data</div>;
  const r = (size - 20) / 2, cx = size / 2, cy = size / 2, circ = 2 * Math.PI * r;
  let cum = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {data.filter(d => d.value > 0).map((d, i) => { const pct = d.value / total; const dash = pct * circ; const off = -cum * circ; cum += pct; return <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={d.color} strokeWidth={18} opacity={0.9} strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={off} style={{ transition: "all 0.6s ease", transform: "rotate(-90deg)", transformOrigin: "center" }} />; })}
      <text x={cx} y={cy - 6} textAnchor="middle" fill={P.text} fontFamily={serif} fontSize="24" fontWeight="400">{total}</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill={P.textLt} fontFamily={sans} fontSize="9" fontWeight="600" letterSpacing="1.5">TOTAL</text>
    </svg>
  );
}

function PipelineFunnel({ statusCounts }) {
  const maxVal = Math.max(...STATUS_OPTIONS.map(s => statusCounts[s] || 0), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {STATUS_OPTIONS.map((s) => { const count = statusCounts[s] || 0; const sc = SC[s]; const pct = (count / maxVal) * 100; return (
        <div key={s} style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontFamily: sans, fontSize: 11, fontWeight: 600, color: P.textMd, width: 90, textAlign: "right", textTransform: "uppercase", letterSpacing: 0.5 }}>{s}</span>
          <div style={{ flex: 1, height: 24, borderRadius: 8, background: P.bg3, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.max(pct, count > 0 ? 4 : 0)}%`, borderRadius: 8, background: sc.fill, transition: "width 0.6s cubic-bezier(.4,0,.2,1)", display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 8 }}>
              {count > 0 && <span style={{ fontFamily: sans, fontSize: 11, fontWeight: 700, color: P.white }}>{count}</span>}
            </div>
          </div>
        </div>
      ); })}
    </div>
  );
}

/* ══════════ MAIN ══════════ */
export default function NetworkingTracker() {
  const [contacts, setContacts] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState("contacts");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...emptyContact });
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [sortField, setSortField] = useState("");
  const [sortDir, setSortDir] = useState("desc");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [toast, setToast] = useState(null);
  const formRef = useRef(null);
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeName, setResumeName] = useState("");
  const [resumeDate, setResumeDate] = useState("");
  const resumeInputRef = useRef(null);
  const [showPreview, setShowPreview] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  // Load resume metadata from Firestore
  useEffect(() => {
    const unsub = onSnapshot(settingsDoc, (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setResumeName(d.name || "");
        setResumeDate(d.date || "");
        setResumeFile(d.data || null);
      }
    }, (err) => console.error("Resume load error:", err));
    return () => unsub();
  }, []);

  // Real-time sync of contacts from Firestore
  useEffect(() => {
    const unsub = onSnapshot(contactsCol, (snap) => {
      const items = snap.docs.map(d => ({ ...emptyContact, ...d.data(), id: d.id, responded: d.data().responded === true }));
      setContacts(items);
      setLoaded(true);
    }, (err) => { console.error("Contacts load error:", err); setLoaded(true); });
    return () => unsub();
  }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2400); };
  const openAdd = () => { setEditing(null); setForm({ ...emptyContact, id: uid() }); setShowForm(true); setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth" }), 100); };
  const openEdit = (c) => { setEditing(c.id); setForm({ ...emptyContact, ...c, responded: c.responded === true }); setShowForm(true); setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth" }), 100); };
  const generateEmailTemplate = (contact) => {
    return `Hi ${contact.firstName},\n\nI hope you are doing well. My name is Rohit Modi. I am a Senior at The University of Texas at Dallas (fall 2026), pursuing a B.S. in Finance and Accounting. I am interested in learning more about an ${contact.profession || "[contact role]"} role at ${contact.company || "[Company Name]"} in ${contact.city || "(City the Analyst Works)"}. I would love to hear about your time in the (Specific Group of Analyst).\n\nIf your time permits, would you be willing to call and talk about your experience within the role? I appreciate any time and advice you have to offer.\n\nAttached is my resume for reference.`;
  };

  const openGmailDraft = (contact) => {
    const body = generateEmailTemplate(contact);
    const subject = `UT Dallas Senior - Interested in ${contact.company || "[Company]"} IB`;
    const to = contact.email || "";
    const url = `https://mail.google.com/mail/u/2/?view=cm&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(url, "_blank");
  };

  const copyLinkedInMessage = (contact) => {
    const msg = `Hi ${contact.firstName},\n\nI'm a current senior at UT Dallas (fall '26), interested in learning more about ${contact.profession || "[contact role]"} at ${contact.company || "[Company]"} in ${contact.city || "(city analyst lives in)"}. I would love to hear about your time in the (group of analyst) Group.\n\nWould you be open to a brief call? I appreciate any time and advice you have to offer.`;
    navigator.clipboard.writeText(msg).then(() => {
      setCopiedId(contact.id);
      showToast("LinkedIn message copied!");
      setTimeout(() => setCopiedId(null), 2000);
    }).catch(() => showToast("Could not copy."));
  };

  const saveContact = async () => {
    try {
      if (!form.firstName.trim() || !form.lastName.trim()) { showToast("First and last name are required."); return; }
      const id = editing || form.id || uid();
      const safeForm = { ...emptyContact, ...form, id };
      await setDoc(doc(contactsCol, id), safeForm);
      showToast(editing ? "Contact updated." : "Contact added.");
      setShowForm(false); setEditing(null); setForm({ ...emptyContact });
    } catch (err) { console.error("Save error:", err); showToast("Error saving contact."); }
  };
  const deleteContact = async (id) => {
    try { await deleteDoc(doc(contactsCol, id)); setDeleteConfirm(null); showToast("Contact removed."); }
    catch (err) { console.error("Delete error:", err); showToast("Could not delete."); }
  };

  const handleResumeUpload = (file) => {
    if (!file) return;
    const maxSize = 900 * 1024; // Firestore field cap is 1MB; keep headroom
    if (file.size > maxSize) { showToast("File too large. Max ~900KB for cloud sync."); return; }
    const reader = new FileReader();
    reader.onload = async () => {
      const data = reader.result;
      const now = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      try {
        await setDoc(settingsDoc, { name: file.name, date: now, data });
        showToast("Resume uploaded!");
      } catch (err) { console.error(err); showToast("Could not save resume."); }
    };
    reader.readAsDataURL(file);
  };

  const exportToExcel = () => {
    if (contacts.length === 0) { showToast("No contacts to export."); return; }
    import("xlsx").then((XLSX) => {
      const headers = ["First Name","Last Name","Profession","Email","Company","LinkedIn","Phone","City","Last Contacted","Responded","Status","Notes"];
      const rows = contacts.map(c => [c.firstName, c.lastName, c.profession, c.email, c.company, c.linkedin, c.phone || "", c.city || "", c.lastContacted, c.responded ? "Yes" : "No", c.status, c.notes]);
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Contacts");
      XLSX.writeFile(wb, "networking-contacts.xlsx");
      showToast("Exported to Excel!");
    }).catch(() => showToast("Export failed — run: npm install xlsx"));
  };

  const importInputRef = useRef(null);
  const importFromExcel = (file) => {
    if (!file) return;
    if (contacts.length > 0) {
      const ok = window.confirm(`This will replace all ${contacts.length} existing contact${contacts.length === 1 ? "" : "s"}. Continue?`);
      if (!ok) return;
    }
    import("xlsx").then((XLSX) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const wb = XLSX.read(data, { type: "array" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
          if (rows.length < 2) { showToast("File has no data."); return; }
          const headers = rows[0].map(h => String(h).toLowerCase().trim());
          const keyMap = { "first name": "firstName", "firstname": "firstName", "last name": "lastName", "lastname": "lastName", "profession": "profession", "role": "profession", "email": "email", "company": "company", "linkedin": "linkedin", "linkedin url": "linkedin", "phone": "phone", "phone number": "phone", "city": "city", "last contacted": "lastContacted", "lastcontacted": "lastContacted", "responded": "responded", "replied": "responded", "status": "status", "notes": "notes" };

          // Delete all existing contacts
          await Promise.all(contacts.map(c => deleteDoc(doc(contactsCol, c.id))));

          let added = 0;
          for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.every(v => !v)) continue;
            const obj = { ...emptyContact };
            headers.forEach((h, idx) => {
              const key = keyMap[h];
              if (!key) return;
              let val = row[idx];
              if (key === "responded") val = String(val).toLowerCase() === "yes" || val === true || String(val).toLowerCase() === "true";
              obj[key] = val ?? "";
            });
            if (!obj.firstName?.toString().trim() && !obj.lastName?.toString().trim()) continue;
            const id = uid();
            obj.id = id;
            await setDoc(doc(contactsCol, id), obj);
            added++;
          }
          showToast(`Replaced with ${added} contact${added === 1 ? "" : "s"}!`);
        } catch (err) { console.error("Import error:", err); showToast("Could not read file."); }
      };
      reader.readAsArrayBuffer(file);
    }).catch(() => showToast("Import failed — run: npm install xlsx"));
  };

  const filtered = contacts.filter((c) => { if (filterStatus !== "All" && c.status !== filterStatus) return false; if (!search) return true; const q = search.toLowerCase(); return c.firstName.toLowerCase().includes(q) || c.lastName.toLowerCase().includes(q) || c.company.toLowerCase().includes(q) || c.profession.toLowerCase().includes(q) || c.email.toLowerCase().includes(q); }).sort((a, b) => { if (!sortField) return 0; if (sortField === "lastContacted") { const da = a.lastContacted ? new Date(a.lastContacted).getTime() : 0; const db = b.lastContacted ? new Date(b.lastContacted).getTime() : 0; return sortDir === "asc" ? da - db : db - da; } const va = (a[sortField] || "").toLowerCase(); const vb = (b[sortField] || "").toLowerCase(); return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va); });
  if (!sortField) filtered.reverse();
  const statusCounts = STATUS_OPTIONS.reduce((acc, s) => { acc[s] = contacts.filter((c) => c.status === s).length; return acc; }, {});
  const toggleSort = (f) => { if (sortField === f) setSortDir((d) => (d === "asc" ? "desc" : "asc")); else { setSortField(f); setSortDir("asc"); } };
  const SortIcon = ({ field }) => (<span style={{ opacity: sortField === field ? 1 : 0.25, marginLeft: 4, fontSize: 10, color: P.forest }}>{sortField === field && sortDir === "desc" ? "▼" : "▲"}</span>);

  const analytics = useMemo(() => {
    const total = contacts.length;
    const reachedOut = contacts.filter(c => c.lastContacted).length;
    const responded = contacts.filter(c => c.responded).length;
    const noResponse = reachedOut - responded;
    const responseRate = reachedOut > 0 ? Math.round((responded / reachedOut) * 100) : 0;
    const neverContacted = total - reachedOut;
    const staleCount = contacts.filter(c => { const d = daysSince(c.lastContacted); return d !== null && d > 180; }).length;
    const avgDays = (() => { const arr = contacts.map(c => daysSince(c.lastContacted)).filter(d => d !== null); return arr.length === 0 ? 0 : Math.round(arr.reduce((a, b) => a + b, 0) / arr.length); })();
    const companyMap = {}; contacts.forEach(c => { const co = c.company?.trim() || "Unknown"; if (!companyMap[co]) companyMap[co] = { total: 0, responded: 0 }; companyMap[co].total++; if (c.responded) companyMap[co].responded++; });
    const topCompanies = Object.entries(companyMap).sort((a, b) => b[1].total - a[1].total).slice(0, 8);
    const monthMap = {}; const now = new Date(); for (let i = 5; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; monthMap[key] = { label: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }), outreach: 0, responses: 0 }; }
    contacts.forEach(c => { if (c.lastContacted) { const key = c.lastContacted.slice(0, 7); if (monthMap[key]) { monthMap[key].outreach++; if (c.responded) monthMap[key].responses++; } } });
    return { total, reachedOut, responded, noResponse, responseRate, neverContacted, staleCount, avgDays, topCompanies, monthlyData: Object.values(monthMap) };
  }, [contacts]);

  if (!loaded) return (<div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", background: P.bg }}><div style={{ width: 32, height: 32, border: `3px solid ${P.border}`, borderTop: `3px solid ${P.forest}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} /><p style={{ color: P.textMd, marginTop: 16, fontFamily: sans }}>Loading…</p></div>);

  return (
    <div style={{ fontFamily: sans, background: P.bg, color: P.text, minHeight: "100vh", padding: "0 0 60px" }}>

      {/* ─── Top Bar (UTD green) ─── */}
      <div className="nx-topbar" style={{ background: P.forest, padding: "14px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="nx-logoblock" style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div className="nx-utdbox" style={{ background: "rgba(255,255,255,0.12)", borderRadius: 8, padding: "5px 10px", display: "flex", alignItems: "center" }}>
            <span style={{ fontFamily: sans, fontSize: 15, fontWeight: 800, color: P.orange, letterSpacing: 1 }}>UTD</span>
          </div>
          <div style={{ flex: 1 }}>
            <h1 className="nx-title" style={{ fontFamily: serif, fontSize: 22, fontWeight: 400, color: P.white, margin: 0, letterSpacing: 0.5 }}>Rohit Modi</h1>
            <p className="nx-subtitle" style={{ fontFamily: sans, fontSize: 11, color: "rgba(255,255,255,0.55)", margin: 0, letterSpacing: 0.5 }}>Path to High Finance · University of Texas at Dallas</p>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="nx-count" style={{ fontFamily: serif, fontSize: 32, color: P.orange, lineHeight: 1 }}>{contacts.length}</div>
          <div className="nx-countlabel" style={{ fontFamily: sans, fontSize: 10, fontWeight: 600, letterSpacing: 1.5, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>contacts</div>
        </div>
      </div>

      <div className="nx-content" style={{ padding: "0 32px", maxWidth: 1400, margin: "0 auto" }}>

        {/* ─── Tab Bar ─── */}
        <div style={{ display: "flex", gap: 0, borderBottom: `2px solid ${P.border}`, marginBottom: 24, marginTop: 4 }}>
          {[["contacts","Contacts"],["dashboard","Dashboard"]].map(([key,label]) => (
            <button key={key} className="nx-tabbtn" onClick={() => setActiveTab(key)} style={{
              fontFamily: sans, fontSize: 13, fontWeight: 600, letterSpacing: 0.3, padding: "14px 24px", cursor: "pointer",
              border: "none", borderBottom: activeTab === key ? `2px solid ${P.forest}` : "2px solid transparent",
              color: activeTab === key ? P.forest : P.textLt, background: "transparent", marginBottom: -2,
              transition: "all 0.2s",
            }}>{label}</button>
          ))}
        </div>

        {/* ═══ CONTACTS TAB ═══ */}
        {activeTab === "contacts" && (<>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
            {["All", ...STATUS_OPTIONS].map((x) => {
              const active = filterStatus === x; const sc = SC[x];
              return (<button key={x} className="nx-statuspill" onClick={() => setFilterStatus(x)} style={{
                fontFamily: sans, fontSize: 12, fontWeight: 500, padding: "7px 16px", borderRadius: 20,
                border: `1px solid ${active ? (sc ? sc.dot : P.forest) : P.border}`, cursor: "pointer",
                background: active ? (sc ? sc.bg : P.forest) : P.white,
                color: active ? (sc ? sc.text : P.white) : P.textMd,
                display: "flex", alignItems: "center", gap: 6, transition: "all 0.2s",
              }}>
                {sc && <span style={{ width: 7, height: 7, borderRadius: "50%", background: sc.dot, display: "inline-block" }} />}
                {x}{x === "All" ? ` (${contacts.length})` : ` (${statusCounts[x] || 0})`}
              </button>);
            })}
          </div>

          <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
            <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ position: "absolute", left: 12, top: 11 }}><circle cx="7" cy="7" r="5" stroke={P.textLt} strokeWidth="1.5" /><line x1="11" y1="11" x2="14" y2="14" stroke={P.textLt} strokeWidth="1.5" strokeLinecap="round" /></svg>
              <input className="nx-search" style={{ fontFamily: sans, fontSize: 13, width: "100%", padding: "10px 12px 10px 36px", borderRadius: 10, border: `1px solid ${P.border}`, background: P.white, color: P.text, outline: "none" }} placeholder="Search by name, company, profession…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <button className="nx-addbtn" style={{ fontFamily: sans, fontSize: 13, fontWeight: 600, padding: "10px 22px", borderRadius: 10, border: "none", background: P.forest, color: P.white, cursor: "pointer", display: "flex", alignItems: "center", transition: "all 0.2s" }} onClick={openAdd}><span style={{ fontSize: 18, marginRight: 6 }}>+</span> Add Contact</button>
            <button className="nx-export" style={{ fontFamily: sans, fontSize: 12, padding: "10px 16px", borderRadius: 10, border: `1px solid ${P.border}`, background: P.white, color: P.textMd, cursor: "pointer" }} onClick={exportToExcel}>↓ Export</button>
            <input ref={importInputRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) importFromExcel(f); e.target.value = ""; }} />
            <button className="nx-export" style={{ fontFamily: sans, fontSize: 12, padding: "10px 16px", borderRadius: 10, border: `1px solid ${P.border}`, background: P.white, color: P.textMd, cursor: "pointer" }} onClick={() => importInputRef.current?.click()}>↑ Import</button>
          </div>

          {filtered.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "80px 20px" }}>
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="22" stroke={P.border} strokeWidth="1.5" strokeDasharray="4 4" /><circle cx="24" cy="20" r="6" stroke={P.textLt} strokeWidth="1.5" /><path d="M12 38c0-6.627 5.373-12 12-12s12 5.373 12 12" stroke={P.textLt} strokeWidth="1.5" strokeLinecap="round" /></svg>
              <p style={{ color: P.textMd, marginTop: 16, fontSize: 14 }}>{contacts.length === 0 ? "No contacts yet — add your first one above." : "No contacts match your filters."}</p>
            </div>
          ) : (
            <div className="nx-tablewrap" style={{ overflowX: "auto", borderRadius: 14, border: `1px solid ${P.border}`, background: P.white, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              <table className="nx-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead><tr style={{ background: P.bg2 }}>
                  {[["firstName","First Name"],["lastName","Last Name"],["profession","Profession"],["email","Email"],["company","Company"]].map(([f,l]) => (
                    <th key={f} style={{ fontFamily: sans, fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", color: P.textMd, padding: "14px 14px", textAlign: "left", borderBottom: `1px solid ${P.border}`, cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }} onClick={() => toggleSort(f)}>{l}<SortIcon field={f} /></th>
                  ))}
                  <th style={{ fontFamily: sans, fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", color: P.textMd, padding: "14px", textAlign: "left", borderBottom: `1px solid ${P.border}`, whiteSpace: "nowrap" }}>LinkedIn</th>
                  <th style={{ fontFamily: sans, fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", color: P.textMd, padding: "14px", textAlign: "left", borderBottom: `1px solid ${P.border}`, cursor: "pointer", whiteSpace: "nowrap" }} onClick={() => toggleSort("lastContacted")}>Last Contacted <SortIcon field="lastContacted" /></th>
                  <th style={{ fontFamily: sans, fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", color: P.textMd, padding: "14px", textAlign: "center", borderBottom: `1px solid ${P.border}`, whiteSpace: "nowrap" }}>Replied</th>
                  <th style={{ fontFamily: sans, fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", color: P.textMd, padding: "14px", textAlign: "left", borderBottom: `1px solid ${P.border}`, cursor: "pointer", whiteSpace: "nowrap" }} onClick={() => toggleSort("status")}>Status <SortIcon field="status" /></th>
                  <th style={{ fontFamily: sans, fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", color: P.textMd, padding: "14px", textAlign: "center", borderBottom: `1px solid ${P.border}`, whiteSpace: "nowrap" }}>Actions</th>
                </tr></thead>
                <tbody>
                  {filtered.map((c, i) => {
                    const sc = SC[c.status] || SC.New;
                    const days = daysSince(c.lastContacted);
                    const isStale = days !== null && days > 180;
                    const rowBg = isStale ? "rgba(220,38,38,0.08)" : i % 2 === 0 ? "#ffffff" : "#e2e2e2";
                    const staleBorder = isStale ? { borderLeft: `3px solid ${P.danger}` } : {};
                    const staleTxt = isStale ? { color: "#991b1b" } : {};
                    const tdBase = { padding: "12px 14px", fontFamily: sans, fontSize: 13, color: P.text, whiteSpace: "nowrap", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" };
                    return (
                      <tr key={c.id} style={{ background: rowBg, borderBottom: `1px solid ${P.border}`, ...staleBorder, animation: "fadeIn 0.35s ease both", animationDelay: `${i * 25}ms`, transition: "background 0.15s" }}>
                        <td style={{ ...tdBase, ...staleTxt }}>{c.firstName}</td>
                        <td style={{ ...tdBase, fontWeight: 600, ...staleTxt }}>{c.lastName}</td>
                        <td style={{ ...tdBase, ...staleTxt }}>{c.profession}</td>
                        <td style={{ ...tdBase, ...staleTxt }}>{c.email ? <a href={`mailto:${c.email}`} style={{ color: isStale ? "#991b1b" : P.forest, textDecoration: "none", fontWeight: 500 }}>{c.email}</a> : <span style={{ color: P.textLt }}>—</span>}</td>
                        <td style={{ ...tdBase, ...staleTxt }}>{c.company}</td>
                        <td style={{ ...tdBase, ...staleTxt }}>{c.linkedin ? <a href={c.linkedin.startsWith("http") ? c.linkedin : `https://${c.linkedin}`} target="_blank" rel="noreferrer" style={{ color: isStale ? "#991b1b" : P.forest, textDecoration: "none", fontWeight: 500, fontSize: 12 }}>Profile ↗</a> : <span style={{ color: P.textLt }}>—</span>}</td>
                        <td style={{ ...tdBase, ...staleTxt }}>
                          {c.lastContacted ? (<div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                            <span style={{ fontFamily: sans, fontSize: 13, fontWeight: 700, color: isStale ? P.danger : days <= 30 ? P.success : days <= 90 ? P.warn : P.orange }}>{days}d</span>
                            <span style={{ fontSize: 10, color: isStale ? "#991b1b" : P.textLt }}>{formatDaysAgo(days)}</span>
                          </div>) : <span style={{ color: P.textLt, fontSize: 11 }}>—</span>}
                        </td>
                        <td style={{ ...tdBase, textAlign: "center" }}>
                          <span style={{ fontFamily: sans, fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 10, background: c.responded ? "#eef7e8" : "#fdf0ee", color: c.responded ? P.success : P.danger }}>{c.responded ? "Yes" : "No"}</span>
                        </td>
                        <td style={{ ...tdBase, ...staleTxt }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 10, fontSize: 11, fontWeight: 600, background: isStale ? "#fef2f2" : sc.bg, color: isStale ? P.danger : sc.text }}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: isStale ? P.danger : sc.dot, display: "inline-block" }} />{c.status}{isStale && " ⚠"}
                          </span>
                        </td>
                        <td style={{ ...tdBase, textAlign: "center" }}>
                          {c.email ? (
                            <button style={{ background: "none", border: "none", color: P.forest, cursor: "pointer", fontSize: 13, padding: "4px 6px" }} title="Send email template" onClick={() => openGmailDraft(c)}>✉</button>
                          ) : (
                            <button style={{ background: "none", border: "none", color: copiedId === c.id ? P.success : "#0a66c2", cursor: "pointer", fontSize: 13, padding: "4px 6px" }} title="Copy LinkedIn message" onClick={() => copyLinkedInMessage(c)}>{copiedId === c.id ? "✓" : "in"}</button>
                          )}
                          <button style={{ background: "none", border: "none", color: P.textMd, cursor: "pointer", fontSize: 14, padding: "4px 6px" }} title="Edit" onClick={() => openEdit(c)}>✎</button>
                          {deleteConfirm === c.id ? (<><button style={{ background: "none", border: "none", color: P.danger, cursor: "pointer", fontSize: 14, padding: "4px 6px" }} onClick={() => deleteContact(c.id)}>✓</button><button style={{ background: "none", border: "none", color: P.textMd, cursor: "pointer", fontSize: 14, padding: "4px 6px" }} onClick={() => setDeleteConfirm(null)}>✕</button></>) : (
                            <button style={{ background: "none", border: "none", color: P.textLt, cursor: "pointer", fontSize: 14, padding: "4px 6px" }} title="Delete" onClick={() => setDeleteConfirm(c.id)}>🗑</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>)}

        {/* ═══ DASHBOARD TAB ═══ */}
        {activeTab === "dashboard" && (
          <div>
            {contacts.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "80px 20px" }}>
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none"><rect x="4" y="4" width="40" height="40" rx="8" stroke={P.border} strokeWidth="1.5" strokeDasharray="4 4" /><rect x="10" y="24" width="6" height="14" rx="2" fill={P.border} /><rect x="21" y="16" width="6" height="22" rx="2" fill={P.border} /><rect x="32" y="20" width="6" height="18" rx="2" fill={P.border} /></svg>
                <p style={{ color: P.textMd, marginTop: 16, fontSize: 14 }}>Add contacts to see your analytics.</p>
              </div>
            ) : (<>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 24 }}>
                <StatCard label="Total Contacts" value={analytics.total} color={P.forest} icon="👤" />
                <StatCard label="Reached Out" value={analytics.reachedOut} sub={`${analytics.neverContacted} not yet contacted`} color="#8b5cf6" icon="📤" />
                <StatCard label="Responded" value={analytics.responded} sub={`${analytics.responseRate}% response rate`} color={P.success} icon="💬" />
                <StatCard label="No Response" value={analytics.noResponse} sub={`${analytics.staleCount} stale (6mo+)`} color={P.danger} icon="🔇" />
              </div>

              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 24 }}>
                <div style={cardStyle}>
                  <h3 style={cardTitle}>Response Breakdown</h3>
                  <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
                    <DonutChart size={150} data={[{ value: analytics.responded, color: P.success },{ value: analytics.noResponse, color: P.danger },{ value: analytics.neverContacted, color: P.bg3 }]} />
                    <div style={{ flex: 1, minWidth: 140 }}>
                      {[["Responded", analytics.responded, P.success],["No Response", analytics.noResponse, P.danger],["Not Contacted", analytics.neverContacted, P.textLt]].map(([l,v,c]) => (
                        <div key={l} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                          <span style={{ width: 10, height: 10, borderRadius: "50%", background: c, display: "inline-block" }} />
                          <span style={{ fontFamily: sans, fontSize: 12, color: P.textMd }}>{l}</span>
                          <span style={{ fontFamily: sans, fontSize: 13, fontWeight: 700, color: c, marginLeft: "auto" }}>{v}</span>
                        </div>
                      ))}
                      <div style={{ marginTop: 16, padding: "12px 16px", borderRadius: 12, background: "#f5f9f0", border: "1px solid #c6e4b8" }}>
                        <span style={{ fontFamily: serif, fontSize: 32, fontWeight: 400, color: P.success }}>{analytics.responseRate}%</span>
                        <span style={{ fontFamily: sans, fontSize: 12, color: P.textMd, marginLeft: 8 }}>response rate</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ ...cardStyle, flex: "1 1 320px" }}>
                  <h3 style={cardTitle}>Pipeline Funnel</h3>
                  <PipelineFunnel statusCounts={statusCounts} />
                </div>
              </div>

              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 24 }}>
                <div style={{ ...cardStyle, flex: "1 1 360px" }}>
                  <h3 style={cardTitle}>Outreach Timeline (6 Months)</h3>
                  {(() => { const maxO = Math.max(...analytics.monthlyData.map(m => m.outreach), 1); const chartH = 140; return (<div>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: chartH }}>
                      {analytics.monthlyData.map((m, i) => (
                        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                          <span style={{ fontFamily: sans, fontSize: 10, fontWeight: 700, color: m.outreach > 0 ? "#8b5cf6" : P.textLt }}>{m.outreach || ""}</span>
                          <div style={{ width: "65%", display: "flex", flexDirection: "column", gap: 2 }}>
                            <div style={{ height: `${(m.outreach / maxO) * (chartH - 40)}px`, background: "linear-gradient(180deg, #8b5cf6, #6d28d9)", borderRadius: "6px 6px 2px 2px", transition: "height 0.5s ease", minHeight: m.outreach > 0 ? 4 : 0 }} />
                            <div style={{ height: `${(m.responses / maxO) * (chartH - 40)}px`, background: `linear-gradient(180deg, ${P.success}, #15803d)`, borderRadius: "2px 2px 6px 6px", transition: "height 0.5s ease", minHeight: m.responses > 0 ? 4 : 0 }} />
                          </div>
                          <span style={{ fontFamily: sans, fontSize: 10, fontWeight: 500, color: P.textLt, marginTop: 2 }}>{m.label}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 16, marginTop: 14 }}>
                      {[["Outreach","#8b5cf6"],["Responses",P.success]].map(([l,c]) => (<div key={l} style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: c, display: "inline-block" }} /><span style={{ fontFamily: sans, fontSize: 11, color: P.textMd }}>{l}</span></div>))}
                    </div>
                  </div>); })()}
                </div>
                <div style={{ ...cardStyle, flex: "1 1 300px" }}>
                  <h3 style={cardTitle}>Top Companies</h3>
                  {analytics.topCompanies.length === 0 ? <p style={{ color: P.textLt, fontSize: 13 }}>No data yet.</p> :
                    analytics.topCompanies.map(([name, data], i) => (
                      <HBar key={name} label={name} value={data.total} max={analytics.topCompanies[0]?.[1]?.total || 1} color={[P.forest,"#8b5cf6",P.success,P.warn,P.orange,"#ec4899","#0891b2","#6366f1"][i % 8]} suffix={data.responded > 0 ? ` (${data.responded} replied)` : ""} />
                    ))
                  }
                </div>
              </div>

              <div style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontFamily: sans, fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", color: P.textLt, marginBottom: 8 }}>⏱ Avg Days Since Last Contact</div>
                  <span style={{ fontFamily: serif, fontSize: 44, fontWeight: 400, color: analytics.avgDays > 180 ? P.danger : analytics.avgDays > 90 ? P.warn : P.success }}>{analytics.avgDays}</span>
                  <span style={{ fontFamily: sans, fontSize: 14, color: P.textMd, marginLeft: 8 }}>days</span>
                </div>
                <div style={{ flex: 1, minWidth: 200, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {[["< 30d",contacts.filter(c => { const d = daysSince(c.lastContacted); return d !== null && d <= 30; }).length,P.success,"#f5f9f0","#c6e4b8"],
                    ["30–90d",contacts.filter(c => { const d = daysSince(c.lastContacted); return d !== null && d > 30 && d <= 90; }).length,P.warn,"#fdf8eb","#f5e6b0"],
                    ["90–180d",contacts.filter(c => { const d = daysSince(c.lastContacted); return d !== null && d > 90 && d <= 180; }).length,P.orange,"#fdf4ea","#f5dbb8"],
                    ["> 180d",contacts.filter(c => { const d = daysSince(c.lastContacted); return d !== null && d > 180; }).length,P.danger,"#fdf0ee","#f5c8c0"],
                  ].map(([label,count,color,bg,border]) => (
                    <div key={label} style={{ padding: "10px 16px", borderRadius: 12, background: bg, border: `1px solid ${border}`, minWidth: 90 }}>
                      <div style={{ fontFamily: serif, fontSize: 24, fontWeight: 400, color }}>{count}</div>
                      <div style={{ fontFamily: sans, fontSize: 10, fontWeight: 500, color: P.textMd }}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>)}
          </div>
        )}

      </div>

      {/* ─── Form Modal ─── */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }} onClick={() => setShowForm(false)}>
          <div ref={formRef} style={{ background: "#bc9e82", border: `1px solid ${P.border}`, borderRadius: 18, padding: "32px 28px", maxWidth: 600, width: "100%", animation: "fadeIn 0.3s ease", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.12)" }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontFamily: serif, fontSize: 22, fontWeight: 400, color: P.forest, margin: "0 0 24px" }}>{editing ? "Edit Contact" : "New Contact"}</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 14px" }}>
              {[["firstName","First Name *","text","Jane"],["lastName","Last Name *","text","Doe"],["profession","Profession","text","Investment Analyst"],["email","Email","email","jane.doe@firm.com"],["company","Company","text","Goldman Sachs"],["linkedin","LinkedIn URL","url","linkedin.com/in/janedoe"],["phone","Phone (optional)","tel","(555) 123-4567"]].map(([k,l,t,p]) => (
                <label key={k} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <span style={{ fontFamily: sans, fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", color: P.textMd }}>{l}</span>
                  <input type={t} style={{ fontFamily: sans, fontSize: 13, padding: "10px 12px", borderRadius: 10, border: `1px solid ${P.border}`, background: P.bg, color: P.text, outline: "none", width: "100%" }} placeholder={p} value={form[k]} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} />
                </label>
              ))}
              <label style={{ display: "flex", flexDirection: "column", gap: 5 }}><span style={{ fontFamily: sans, fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", color: P.textMd }}>Last Contacted</span><input type="date" style={{ fontFamily: sans, fontSize: 13, padding: "10px 12px", borderRadius: 10, border: `1px solid ${P.border}`, background: P.bg, color: P.text, outline: "none", width: "100%" }} value={form.lastContacted} onChange={(e) => setForm((f) => ({ ...f, lastContacted: e.target.value }))} /></label>
              <label style={{ display: "flex", flexDirection: "column", gap: 5 }}><span style={{ fontFamily: sans, fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", color: P.textMd }}>Status</span><select style={{ fontFamily: sans, fontSize: 13, padding: "10px 12px", borderRadius: 10, border: `1px solid ${P.border}`, background: P.bg, color: P.text, outline: "none", width: "100%" }} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>{STATUS_OPTIONS.map((x) => <option key={x} value={x}>{x}</option>)}</select></label>
              <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <span style={{ fontFamily: sans, fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", color: P.textMd }}>City</span>
                {(() => {
                  const isOther = form.city && !CITY_OPTIONS.slice(0,-1).includes(form.city);
                  const dropdownVal = isOther ? "Other" : (form.city || "");
                  return (<>
                    <select style={{ fontFamily: sans, fontSize: 13, padding: "10px 12px", borderRadius: 10, border: `1px solid ${P.border}`, background: P.bg, color: P.text, outline: "none", width: "100%" }} value={dropdownVal} onChange={(e) => {
                      const v = e.target.value;
                      if (v === "Other") setForm((f) => ({ ...f, city: f.city && !CITY_OPTIONS.slice(0,-1).includes(f.city) ? f.city : " " }));
                      else if (v === "") setForm((f) => ({ ...f, city: "" }));
                      else setForm((f) => ({ ...f, city: v }));
                    }}>
                      <option value="">— Select —</option>
                      {CITY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    {dropdownVal === "Other" && (
                      <input type="text" placeholder="Enter city" style={{ fontFamily: sans, fontSize: 13, padding: "10px 12px", borderRadius: 10, border: `1px solid ${P.border}`, background: P.bg, color: P.text, outline: "none", width: "100%", marginTop: 6 }} value={form.city.trim() ? form.city : ""} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value || " " }))} />
                    )}
                  </>);
                })()}
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 5, gridColumn: "1 / -1" }}>
                <span style={{ fontFamily: sans, fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", color: P.textMd }}>Responded?</span>
                <div style={{ display: "flex", gap: 10, marginTop: 2 }}>
                  {[true, false].map((val) => (
                    <button key={String(val)} type="button" onClick={() => setForm((f) => ({ ...f, responded: val }))} style={{
                      fontFamily: sans, fontSize: 12, fontWeight: 600, padding: "8px 20px", borderRadius: 10, cursor: "pointer",
                      border: form.responded === val ? "none" : `1px solid ${P.border}`,
                      background: form.responded === val ? (val ? "#dcfce7" : "#fef2f2") : P.white,
                      color: form.responded === val ? (val ? P.success : P.danger) : P.textMd,
                    }}>{val ? "Yes ✓" : "No ✕"}</button>
                  ))}
                </div>
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 5, gridColumn: "1 / -1" }}><span style={{ fontFamily: sans, fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", color: P.textMd }}>Notes</span><textarea style={{ fontFamily: sans, fontSize: 13, padding: "10px 12px", borderRadius: 10, border: `1px solid ${P.border}`, background: P.bg, color: P.text, outline: "none", width: "100%", minHeight: 60, resize: "vertical" }} placeholder="Met at JPM conference, interested in PE roles…" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></label>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 }}>
              <button style={{ fontFamily: sans, fontSize: 13, padding: "10px 18px", borderRadius: 10, border: `1px solid ${P.border}`, background: P.white, color: P.textMd, cursor: "pointer" }} onClick={() => setShowForm(false)}>Cancel</button>
              <button style={{ fontFamily: sans, fontSize: 13, fontWeight: 600, padding: "10px 22px", borderRadius: 10, border: "none", background: P.forest, color: P.white, cursor: "pointer" }} onClick={saveContact}>{editing ? "Update Contact" : "Save Contact"}</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", fontFamily: sans, fontSize: 13, fontWeight: 600, padding: "10px 24px", borderRadius: 12, background: P.forest, color: P.white, zIndex: 2000, animation: "fadeIn 0.3s ease", boxShadow: "0 4px 20px rgba(21,71,52,0.25)" }}>{toast}</div>}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800&family=DM+Serif+Display&display=swap');
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
        @keyframes spin { to { transform:rotate(360deg) } }
        * { box-sizing:border-box; margin:0; padding:0 }
        html, body, #root { width:100%; min-height:100vh; margin:0; padding:0; background:${P.bg} }
        ::-webkit-scrollbar { width:6px; height:6px }
        ::-webkit-scrollbar-track { background:${P.bg} }
        ::-webkit-scrollbar-thumb { background:${P.border}; border-radius:3px }

        /* Mobile responsive */
        @media (max-width: 640px) {
          .nx-topbar { padding: 12px 16px !important; flex-direction: column !important; align-items: flex-start !important; gap: 10px; }
          .nx-logoblock { width: 100%; display: flex; justify-content: space-between; align-items: center; }
          .nx-title { font-size: 18px !important; }
          .nx-subtitle { font-size: 10px !important; }
          .nx-utdbox { padding: 4px 8px !important; }
          .nx-utdbox span { font-size: 12px !important; }
          .nx-count { font-size: 24px !important; }
          .nx-countlabel { font-size: 9px !important; }
          .nx-content { padding: 0 14px !important; }
          .nx-tabbtn { padding: 10px 14px !important; font-size: 12px !important; }
          .nx-statuspill { font-size: 11px !important; padding: 6px 12px !important; }
          .nx-search { font-size: 16px !important; }
          .nx-addbtn { font-size: 12px !important; padding: 9px 16px !important; }
          .nx-export { font-size: 11px !important; padding: 9px 12px !important; }
          .nx-tablewrap { border-radius: 10px !important; }
          .nx-table th, .nx-table td { padding: 8px 8px !important; font-size: 11px !important; }
          .nx-table th { font-size: 9px !important; }
          .nx-statustag { font-size: 10px !important; padding: 3px 7px !important; }
          .nx-replytag { font-size: 10px !important; padding: 2px 7px !important; }
        }
      `}</style>
    </div>
  );
}

const cardStyle = { background: P.white, border: `1px solid ${P.border}`, borderRadius: 16, padding: "24px 24px", flex: "1 1 340px", minWidth: 280, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" };
const cardTitle = { fontFamily: sans, fontSize: 12, fontWeight: 600, letterSpacing: 0.8, textTransform: "uppercase", color: P.textLt, margin: "0 0 18px" };
