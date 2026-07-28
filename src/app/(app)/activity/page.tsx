"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth.store";
import api from "@/lib/api";
import { timeAgo } from "@/lib/utils";
import { useState, useMemo } from "react";
import {
  Activity, FileText, Trash2, Archive, Share2, Edit3,
  User, ChevronDown, Search, X, SlidersHorizontal, Star,
  Lock, Unlock, Eye, Plus,
} from "lucide-react";

/* ── Action metadata ── */
const ACTION_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  created:    { label: "Created",    icon: Plus,     color: "#22c55e" },
  updated:    { label: "Updated",    icon: Edit3,    color: "#5b5ef4" },
  viewed:     { label: "Viewed",     icon: Eye,      color: "#6b7280" },
  deleted:    { label: "Deleted",    icon: Trash2,   color: "#ef4444" },
  archived:   { label: "Archived",   icon: Archive,  color: "#f59e0b" },
  shared:     { label: "Shared",     icon: Share2,   color: "#3b82f6" },
  starred:    { label: "Starred",    icon: Star,     color: "#f59e0b" },
  locked:     { label: "Locked",     icon: Lock,     color: "#8b5cf6" },
  unlocked:   { label: "Unlocked",   icon: Unlock,   color: "#8b5cf6" },
  member_added:   { label: "Member Added",   icon: User, color: "#22c55e" },
  member_removed: { label: "Member Removed", icon: User, color: "#ef4444" },
};

const ACTION_OPTIONS = Object.entries(ACTION_META).map(([value, { label }]) => ({ value, label }));

function getActionMeta(action: string) {
  return ACTION_META[action] ?? { label: action, icon: Activity, color: "#6b7280" };
}

/* ── FilterChip ── */
function FilterChip({ label, active, onClick, color }: { label: string; active: boolean; onClick: () => void; color?: string }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-all"
      style={{
        background: active ? (color ?? "var(--accent)") + "22" : "var(--bg-subtle)",
        color: active ? (color ?? "var(--accent)") : "var(--text-3)",
        border: `1px solid ${active ? (color ?? "var(--accent)") + "55" : "var(--border)"}`,
      }}
    >
      {label}
    </button>
  );
}

/* ── Dropdown ── */
function SelectDropdown({ value, options, onChange, placeholder }: {
  value: string; options: { value: string; label: string }[]; onChange: (v: string) => void; placeholder: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="text-xs px-3 py-1.5 rounded-xl pr-8 appearance-none outline-none"
        style={{
          background: value ? "var(--accent-bg)" : "var(--bg-subtle)",
          border: `1px solid ${value ? "var(--accent)" : "var(--border)"}`,
          color: value ? "var(--accent)" : "var(--text-3)",
        }}
      >
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" style={{ color: "var(--text-3)" }} />
    </div>
  );
}

