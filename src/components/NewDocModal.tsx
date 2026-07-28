"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth.store";
import { useUIStore } from "@/store/ui.store";
import api from "@/lib/api";
import {
  X, Loader2, Zap, Calendar,
  User, Tag, ListChecks, ChevronDown, Plus, Trash2,
} from "lucide-react";

/* ── Default statuses (overridden by localStorage if admin set them) */
const DEFAULT_STATUSES = [
  { value: "backlog",           label: "Backlog",                 color: "#6b7280", group: "To-do" },
  { value: "dependency",        label: "Dependency on other team", color: "#3b82f6", group: "In progress" },
  { value: "design_grooming",   label: "Design Grooming",          color: "#3b82f6", group: "In progress" },
  { value: "product_grooming",  label: "Product Grooming",         color: "#3b82f6", group: "In progress" },
  { value: "in_dev",            label: "In Dev",                   color: "#3b82f6", group: "In progress" },
  { value: "ready_for_tech",    label: "Ready for Tech",           color: "#f59e0b", group: "In progress" },
  { value: "on_hold",           label: "On Hold",                  color: "#8b5cf6", group: "In progress" },
  { value: "done",              label: "Done",                     color: "#22c55e", group: "Complete" },
  { value: "canceled",          label: "Canceled",                 color: "#ef4444", group: "Complete" },
];

export type PRDStatus = { value: string; label: string; color: string; group: string };

export function getPRDStatuses(): PRDStatus[] {
  try {
    const stored = localStorage.getItem("prd_statuses");
    if (stored) return JSON.parse(stored);
  } catch { /* */ }
  return DEFAULT_STATUSES;
}

export function savePRDStatuses(statuses: PRDStatus[]) {
  localStorage.setItem("prd_statuses", JSON.stringify(statuses));
}

/* Exported for dashboard to use */
export const PRD_STATUSES = DEFAULT_STATUSES;

interface Props {
  open: boolean;
  onClose: () => void;
  defaultStatus?: string;
}

function StatusPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [statuses, setStatuses] = useState<PRDStatus[]>(DEFAULT_STATUSES);

  useEffect(() => { setStatuses(getPRDStatuses()); }, [open]);

  const current = statuses.find(s => s.value === value) ?? statuses[0];
  const groups = Array.from(new Set(statuses.map(s => s.group)));

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm"
        style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}>
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
        {value ? (
          <span className="px-2 py-0.5 rounded-md text-xs font-medium text-white"
            style={{ background: "#b45309" }}>{value}</span>
        ) : <span>Select type…</span>}
        <ChevronDown className="w-3.5 h-3.5 ml-1" style={{ color: "var(--text-3)" }} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 rounded-xl shadow-xl py-2 w-48"
          style={{ background: "var(--bg-panel)", border: "1px solid var(--border-strong)" }}>
          {types.length === 0 ? (
            <p className="px-3 py-2 text-xs" style={{ color: "var(--text-3)" }}>No project types yet. Add in sidebar.</p>
          ) : types.map(t => (
            <button key={t} type="button"
              onClick={() => { onChange(t === value ? "" : t); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left"
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

/* ── ProductOwnerPicker ── */
interface Member { id: string | number; user: { id: string | number; name: string; email: string }; }

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

/* ── Sprint picker (from localStorage) ── */
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

  const FIELD_STYLE: React.CSSProperties = {
    background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)",
    borderRadius: 8, padding: "6px 10px", fontSize: 13, outline: "none", flex: 1,
  };

  if (sprints.length === 0) {
    return (
      <input value={value} onChange={e => onChange(e.target.value)}
        placeholder="e.g. Mar-1" style={{ ...FIELD_STYLE, width: "100%" }} />
    );
  }

  return (
    <div ref={ref} className="relative flex items-center gap-2">
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
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left"
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

/* Inner modal — mounted fresh on every open, so initial state is always correct */
function NewDocModalInner({ onClose, defaultStatus }: Omit<Props, "open">) {
  const router = useRouter();
  const qc = useQueryClient();
  const activeCompanyId = useAuthStore((s) => s.activeCompanyId);
  const user = useAuthStore((s) => s.user);

  const initStatus = defaultStatus ?? getPRDStatuses()[0]?.value ?? "backlog";

  const [title, setTitle] = useState("New project");
  const [status, setStatus] = useState(initStatus);
  const [productOwner, setProductOwner] = useState(user?.name ?? "");
  const [liveDate, setLiveDate] = useState("");
  const [projectType, setProjectType] = useState("");
  const [plannedSprint, setPlannedSprint] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleCreate = async () => {
    setSaving(true);
    try {
      const prdMeta = { prd_status: status, product_owner: productOwner, live_date: liveDate, project_type: projectType, planned_sprint: plannedSprint };
      const { data } = await api.post("/documents/", {
        title: title || "Untitled",
        content: { type: "doc", content: [], attrs: { prdMeta } },
        visibility: "private",
        ...(activeCompanyId ? { company: activeCompanyId } : {}),
      });
      qc.invalidateQueries({ queryKey: ["documents"] });
      onClose();
      router.push(`/documents/${data.id}`);
    } catch {
      setSaving(false);
    }
  };

  const FIELD_STYLE: React.CSSProperties = {
    background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)",
    borderRadius: 8, padding: "6px 10px", fontSize: 13, outline: "none", width: "100%",
  };

  const rows: { icon: any; label: string; node: React.ReactNode }[] = [
    { icon: Zap,        label: "Status",         node: <StatusPicker value={status} onChange={setStatus} /> },
    { icon: User,       label: "Product Owner",   node: <ProductOwnerPicker value={productOwner} onChange={setProductOwner} /> },
    { icon: Calendar,   label: "Live",            node: <input type="date" value={liveDate} onChange={e => setLiveDate(e.target.value)} style={FIELD_STYLE} /> },
    { icon: Tag,        label: "Project Type",    node: <ProjectTypePicker value={projectType} onChange={setProjectType} /> },
    { icon: ListChecks, label: "Planned Sprint",  node: <SprintPicker value={plannedSprint} onChange={setPlannedSprint} /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: "var(--bg-panel)", border: "1px solid var(--border-strong)" }}>

        <div className="flex items-center gap-3 px-6 pt-5 pb-2">
          <div className="flex-1" />
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: "var(--text-3)" }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 pb-4">
          <input
            autoFocus
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleCreate(); }}
            className="w-full text-3xl font-bold bg-transparent outline-none border-l-2 pl-2"
            style={{ color: "var(--text)", borderColor: "var(--accent)" }}
            placeholder="New project"
          />
        </div>

        <div className="px-6 pb-4 space-y-2.5">
          {rows.map(({ icon: Icon, label, node }) => (
            <div key={label} className="flex items-center gap-4">
              <div className="flex items-center gap-2 w-36 shrink-0">
                <Icon className="w-4 h-4 shrink-0" style={{ color: "var(--text-3)" }} />
                <span className="text-sm" style={{ color: "var(--text-2)" }}>{label}</span>
              </div>
              <div className="flex-1 min-w-0">{node}</div>
            </div>
          ))}
        </div>

        <div className="px-6 pb-5 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-xl"
            style={{ background: "var(--bg-subtle)", color: "var(--text-2)" }}>
            Cancel
          </button>
          <button onClick={handleCreate} disabled={saving}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-xl text-white disabled:opacity-60"
            style={{ background: "var(--accent)" }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Create Document
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NewDocModal({ open, onClose, defaultStatus }: Props) {
  const storeStatus = useUIStore((s) => s.newDocStatus);
  if (!open) return null;
  return <NewDocModalInner onClose={onClose} defaultStatus={storeStatus ?? defaultStatus} />;
}
