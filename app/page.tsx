"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import {
  MagnifyingGlass, FunnelSimple, Plus, InstagramLogo, Warning,
  CheckCircle, Circle, ArrowSquareOut, PencilSimple, X, CaretDown,
  Sparkle, ChartBar, ArrowClockwise,
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
  target: { label: "Confirmed target", color: "var(--green)", bg: "var(--green-bg)" },
  qualify: { label: "To qualify", color: "var(--amber)", bg: "var(--amber-bg)" },
  skip: { label: "Skip", color: "var(--red)", bg: "var(--red-bg)" },
};

const OUTREACH_CONFIG = {
  pending: { label: "Pending", color: "var(--text-secondary)", bg: "var(--surface-hover)" },
  contacted: { label: "Contacted", color: "var(--blue)", bg: "var(--blue-bg)" },
  replied: { label: "Replied", color: "var(--purple)", bg: "var(--purple-bg)" },
  call: { label: "Call booked", color: "var(--green)", bg: "var(--green-bg)" },
  closed: { label: "Closed", color: "var(--green)", bg: "var(--green-bg)" },
};

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

const AVATAR_COLORS = [
  { bg: "#E1F5EE", text: "#085041" }, { bg: "#E6F1FB", text: "#0C447C" },
  { bg: "#FAEEDA", text: "#633806" }, { bg: "#EEEDFE", text: "#3C3489" },
  { bg: "#EAF3DE", text: "#27500A" }, { bg: "#FBEAF0", text: "#72243E" },
];

function Avatar({ name, index }: { name: string; index: number }) {
  const c = AVATAR_COLORS[index % AVATAR_COLORS.length];
  return (
    <div style={{ background: c.bg, color: c.text }} className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">
      {initials(name)}
    </div>
  );
}

function Badge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ color, background: bg }}>{label}</span>;
}

function StatCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <p className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--text-muted)" }}>{label}</p>
      <p className="text-3xl font-semibold" style={{ color: "var(--text-primary)" }}>{value}</p>
      {sub && <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{sub}</p>}
    </div>
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

  const fStyle = { border: "1px solid var(--border-strong)", background: "var(--bg)", color: "var(--text-primary)" };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <div style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--text-primary)" }}>
              <Sparkle weight="fill" size={16} color="white" />
            </div>
            <div>
              <h1 className="font-semibold text-base" style={{ color: "var(--text-primary)" }}>Flinza Works</h1>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Fashion accessories · DTC pipeline</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} className="p-2 rounded-lg" style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-muted)" }}>
              <ArrowClockwise size={14} />
            </button>
            <button onClick={openAdd} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium" style={{ background: "var(--text-primary)", color: "white" }}>
              <Plus size={15} weight="bold" />
              Add prospect
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total" value={stats.total} />
          <StatCard label="Targets" value={stats.targets} sub="confirmed" />
          <StatCard label="Active" value={stats.active} sub="in conversation" />
          <StatCard label="Closed" value={stats.closed} sub="clients won" />
        </div>

        <div className="rounded-xl p-4 space-y-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2">
            <ChartBar size={14} style={{ color: "var(--text-muted)" }} />
            <span className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Pipeline</span>
          </div>
          <div className="flex gap-1 h-1.5 rounded-full overflow-hidden">
            {stats.targets > 0 && <div style={{ flex: stats.targets, background: "var(--green)", borderRadius: 9999 }} />}
            {stats.qualify > 0 && <div style={{ flex: stats.qualify, background: "#f0c070", borderRadius: 9999 }} />}
            {(stats.total - stats.targets - stats.qualify) > 0 && <div style={{ flex: stats.total - stats.targets - stats.qualify, background: "var(--border)", borderRadius: 9999 }} />}
          </div>
          <div className="flex gap-4 text-xs" style={{ color: "var(--text-secondary)" }}>
            <span><span className="font-medium" style={{ color: "var(--green)" }}>{stats.targets}</span> targets</span>
            <span><span className="font-medium" style={{ color: "var(--amber)" }}>{stats.qualify}</span> to qualify</span>
            <span><span className="font-medium" style={{ color: "var(--text-muted)" }}>{stats.total - stats.targets - stats.qualify}</span> skipped</span>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <div className="flex-1 min-w-44 flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <MagnifyingGlass size={14} style={{ color: "var(--text-muted)" }} />
            <input className="flex-1 text-sm bg-transparent" placeholder="Search brands…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ color: "var(--text-primary)", outline: "none" }} />
          </div>
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <FunnelSimple size={13} style={{ color: "var(--text-muted)" }} />
            <select className="text-sm bg-transparent" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as "" | Status)} style={{ color: "var(--text-primary)", outline: "none" }}>
              <option value="">All statuses</option>
              <option value="target">Targets</option>
              <option value="qualify">To qualify</option>
              <option value="skip">Skip</option>
            </select>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <select className="text-sm bg-transparent" value={filterMethod} onChange={(e) => setFilterMethod(e.target.value as "" | Method)} style={{ color: "var(--text-primary)", outline: "none" }}>
              <option value="">All methods</option>
              <option value="dm">DM only</option>
              <option value="email">Email only</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-sm" style={{ color: "var(--text-muted)" }}>Loading prospects…</div>
        ) : (
          <div className="space-y-2">
            {filtered.length === 0 && <div className="text-center py-12 text-sm" style={{ color: "var(--text-muted)" }}>No prospects match your filters.</div>}
            {filtered.map((p, i) => {
              const isOpen = expanded[p.id];
              const sc = STATUS_CONFIG[p.status];
              const oc = OUTREACH_CONFIG[p.outreach];
              return (
                <div key={p.id} className="rounded-xl" style={{ background: "var(--surface)", border: `1px solid ${isOpen ? "var(--border-strong)" : "var(--border)"}` }}>
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
                      <CaretDown size={13} style={{ color: "var(--text-muted)", transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
                    </div>
                  </div>

                  {isOpen && (
                    <div style={{ borderTop: "1px solid var(--border)", padding: "16px" }} className="space-y-4">
                      <div className="flex gap-2 flex-wrap">
                        <Badge label={p.method === "dm" ? "Instagram DM" : "Cold email"} color={p.method === "dm" ? "var(--blue)" : "var(--purple)"} bg={p.method === "dm" ? "var(--blue-bg)" : "var(--purple-bg)"} />
                        <Badge label={oc.label} color={oc.color} bg={oc.bg} />
                      </div>

                      {p.problem ? (
                        <div className="flex gap-2.5 p-3 rounded-lg text-sm" style={{ background: "var(--blue-bg)", borderLeft: "2px solid var(--blue)" }}>
                          <Warning size={14} style={{ color: "var(--blue)", flexShrink: 0, marginTop: 2 }} />
                          <p style={{ color: "var(--text-primary)" }}>{p.problem}</p>
                        </div>
                      ) : (
                        <div className="flex gap-2.5 p-3 rounded-lg text-sm" style={{ background: "var(--surface-hover)", borderLeft: "2px solid var(--border-strong)" }}>
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
                        <select className="text-xs px-2.5 py-1.5 rounded-lg" style={{ border: "1px solid var(--border-strong)", background: "var(--bg)", color: "var(--text-primary)", outline: "none" }} value={p.outreach} onChange={(e) => updateOutreach(p.id, e.target.value as Outreach)}>
                          <option value="pending">Pending</option>
                          <option value="contacted">Contacted</option>
                          <option value="replied">Replied</option>
                          <option value="call">Call booked</option>
                          <option value="closed">Closed</option>
                        </select>
                        <button onClick={() => openEdit(p)} className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg" style={{ border: "1px solid var(--border-strong)", background: "var(--bg)", color: "var(--text-secondary)" }}>
                          <PencilSimple size={12} /> Edit
                        </button>
                        {p.ig && (
                          <a href={`https://instagram.com/${p.ig.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg" style={{ border: "1px solid var(--border-strong)", background: "var(--bg)", color: "var(--text-secondary)" }}>
                            <InstagramLogo size={12} /> Open IG
                          </a>
                        )}
                        {p.status === "target" && p.outreach === "pending" && (
                          <button className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium ml-auto" style={{ background: "var(--text-primary)", color: "white" }}
                            onClick={() => {
                              const msg = `Write a cold Instagram DM for ${p.name}. Their creative problem: ${p.problem || "creative fatigue on Meta ads"}. Short, specific, not salesy. End with a soft yes/no question.`;
                              window.open(`https://claude.ai/new?q=${encodeURIComponent(msg)}`, "_blank");
                            }}>
                            <Sparkle size={12} weight="fill" /> Draft DM <ArrowSquareOut size={11} />
                          </button>
                        )}
                        <button onClick={() => deleteProspect(p.id)} className="flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg" style={{ color: "var(--red)", background: "transparent" }}>
                          <X size={12} /> Remove
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!loading && stats.targets > 0 && stats.active === 0 && stats.closed === 0 && (
          <div className="rounded-xl p-4 flex gap-3" style={{ background: "#faeeda", border: "1px solid #f0c070" }}>
            <Warning size={17} style={{ color: "var(--amber)", flexShrink: 0, marginTop: 1 }} />
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--amber)" }}>No outreach started yet</p>
              <p className="text-xs mt-0.5" style={{ color: "#b36a10" }}>You have {stats.targets} confirmed targets. Goal: 50 conversations this week. Start with Sundelle and Notbranded tonight.</p>
            </div>
          </div>
        )}

        {stats.closed > 0 && (
          <div className="rounded-xl p-4 flex gap-3" style={{ background: "var(--green-bg)", border: "1px solid #9fe1cb" }}>
            <CheckCircle size={17} style={{ color: "var(--green)", flexShrink: 0 }} />
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--green)" }}>{stats.closed} client{stats.closed > 1 ? "s" : ""} closed 🎉</p>
              <p className="text-xs mt-0.5" style={{ color: "#0f6e56" }}>Keep going. First client unlocks the flywheel.</p>
            </div>
          </div>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: "rgba(0,0,0,0.4)" }} onClick={(e) => { if (e.target === e.currentTarget) setModal(false); }}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4 max-h-screen overflow-y-auto" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-base" style={{ color: "var(--text-primary)" }}>{editId ? "Edit prospect" : "Add prospect"}</h2>
              <button onClick={() => setModal(false)}><X size={18} style={{ color: "var(--text-muted)" }} /></button>
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
                    {key === "status" && (<><option value="target">Target</option><option value="qualify">To qualify</option><option value="skip">Skip</option></>)}
                    {key === "method" && (<><option value="dm">DM</option><option value="email">Cold email</option></>)}
                    {key === "outreach" && (<><option value="pending">Pending</option><option value="contacted">Contacted</option><option value="replied">Replied</option><option value="call">Call booked</option><option value="closed">Closed</option></>)}
                  </select>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setModal(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ border: "1px solid var(--border-strong)", color: "var(--text-secondary)", background: "transparent" }}>Cancel</button>
              <button onClick={save} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ background: "var(--text-primary)", color: "white", opacity: saving ? 0.6 : 1 }}>
                {saving ? "Saving…" : editId ? "Save changes" : "Add prospect"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