export default function ActivityPage() {
  const activeCompanyId = useAuthStore(s => s.activeCompanyId);

  /* Filters */
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [filterUser, setFilterUser] = useState("");
  const [filterDoc, setFilterDoc] = useState("");
  const [dateRange, setDateRange] = useState<"today" | "week" | "month" | "">("");

  /* Fetch logs */
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["activity-logs", activeCompanyId],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (activeCompanyId) params.company = activeCompanyId;
      const { data } = await api.get("/activity/", { params });
      return data.results ?? data;
    },
    refetchInterval: 30_000,
  });

  /* Fetch members for user filter */
  const { data: members = [] } = useQuery({
    queryKey: ["members", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data } = await api.get(`/companies/${activeCompanyId}/members/`);
      return data.results ?? data;
    },
    enabled: !!activeCompanyId,
  });

  /* Date boundary */
  const dateBoundary = useMemo(() => {
    const now = new Date();
    if (dateRange === "today") { const d = new Date(now); d.setHours(0, 0, 0, 0); return d; }
    if (dateRange === "week")  { const d = new Date(now); d.setDate(d.getDate() - 7); return d; }
    if (dateRange === "month") { const d = new Date(now); d.setMonth(d.getMonth() - 1); return d; }
    return null;
  }, [dateRange]);

  /* Filtered logs */
  const filtered = useMemo(() => {
    return logs.filter((log: any) => {
      if (filterAction && log.action !== filterAction) return false;
      if (filterUser && String(log.user?.id ?? log.user) !== filterUser) return false;
      if (filterDoc && !log.document_title?.toLowerCase().includes(filterDoc.toLowerCase())) return false;
      if (search) {
        const q = search.toLowerCase();
        const haystack = [log.document_title, log.user?.name, log.action, log.description].join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (dateBoundary && new Date(log.created_at) < dateBoundary) return false;
      return true;
    });
  }, [logs, filterAction, filterUser, filterDoc, search, dateBoundary]);

  const activeFilterCount = [filterAction, filterUser, filterDoc, dateRange, search].filter(Boolean).length;

  const clearAll = () => { setFilterAction(""); setFilterUser(""); setFilterDoc(""); setDateRange(""); setSearch(""); };

  const userOptions = members.map((m: any) => ({ value: String(m.id), label: m.user?.name ?? m.user?.email ?? String(m.id) }));

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: "var(--text)" }}>
            <Activity className="w-5 h-5" style={{ color: "var(--accent)" }} /> Activity Logs
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-3)" }}>
            {filtered.length} {filtered.length === 1 ? "event" : "events"}{activeFilterCount > 0 ? " (filtered)" : ""}
          </p>
        </div>
        {activeFilterCount > 0 && (
          <button onClick={clearAll}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl"
            style={{ background: "var(--bg-subtle)", color: "var(--text-3)", border: "1px solid var(--border)" }}>
            <X className="w-3.5 h-3.5" /> Clear filters ({activeFilterCount})
          </button>
        )}
      </div>

      {/* Filter bar */}
      <div className="panel p-4 space-y-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 shrink-0" style={{ color: "var(--accent)" }} />
          <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>Filters</span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "var(--text-3)" }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search logs…"
            className="w-full text-sm pl-9 pr-4 py-2 rounded-xl outline-none"
            style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-3.5 h-3.5" style={{ color: "var(--text-3)" }} />
            </button>
          )}
        </div>

        {/* Filter chips row */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Date range chips */}
          <span className="text-xs font-medium" style={{ color: "var(--text-3)" }}>Date:</span>
          {(["today", "week", "month"] as const).map(r => (
            <FilterChip key={r} label={{ today: "Today", week: "Last 7 days", month: "Last 30 days" }[r]}
              active={dateRange === r} onClick={() => setDateRange(dateRange === r ? "" : r)} />
          ))}

          <div className="w-px h-4 mx-1" style={{ background: "var(--border)" }} />

          {/* Action filter */}
          <SelectDropdown
            value={filterAction}
            options={ACTION_OPTIONS}
            onChange={setFilterAction}
            placeholder="All actions"
          />

          {/* User filter */}
          {userOptions.length > 0 && (
            <SelectDropdown
              value={filterUser}
              options={userOptions}
              onChange={setFilterUser}
              placeholder="All members"
            />
          )}

          {/* Doc title search */}
          <div className="relative">
            <FileText className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "var(--text-3)" }} />
            <input
              value={filterDoc}
              onChange={e => setFilterDoc(e.target.value)}
              placeholder="Filter by doc…"
              className="text-xs pl-8 pr-3 py-1.5 rounded-xl outline-none w-36"
              style={{
                background: filterDoc ? "var(--accent-bg)" : "var(--bg-subtle)",
                border: `1px solid ${filterDoc ? "var(--accent)" : "var(--border)"}`,
                color: "var(--text)",
              }}
            />
          </div>
        </div>
      </div>

      {/* Log list */}
      <div className="panel overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Activity className="w-10 h-10" style={{ color: "var(--text-3)" }} />
            <p className="text-sm font-medium" style={{ color: "var(--text-2)" }}>No activity found</p>
            <p className="text-xs" style={{ color: "var(--text-3)" }}>
              {activeFilterCount > 0 ? "Try adjusting your filters" : "Activity will appear here once events occur"}
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {filtered.map((log: any, idx: number) => {
              const meta = getActionMeta(log.action);
              const Icon = meta.icon;
              const userName = log.user?.name ?? log.user?.email ?? "System";
              const docTitle = log.document_title ?? log.document?.title ?? log.target ?? "—";
              return (
                <div key={log.id ?? idx}
                  className="flex items-start gap-3 px-5 py-3.5 transition-colors"
                  style={{ background: "transparent" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  {/* Icon */}
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: meta.color + "18" }}>
                    <Icon className="w-4 h-4" style={{ color: meta.color }} />
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* User avatar */}
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                        style={{ background: "var(--accent)" }}>
                        {userName[0]?.toUpperCase() ?? "?"}
                      </span>
                      <span className="text-sm font-medium" style={{ color: "var(--text)" }}>{userName}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded-md font-medium"
                        style={{ background: meta.color + "18", color: meta.color }}>{meta.label}</span>
                      {docTitle !== "—" && (
                        <>
                          <span className="text-xs" style={{ color: "var(--text-3)" }}>on</span>
                          <span className="text-xs font-medium truncate max-w-[200px]" style={{ color: "var(--text-2)" }}>
                            <FileText className="inline w-3 h-3 mr-0.5" style={{ color: "var(--text-3)" }} />
                            {docTitle}
                          </span>
                        </>
                      )}
                    </div>
                    {log.description && (
                      <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-3)" }}>{log.description}</p>
                    )}
                  </div>

                  {/* Time */}
                  <span className="text-[11px] shrink-0 mt-1" style={{ color: "var(--text-3)" }}>
                    {timeAgo(log.created_at)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
