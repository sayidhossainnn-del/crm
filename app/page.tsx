"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "../lib/supabase";
import {
  MagnifyingGlass, FunnelSimple, Plus, InstagramLogo, Warning,
  CheckCircle, Circle, ArrowSquareOut, PencilSimple, X, CaretDown,
  Sparkle, ChartLineUp, ArrowClockwise, TrendUp,
} from "@phosphor-icons/react";

type Status = "target" | "qualify" | "skip";
type Method = "dm" | "email";
type Outreach = "pending" | "contacted" | "replied" | "call" | "closed";

interface Prospect {
  id: number;
  name: string;
  ig: string;
  founder: string;
  email: string;
  ads: number | null;
  problem: string;
  status: Status;
  method: Method;
  outreach: Outreach;
}

const STATUS_CONFIG = {
  target: { label: "Confirmed target", color: "var(--green)", bg: "var(--green-bg)", border: "var(--green-border)" },
  qualify: { label: "To qualify", color: "var(--amber)", bg: "var(--amber-bg)", border: "var(--amber-border)" },
  skip: { label: "Skip", color: "var(--red)", bg: "var(--red-bg)", border: "var(--red-border)" },
};

const OUTREACH_CONFIG = {
  pending: { label: "Pending", color: "var(--text-secondary)", bg: "rgba(255,255,255,0.05)" },
  contacted: { label: "Contacted", color: "var(--blue)", bg: "var(--blue-bg)" },
  replied: { label: "Replied", color: "var(--purple)", bg: "var(--purple-bg)" },
  call: { label: "Call booked", color: "var(--green)", bg: "var(--green-bg)" },
  closed: { label: "Closed", color: "var(--green)", bg: "var(--green-bg)" },
};

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg, #7c8cff, #5a6cff)",
  "linear-gradient(135deg, #b794ff, #9569ff)",
  "linear-gradient(135deg, #4ade9b, #2fc480)",
  "linear-gradient(135deg, #f5b54c, #e89a1e)",
  "linear-gradient(135deg, #6fb8ff, #4a9bff)",
  "linear-gradient(135deg, #ff8aa8, #ff6b8f)",
];

function Avatar({ name, index }: { name: string; index: number }) {
  return (
    <div
      style={{ background: AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length] }}
      className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-semibold text-white flex-shrink-0 shadow-lg"
    >
      {initials(name)}
    </div>
  );
}

function Badge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium" style={{ color, background: bg }}>
      {label}
    </span>
  );
}

function StatCard({ label, value, sub, icon, delay }: { label: string; value: number; sub?: string; icon?: React.ReactNode; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      className="glass rounded-2xl p-5 relative overflow-hidden"
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs uppercase tracking-wider font-medium" style={{ color: "var(--text-muted)" }}>{label}</p>
        {icon}
      </div>
      <p className="text-4xl font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>{value}</p>
      {sub && <p className="text-xs mt-1.5" style={{ color: "var(--text-muted)" }}>{sub}</p>}
    </motion.div>
  );
}

const EMPTY_FORM: Omit<Prospect, "id"> = { name: "", ig: "", founder: "", email: "", ads: null, problem: "", status: "qualify", method: "dm", outreach: "pending" };

