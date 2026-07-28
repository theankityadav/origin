"use client";

import { useState, useRef, useEffect } from "react";
import {
  Zap, User, Calendar, Tag, ListChecks, ChevronDown, Layout,
} from "lucide-react";
import { getPRDStatuses, PRDStatus } from "@/components/NewDocModal";
import { useAuthStore } from "@/store/auth.store";
import api from "@/lib/api";

interface PRDMeta {
  prd_status?: string;
  board_id?: string;
  product_owner?: string;
  live_date?: string;
  project_type?: string;
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

export default function PRDMetaPanel({ meta, onChange, readOnly }: Props) {
  const set = (key: keyof PRDMeta, val: string) => onChange({ ...meta, [key]: val });

  const rows: { icon: React.ElementType; label: string; node: React.ReactNode }[] = [
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
      icon: Tag, label: "Project Type",
      node: readOnly
        ? <span className="text-sm" style={{ color: "var(--text)" }}>{meta.project_type || "—"}</span>
        : <ProjectTypePicker value={meta.project_type ?? ""} onChange={v => set("project_type", v)} />,
    },
    {
      icon: ListChecks, label: "Planned Sprint",
      node: readOnly
        ? <span className="text-sm" style={{ color: "var(--text)" }}>{meta.planned_sprint || "—"}</span>
        : <SprintPicker value={meta.planned_sprint ?? ""} onChange={v => set("planned_sprint", v)} />,
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
        {rows.map(({ icon: Icon, label, node }) => (
          <div key={label} className="flex items-center gap-4">
            <div className="flex items-center gap-2 w-36 shrink-0">
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
