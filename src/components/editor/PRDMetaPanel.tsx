"use client";

import { useState, useRef, useEffect } from "react";
import {
  Zap, User, Calendar, Tag, ListChecks, ChevronDown, Layout,
  AlignLeft, Target, AlertCircle, Users, Monitor, Layers, BookOpen,
} from "lucide-react";
import { getPRDStatuses, PRDStatus } from "@/components/NewDocModal";
import { useAuthStore } from "@/store/auth.store";
import api from "@/lib/api";

interface PRDMeta {
  prd_status?: string;
  board_id?: string;
  description?: string;
  product_owner?: string;
  live_date?: string;
  primary_metric?: string;
  priority?: string;
  requested_by?: string;
  platforms?: string[];
  project_type?: string;
  impacts?: string[];
  summary?: string;
  planned_sprint?: string;
}

interface BoardItem { id: string; name: string; }

function loadBoards(): BoardItem[] {
  try {
    const s = localStorage.getItem("dashboard_boards");
    if (s) return JSON.parse(s);
  } catch { /* */ }
  return [{ id: "1", name: "Projects Board" }];
}

/* ── BoardPicker ── */
function BoardPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [boards, setBoards] = useState<BoardItem[]>([]);

  useEffect(() => { setBoards(loadBoards()); }, [open]);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const current = boards.find(b => b.id === value);

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm w-full text-left"
        style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: current ? "var(--text)" : "var(--text-3)" }}
      >
        <Layout className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--text-3)" }} />
        <span className="flex-1 truncate">{current?.name ?? "Select board…"}</span>
        <ChevronDown className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--text-3)" }} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 rounded-xl shadow-xl py-1 w-56"
          style={{ background: "var(--bg-panel)", border: "1px solid var(--border-strong)" }}>
          {boards.map(b => (
            <button key={b.id} type="button"
              onClick={() => { onChange(b.id); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors"
              style={{ background: value === b.id ? "var(--accent-bg)" : "transparent", color: value === b.id ? "var(--accent)" : "var(--text)" }}
              onMouseEnter={e => { if (value !== b.id) e.currentTarget.style.background = "var(--bg-hover)"; }}
              onMouseLeave={e => { if (value !== b.id) e.currentTarget.style.background = "transparent"; }}
            >
              <Layout className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--text-3)" }} />
              {b.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface Member {
  id: string | number;
  user: { id: string | number; name: string; email: string };
}

interface Props {
  meta: PRDMeta;
  onChange: (updated: PRDMeta) => void;
  readOnly?: boolean;
}

/* ── reusable inline StatusPicker ── */
function StatusPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [statuses, setStatuses] = useState<PRDStatus[]>([]);

  useEffect(() => { setStatuses(getPRDStatuses()); }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const current = statuses.find(s => s.value === value) ?? statuses[0];
  const groups = Array.from(new Set(statuses.map(s => s.group)));

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors"
        style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
      >
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: current?.color ?? "#6b7280" }} />
        <span>{current?.label ?? "Select…"}</span>
        <ChevronDown className="w-3.5 h-3.5 ml-1" style={{ color: "var(--text-3)" }} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 rounded-xl shadow-xl py-2 w-64"
          style={{ background: "var(--bg-panel)", border: "1px solid var(--border-strong)" }}>
          {groups.map(group => (
            <div key={group}>
              <p className="px-3 pt-2 pb-1 text-xs font-semibold" style={{ color: "var(--text-3)" }}>{group}</p>
              {statuses.filter(s => s.group === group).map(s => (
                <button key={s.value} type="button"
                  onClick={() => { onChange(s.value); setOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors"
                  style={{
                    background: value === s.value ? "var(--accent-bg)" : "transparent",
                    color: value === s.value ? "var(--accent)" : "var(--text)",
                  }}
                  onMouseEnter={e => { if (value !== s.value) e.currentTarget.style.background = "var(--bg-hover)"; }}
                  onMouseLeave={e => { if (value !== s.value) e.currentTarget.style.background = "transparent"; }}
                >
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                  {s.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── ProductOwnerPicker ── */
function ProductOwnerPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const activeCompanyId = useAuthStore(s => s.activeCompanyId);

  useEffect(() => {
    if (!activeCompanyId) return;
    api.get(`/companies/${activeCompanyId}/members/`)
      .then(({ data }) => setMembers(data.results ?? data))
      .catch(() => {});
  }, [activeCompanyId]);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const selected = members.find(m => m.user?.name === value || m.user?.email === value);
  const displayLabel = selected?.user?.name ?? value ?? "";

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm w-full text-left"
        style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: displayLabel ? "var(--text)" : "var(--text-3)" }}
      >
        <User className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--text-3)" }} />
        <span className="flex-1 truncate">{displayLabel || "Select owner…"}</span>
        <ChevronDown className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--text-3)" }} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 rounded-xl shadow-xl py-1 w-56"
          style={{ background: "var(--bg-panel)", border: "1px solid var(--border-strong)" }}>
          {members.length === 0
            ? <p className="px-3 py-2 text-xs" style={{ color: "var(--text-3)" }}>No members found.</p>
            : members.map(m => (
              <button key={m.id} type="button"
                onClick={() => { onChange(m.user?.name ?? ""); setOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors"
                style={{ background: value === m.user?.name ? "var(--accent-bg)" : "transparent", color: value === m.user?.name ? "var(--accent)" : "var(--text)" }}
                onMouseEnter={e => { if (value !== m.user?.name) e.currentTarget.style.background = "var(--bg-hover)"; }}
                onMouseLeave={e => { if (value !== m.user?.name) e.currentTarget.style.background = "transparent"; }}
              >
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 text-white"
                  style={{ background: "var(--accent)" }}>
                  {m.user?.name?.[0]?.toUpperCase() ?? "?"}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{m.user?.name}</p>
                  <p className="text-[10px] truncate" style={{ color: "var(--text-3)" }}>{m.user?.email}</p>
                </div>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

/* ── reusable ProjectTypePicker ── */
function ProjectTypePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [types, setTypes] = useState<string[]>([]);

  useEffect(() => {
    try { setTypes(JSON.parse(localStorage.getItem("prd_project_types") || "[]")); } catch { setTypes([]); }
  }, [open]);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm"
        style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: value ? "var(--text)" : "var(--text-3)" }}>
        {value
          ? <span className="px-2 py-0.5 rounded-md text-xs font-medium text-white" style={{ background: "#b45309" }}>{value}</span>
          : <span>Select type…</span>}
        <ChevronDown className="w-3.5 h-3.5 ml-1" style={{ color: "var(--text-3)" }} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 rounded-xl shadow-xl py-2 w-48"
          style={{ background: "var(--bg-panel)", border: "1px solid var(--border-strong)" }}>
          {types.length === 0
            ? <p className="px-3 py-2 text-xs" style={{ color: "var(--text-3)" }}>No types yet. Add in settings.</p>
            : types.map(t => (
              <button key={t} type="button"
                onClick={() => { onChange(t === value ? "" : t); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors"
                style={{ background: value === t ? "var(--accent-bg)" : "transparent", color: "var(--text)" }}
                onMouseEnter={e => { if (value !== t) e.currentTarget.style.background = "var(--bg-hover)"; }}
                onMouseLeave={e => { if (value !== t) e.currentTarget.style.background = "transparent"; }}
              >
                <span className="w-2 h-2 rounded-full" style={{ background: "#b45309" }} />
                {t}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

/* ── SprintPicker ── */
function SprintPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [sprints, setSprints] = useState<string[]>([]);

  useEffect(() => {
    try { setSprints(JSON.parse(localStorage.getItem("prd_sprints") || "[]")); } catch { setSprints([]); }
  }, [open]);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const FIELD: React.CSSProperties = {
    background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)",
    borderRadius: 8, padding: "6px 10px", fontSize: 13, outline: "none", width: "100%",
  };

  if (sprints.length === 0) {
    return <input value={value} onChange={e => onChange(e.target.value)} placeholder="e.g. Mar-1" style={FIELD} />;
  }

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm"
        style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: value ? "var(--text)" : "var(--text-3)" }}>
        <span>{value || "Select sprint…"}</span>
        <ChevronDown className="w-3.5 h-3.5" style={{ color: "var(--text-3)" }} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 rounded-xl shadow-xl py-2 w-44"
          style={{ background: "var(--bg-panel)", border: "1px solid var(--border-strong)" }}>
          {sprints.map(s => (
            <button key={s} type="button"
              onClick={() => { onChange(s === value ? "" : s); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors"
              style={{ background: value === s ? "var(--accent-bg)" : "transparent", color: "var(--text)" }}
              onMouseEnter={e => { if (value !== s) e.currentTarget.style.background = "var(--bg-hover)"; }}
              onMouseLeave={e => { if (value !== s) e.currentTarget.style.background = "transparent"; }}
            >
              <ListChecks className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--text-3)" }} />
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const FIELD: React.CSSProperties = {
  background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)",
  borderRadius: 8, padding: "6px 10px", fontSize: 13, outline: "none", width: "100%",
};

const PRIORITIES = [
  { value: "critical", label: "Critical", color: "#ef4444" },
  { value: "high",     label: "High",     color: "#f97316" },
  { value: "medium",   label: "Medium",   color: "#f59e0b" },
  { value: "low",      label: "Low",      color: "#22c55e" },
];

function PriorityPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const current = PRIORITIES.find(p => p.value === value);
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm"
        style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: value ? "var(--text)" : "var(--text-3)" }}>
        {current
          ? <span className="px-2 py-0.5 rounded-md text-xs font-semibold text-white" style={{ background: current.color }}>{current.label}</span>
          : <span>Select priority…</span>}
        <ChevronDown className="w-3.5 h-3.5 ml-1" style={{ color: "var(--text-3)" }} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 rounded-xl shadow-xl py-2 w-44"
          style={{ background: "var(--bg-panel)", border: "1px solid var(--border-strong)" }}>
          {PRIORITIES.map(p => (
            <button key={p.value} type="button"
              onClick={() => { onChange(p.value === value ? "" : p.value); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left"
              style={{ background: value === p.value ? "var(--accent-bg)" : "transparent", color: "var(--text)" }}
              onMouseEnter={e => { if (value !== p.value) e.currentTarget.style.background = "var(--bg-hover)"; }}
              onMouseLeave={e => { if (value !== p.value) e.currentTarget.style.background = "transparent"; }}>
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
              {p.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MultiTagPicker({ storageKey, value, onChange, placeholder }: {
  storageKey: string; value: string[]; onChange: (v: string[]) => void; placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [options, setOptions] = useState<string[]>([]);
  useEffect(() => {
    try { setOptions(JSON.parse(localStorage.getItem(storageKey) || "[]")); } catch { setOptions([]); }
  }, [open, storageKey]);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const toggle = (t: string) => onChange(value.includes(t) ? value.filter(x => x !== t) : [...value, t]);
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm min-w-[160px] text-left flex-wrap"
        style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}>
        {value.length === 0
          ? <span style={{ color: "var(--text-3)" }}>{placeholder ?? "Select…"}</span>
          : value.map(t => (
            <span key={t} className="px-2 py-0.5 rounded-md text-xs font-medium text-white mr-1"
              style={{ background: "var(--accent)" }}>{t}</span>
          ))}
        <ChevronDown className="w-3.5 h-3.5 ml-auto shrink-0" style={{ color: "var(--text-3)" }} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 rounded-xl shadow-xl py-2 w-52"
          style={{ background: "var(--bg-panel)", border: "1px solid var(--border-strong)" }}>
          {options.length === 0
            ? <p className="px-3 py-2 text-xs" style={{ color: "var(--text-3)" }}>No options yet. Add in sidebar.</p>
            : options.map(t => (
              <button key={t} type="button" onClick={() => toggle(t)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left"
                style={{ background: value.includes(t) ? "var(--accent-bg)" : "transparent", color: "var(--text)" }}
                onMouseEnter={e => { if (!value.includes(t)) e.currentTarget.style.background = "var(--bg-hover)"; }}
                onMouseLeave={e => { if (!value.includes(t)) e.currentTarget.style.background = "transparent"; }}>
                <span className="w-4 h-4 rounded flex items-center justify-center border shrink-0"
                  style={{ borderColor: value.includes(t) ? "var(--accent)" : "var(--border)", background: value.includes(t) ? "var(--accent)" : "transparent" }}>
                  {value.includes(t) && <span className="text-white text-[10px]">✓</span>}
                </span>
                {t}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

export default function PRDMetaPanel({ meta, onChange, readOnly }: Props) {
  const set = (key: keyof PRDMeta, val: any) => onChange({ ...meta, [key]: val });

  const TEXTAREA: React.CSSProperties = {
    ...FIELD, resize: "vertical", minHeight: 60, fontFamily: "inherit",
  };

  const platforms = Array.isArray(meta.platforms) ? meta.platforms : [];
  const impacts = Array.isArray(meta.impacts) ? meta.impacts : [];
  const priority = PRIORITIES.find(p => p.value === meta.priority);

  const rows: { icon: React.ElementType; label: string; node: React.ReactNode; tall?: boolean }[] = [
    {
      icon: Zap, label: "Status",
      node: readOnly
        ? (() => { const statuses = getPRDStatuses(); const s = statuses.find(x => x.value === (meta.prd_status ?? "backlog")); return (
            <span className="flex items-center gap-2 text-sm" style={{ color: "var(--text)" }}>
              <span className="w-2 h-2 rounded-full" style={{ background: s?.color ?? "#6b7280" }} />
              {s?.label ?? meta.prd_status ?? "Backlog"}
            </span>
          ); })()
        : <StatusPicker value={meta.prd_status ?? "backlog"} onChange={v => set("prd_status", v)} />,
    },
    {
      icon: AlignLeft, label: "Description", tall: true,
      node: readOnly
        ? <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--text)" }}>{meta.description || "—"}</p>
        : <textarea value={meta.description ?? ""} onChange={e => set("description", e.target.value)}
            placeholder="What is this project about?" style={TEXTAREA} />,
    },
    {
      icon: User, label: "Product Owner",
      node: readOnly
        ? <span className="text-sm" style={{ color: "var(--text)" }}>{meta.product_owner || "—"}</span>
        : <ProductOwnerPicker value={meta.product_owner ?? ""} onChange={v => set("product_owner", v)} />,
    },
    {
      icon: Calendar, label: "Live Date",
      node: readOnly
        ? <span className="text-sm" style={{ color: "var(--text)" }}>{meta.live_date || "—"}</span>
        : <input type="date" value={meta.live_date ?? ""} onChange={e => set("live_date", e.target.value)} style={FIELD} />,
    },
    {
      icon: Target, label: "Primary Metric",
      node: readOnly
        ? <span className="text-sm" style={{ color: "var(--text)" }}>{meta.primary_metric || "—"}</span>
        : <input type="text" value={meta.primary_metric ?? ""} onChange={e => set("primary_metric", e.target.value)}
            placeholder="e.g. user experience" style={FIELD} />,
    },
    {
      icon: AlertCircle, label: "Priority",
      node: readOnly
        ? <span className="text-sm px-2 py-0.5 rounded-md text-xs font-semibold text-white"
            style={{ background: priority?.color ?? "var(--bg-subtle)", color: priority ? "#fff" : "var(--text-3)" }}>
            {priority?.label || "—"}
          </span>
        : <PriorityPicker value={meta.priority ?? ""} onChange={v => set("priority", v)} />,
    },
    {
      icon: Users, label: "Requested By",
      node: readOnly
        ? <span className="text-sm" style={{ color: "var(--text)" }}>{meta.requested_by || "—"}</span>
        : <input type="text" value={meta.requested_by ?? ""} onChange={e => set("requested_by", e.target.value)}
            placeholder="e.g. Operations Team" style={FIELD} />,
    },
    {
      icon: Monitor, label: "Platforms",
      node: readOnly
        ? <div className="flex flex-wrap gap-1">{platforms.length ? platforms.map(t => (
            <span key={t} className="px-2 py-0.5 rounded-md text-xs font-medium text-white" style={{ background: "#0ea5e9" }}>{t}</span>
          )) : <span className="text-sm" style={{ color: "var(--text-3)" }}>—</span>}</div>
        : <MultiTagPicker storageKey="prd_platforms" value={platforms} onChange={v => set("platforms", v)} placeholder="Select platforms…" />,
    },
    {
      icon: Tag, label: "Project Type",
      node: readOnly
        ? <span className="text-sm" style={{ color: "var(--text)" }}>{meta.project_type || "—"}</span>
        : <ProjectTypePicker value={meta.project_type ?? ""} onChange={v => set("project_type", v)} />,
    },
    {
      icon: Layers, label: "Impacts",
      node: readOnly
        ? <div className="flex flex-wrap gap-1">{impacts.length ? impacts.map(t => (
            <span key={t} className="px-2 py-0.5 rounded-md text-xs font-medium text-white" style={{ background: "#8b5cf6" }}>{t}</span>
          )) : <span className="text-sm" style={{ color: "var(--text-3)" }}>—</span>}</div>
        : <MultiTagPicker storageKey="prd_impacts" value={impacts} onChange={v => set("impacts", v)} placeholder="Select impacts…" />,
    },
    {
      icon: ListChecks, label: "Planned Sprint",
      node: readOnly
        ? <span className="text-sm" style={{ color: "var(--text)" }}>{meta.planned_sprint || "—"}</span>
        : <SprintPicker value={meta.planned_sprint ?? ""} onChange={v => set("planned_sprint", v)} />,
    },
    {
      icon: BookOpen, label: "Summary", tall: true,
      node: readOnly
        ? <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--text)" }}>{meta.summary || "—"}</p>
        : <textarea value={meta.summary ?? ""} onChange={e => set("summary", e.target.value)}
            placeholder="Brief summary of the project goal…" style={TEXTAREA} />,
    },
  ];

  return (
    <div
      className="rounded-xl mb-6 overflow-visible"
      style={{ border: "1px solid var(--border)", background: "var(--bg-panel)" }}
    >
      <div className="px-4 py-2.5 border-b flex items-center gap-2" style={{ borderColor: "var(--border)" }}>
        <Zap className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
        <span className="text-xs font-semibold" style={{ color: "var(--text-2)" }}>Project Details</span>
      </div>
      <div className="px-4 py-3 space-y-2.5">
        {rows.map(({ icon: Icon, label, node, tall }) => (
          <div key={label} className={`flex gap-4 ${tall ? "items-start" : "items-center"}`}>
            <div className={`flex items-center gap-2 w-36 shrink-0 ${tall ? "pt-1.5" : ""}`}>
              <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--text-3)" }} />
              <span className="text-sm" style={{ color: "var(--text-2)" }}>{label}</span>
            </div>
            <div className="flex-1 min-w-0">{node}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