export default function CRM() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"" | Status>("");
  const [filterMethod, setFilterMethod] = useState<"" | Method>("");
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<Omit<Prospect, "id">>(EMPTY_FORM);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("prospects").select("*").order("created_at");
    if (data) setProspects(data as Prospect[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return prospects.filter((p) => {
      if (filterStatus && p.status !== filterStatus) return false;
      if (filterMethod && p.method !== filterMethod) return false;
      if (q && !p.name.toLowerCase().includes(q) && !p.ig.toLowerCase().includes(q) && !p.founder.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [prospects, search, filterStatus, filterMethod]);

  const stats = useMemo(() => ({
    total: prospects.length,
    targets: prospects.filter((p) => p.status === "target").length,
    qualify: prospects.filter((p) => p.status === "qualify").length,
    active: prospects.filter((p) => ["contacted", "replied", "call"].includes(p.outreach)).length,
    closed: prospects.filter((p) => p.outreach === "closed").length,
  }), [prospects]);

  function toggle(id: number) { setExpanded((e) => ({ ...e, [id]: !e[id] })); }
  function openAdd() { setEditId(null); setForm(EMPTY_FORM); setModal(true); }
  function openEdit(p: Prospect) {
    setEditId(p.id);
    const { id: _id, ...rest } = p; void _id;
    setForm(rest); setModal(true);
  }

  async function save() {
    if (!form.name.trim()) return;
    setSaving(true);
    if (editId !== null) {
      await supabase.from("prospects").update(form).eq("id", editId);
    } else {
      await supabase.from("prospects").insert(form);
    }
    await load();
    setSaving(false);
    setModal(false);
  }

  async function updateOutreach(id: number, val: Outreach) {
    setProspects((ps) => ps.map((p) => p.id === id ? { ...p, outreach: val } : p));
    await supabase.from("prospects").update({ outreach: val }).eq("id", id);
  }

  async function deleteProspect(id: number) {
    setProspects((ps) => ps.filter((p) => p.id !== id));
    setExpanded((e) => { const n = { ...e }; delete n[id]; return n; });
    await supabase.from("prospects").delete().eq("id", id);
  }

  const fStyle = { border: "1px solid var(--border-strong)", background: "rgba(255,255,255,0.03)", color: "var(--text-primary)" };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-30 glass" style={{ borderLeft: "none", borderRight: "none", borderTop: "none" }}>
        <div className="max-w-4xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center relative"
              style={{ background: "linear-gradient(135deg, var(--accent), #5a6cff)", boxShadow: "0 4px 20px rgba(124,140,255,0.35)" }}
            >
              <Sparkle weight="fill" size={17} color="white" />
            </div>
            <div>
              <h1 className="font-semibold text-[15px] tracking-tight" style={{ color: "var(--text-primary)" }}>Flinza Works</h1>
              <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>Fashion accessories &middot; DTC pipeline</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} className="p-2.5 rounded-xl transition-colors hover:bg-white/5" style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}>
              <ArrowClockwise size={14} />
            </button>
            <button
              onClick={openAdd}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-transform hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: "linear-gradient(135deg, var(--accent), #5a6cff)", color: "white", boxShadow: "0 4px 16px rgba(124,140,255,0.3)" }}
            >
              <Plus size={15} weight="bold" />
              Add prospect
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-5 py-7 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total" value={stats.total} delay={0} icon={<ChartLineUp size={15} style={{ color: "var(--text-muted)" }} />} />
          <StatCard label="Targets" value={stats.targets} sub="confirmed" delay={0.05} icon={<TrendUp size={15} style={{ color: "var(--green)" }} />} />
          <StatCard label="Active" value={stats.active} sub="in conversation" delay={0.1} />
          <StatCard label="Closed" value={stats.closed} sub="clients won" delay={0.15} />
        </div>

        {/* Pipeline bar */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="glass rounded-2xl p-5 space-y-3"
        >
          <div className="flex items-center gap-2">
            <ChartLineUp size={14} style={{ color: "var(--text-muted)" }} />
            <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Pipeline</span>
          </div>
          <div className="flex gap-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
            {stats.targets > 0 && (
              <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                style={{ flex: stats.targets, background: "linear-gradient(90deg, var(--green), #2fc480)", transformOrigin: "left", borderRadius: 9999 }} />
            )}
            {stats.qualify > 0 && (
              <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.7, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
                style={{ flex: stats.qualify, background: "linear-gradient(90deg, var(--amber), #e89a1e)", transformOrigin: "left", borderRadius: 9999 }} />
            )}
            {(stats.total - stats.targets - stats.qualify) > 0 && (
              <div style={{ flex: stats.total - stats.targets - stats.qualify, background: "rgba(255,255,255,0.08)", borderRadius: 9999 }} />
            )}
          </div>
          <div className="flex gap-5 text-xs" style={{ color: "var(--text-secondary)" }}>
            <span><span className="font-semibold" style={{ color: "var(--green)" }}>{stats.targets}</span> targets</span>
            <span><span className="font-semibold" style={{ color: "var(--amber)" }}>{stats.qualify}</span> to qualify</span>
            <span><span className="font-semibold" style={{ color: "var(--text-muted)" }}>{stats.total - stats.targets - stats.qualify}</span> skipped</span>
          </div>
        </motion.div>

        {/* Toolbar */}
        <div className="flex gap-2 flex-wrap">
          <div className="flex-1 min-w-44 flex items-center gap-2 px-3.5 py-2.5 rounded-xl glass">
            <MagnifyingGlass size={14} style={{ color: "var(--text-muted)" }} />
            <input className="flex-1 text-sm bg-transparent" placeholder="Search brands…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ color: "var(--text-primary)", outline: "none" }} />
          </div>
          <div className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl glass">
            <FunnelSimple size={13} style={{ color: "var(--text-muted)" }} />
            <select className="text-sm bg-transparent" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as "" | Status)} style={{ color: "var(--text-primary)", outline: "none" }}>
              <option style={{ background: "#12141c" }} value="">All statuses</option>
              <option style={{ background: "#12141c" }} value="target">Targets</option>
              <option style={{ background: "#12141c" }} value="qualify">To qualify</option>
              <option style={{ background: "#12141c" }} value="skip">Skip</option>
            </select>
          </div>
          <div className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl glass">
            <select className="text-sm bg-transparent" value={filterMethod} onChange={(e) => setFilterMethod(e.target.value as "" | Method)} style={{ color: "var(--text-primary)", outline: "none" }}>
              <option style={{ background: "#12141c" }} value="">All methods</option>
              <option style={{ background: "#12141c" }} value="dm">DM only</option>
              <option style={{ background: "#12141c" }} value="email">Email only</option>
            </select>
          </div>
        </div>

        {/* Prospect list */}
        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="glass rounded-2xl p-4 h-16 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.length === 0 && (
              <div className="text-center py-16 text-sm glass rounded-2xl" style={{ color: "var(--text-muted)" }}>No prospects match your filters.</div>
            )}
            <AnimatePresence>
              {filtered.map((p, i) => {
                const isOpen = expanded[p.id];
                const sc = STATUS_CONFIG[p.status];
                const oc = OUTREACH_CONFIG[p.outreach];
                return (
                  <motion.div
                    key={p.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ duration: 0.3, delay: i * 0.02, ease: [0.16, 1, 0.3, 1] }}
                    className="glass rounded-2xl overflow-hidden"
                    style={{ borderColor: isOpen ? "var(--border-strong)" : "var(--border)" }}
                  >
                    <div className="flex items-center gap-3 p-4 cursor-pointer select-none" onClick={() => toggle(p.id)}>
                      <Avatar name={p.name} index={i} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate" style={{ color: "var(--text-primary)" }}>{p.name}</p>
                        <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>
                          {p.ig || "—"}{p.ads !== null ? ` · ${p.ads} ads` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge label={sc.label} color={sc.color} bg={sc.bg} />
                        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.25 }}>
                          <CaretDown size={13} style={{ color: "var(--text-muted)" }} />
                        </motion.div>
                      </div>
                    </div>

                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                          style={{ overflow: "hidden" }}
                        >
                          <div style={{ borderTop: "1px solid var(--border)", padding: "16px" }} className="space-y-4">
                            <div className="flex gap-2 flex-wrap">
                              <Badge label={p.method === "dm" ? "Instagram DM" : "Cold email"} color={p.method === "dm" ? "var(--blue)" : "var(--purple)"} bg={p.method === "dm" ? "var(--blue-bg)" : "var(--purple-bg)"} />
                              <Badge label={oc.label} color={oc.color} bg={oc.bg} />
                            </div>

                            {p.problem ? (
                              <div className="flex gap-2.5 p-3.5 rounded-xl text-sm" style={{ background: "var(--blue-bg)", borderLeft: "2px solid var(--blue)" }}>
                                <Warning size={14} style={{ color: "var(--blue)", flexShrink: 0, marginTop: 2 }} />
                                <p style={{ color: "var(--text-primary)" }}>{p.problem}</p>
                              </div>
                            ) : (
                              <div className="flex gap-2.5 p-3.5 rounded-xl text-sm" style={{ background: "rgba(255,255,255,0.03)", borderLeft: "2px solid var(--border-strong)" }}>
                                <Circle size={14} style={{ color: "var(--text-muted)", flexShrink: 0, marginTop: 2 }} />
                                <p style={{ color: "var(--text-muted)" }}>No problem spotted yet — check Meta Ad Library first.</p>
                              </div>
                            )}

                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div>
                                <p style={{ color: "var(--text-muted)" }}>Founder</p>
                                <p className="mt-0.5 font-medium" style={{ color: "var(--text-primary)" }}>{p.founder || "Unknown"}</p>
                              </div>
                              <div>
                                <p style={{ color: "var(--text-muted)" }}>Founder email</p>
                                <p className="mt-0.5 font-medium" style={{ color: p.email ? "var(--text-primary)" : "var(--text-muted)" }}>{p.email || "Not found yet"}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap pt-1">
                              <select className="text-xs px-2.5 py-1.5 rounded-lg" style={{ border: "1px solid var(--border-strong)", background: "rgba(255,255,255,0.03)", color: "var(--text-primary)", outline: "none" }} value={p.outreach} onChange={(e) => updateOutreach(p.id, e.target.value as Outreach)}>
                                <option style={{ background: "#12141c" }} value="pending">Pending</option>
                                <option style={{ background: "#12141c" }} value="contacted">Contacted</option>
                                <option style={{ background: "#12141c" }} value="replied">Replied</option>
                                <option style={{ background: "#12141c" }} value="call">Call booked</option>
                                <option style={{ background: "#12141c" }} value="closed">Closed</option>
                              </select>
                              <button onClick={() => openEdit(p)} className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-colors hover:bg-white/5" style={{ border: "1px solid var(--border-strong)", color: "var(--text-secondary)" }}>
                                <PencilSimple size={12} /> Edit
                              </button>
                              {p.ig && (
                                <a href={`https://instagram.com/${p.ig.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-colors hover:bg-white/5" style={{ border: "1px solid var(--border-strong)", color: "var(--text-secondary)" }}>
                                  <InstagramLogo size={12} /> Open IG
                                </a>
                              )}
                              {p.status === "target" && p.outreach === "pending" && (
                                <button
                                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium ml-auto transition-transform hover:scale-[1.03]"
                                  style={{ background: "linear-gradient(135deg, var(--accent), #5a6cff)", color: "white" }}
                                  onClick={() => {
                                    const msg = `Write a cold Instagram DM for ${p.name}. Their creative problem: ${p.problem || "creative fatigue on Meta ads"}. Short, specific, not salesy. End with a soft yes/no question.`;
                                    window.open(`https://claude.ai/new?q=${encodeURIComponent(msg)}`, "_blank");
                                  }}
                                >
                                  <Sparkle size={12} weight="fill" /> Draft DM <ArrowSquareOut size={11} />
                                </button>
                              )}
                              <button onClick={() => deleteProspect(p.id)} className="flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg transition-colors hover:bg-red-500/10" style={{ color: "var(--red)" }}>
                                <X size={12} /> Remove
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {!loading && stats.targets > 0 && stats.active === 0 && stats.closed === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl p-4 flex gap-3" style={{ background: "var(--amber-bg)", border: "1px solid var(--amber-border)" }}>
            <Warning size={17} style={{ color: "var(--amber)", flexShrink: 0, marginTop: 1 }} />
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--amber)" }}>No outreach started yet</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>You have {stats.targets} confirmed targets. Goal: 50 conversations this week. Start with Sundelle and Notbranded tonight.</p>
            </div>
          </motion.div>
        )}

        {stats.closed > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl p-4 flex gap-3" style={{ background: "var(--green-bg)", border: "1px solid var(--green-border)" }}>
            <CheckCircle size={17} style={{ color: "var(--green)", flexShrink: 0 }} />
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--green)" }}>{stats.closed} client{stats.closed > 1 ? "s" : ""} closed</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>Keep going. First client unlocks the flywheel.</p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {modal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
            onClick={(e) => { if (e.target === e.currentTarget) setModal(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-md rounded-2xl p-6 space-y-4 max-h-screen overflow-y-auto glass"
              style={{ background: "#12141c" }}
            >
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-base" style={{ color: "var(--text-primary)" }}>{editId ? "Edit prospect" : "Add prospect"}</h2>
                <button onClick={() => setModal(false)} className="p-1 rounded-lg hover:bg-white/5"><X size={18} style={{ color: "var(--text-muted)" }} /></button>
              </div>
              {(["name", "ig", "founder", "email"] as const).map((key) => (
                <div key={key}>
                  <label className="text-xs mb-1 block" style={{ color: "var(--text-secondary)" }}>
                    {key === "ig" ? "Instagram handle" : key === "name" ? "Brand name *" : key === "founder" ? "Founder name" : "Founder email"}
                  </label>
                  <input className="w-full px-3 py-2 rounded-lg text-sm border" style={fStyle} value={form[key] as string} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} placeholder={key === "name" ? "e.g. Sundelle Jewelry" : key === "ig" ? "@handle" : key === "founder" ? "If known" : "Hunter.io or Apollo"} />
                </div>
              ))}
              <div>
                <label className="text-xs mb-1 block" style={{ color: "var(--text-secondary)" }}>Active ad count</label>
                <input className="w-full px-3 py-2 rounded-lg text-sm border" style={fStyle} type="number" value={form.ads ?? ""} onChange={(e) => setForm((f) => ({ ...f, ads: e.target.value ? parseInt(e.target.value) : null }))} placeholder="From Meta Ad Library" />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: "var(--text-secondary)" }}>Problem spotted</label>
                <textarea className="w-full px-3 py-2 rounded-lg text-sm border resize-none" style={{ ...fStyle, minHeight: 68 }} value={form.problem} onChange={(e) => setForm((f) => ({ ...f, problem: e.target.value }))} placeholder="What's weak about their creative? Be specific." />
              </div>
              <div className="grid grid-cols-3 gap-3">
                {(["status", "method", "outreach"] as const).map((key) => (
                  <div key={key}>
                    <label className="text-xs mb-1 block" style={{ color: "var(--text-secondary)" }}>{key === "status" ? "Status" : key === "method" ? "Method" : "Outreach"}</label>
                    <select className="w-full px-2 py-2 rounded-lg text-sm border" style={fStyle} value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}>
                      {key === "status" && (<><option style={{ background: "#12141c" }} value="target">Target</option><option style={{ background: "#12141c" }} value="qualify">To qualify</option><option style={{ background: "#12141c" }} value="skip">Skip</option></>)}
                      {key === "method" && (<><option style={{ background: "#12141c" }} value="dm">DM</option><option style={{ background: "#12141c" }} value="email">Cold email</option></>)}
                      {key === "outreach" && (<><option style={{ background: "#12141c" }} value="pending">Pending</option><option style={{ background: "#12141c" }} value="contacted">Contacted</option><option style={{ background: "#12141c" }} value="replied">Replied</option><option style={{ background: "#12141c" }} value="call">Call booked</option><option style={{ background: "#12141c" }} value="closed">Closed</option></>)}
                    </select>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setModal(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors hover:bg-white/5" style={{ border: "1px solid var(--border-strong)", color: "var(--text-secondary)" }}>Cancel</button>
                <button onClick={save} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-transform hover:scale-[1.02]" style={{ background: "linear-gradient(135deg, var(--accent), #5a6cff)", color: "white", opacity: saving ? 0.6 : 1 }}>
                  {saving ? "Saving…" : editId ? "Save changes" : "Add prospect"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
