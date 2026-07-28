"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth.store";
import api from "@/lib/api";
import Link from "next/link";
import { timeAgo } from "@/lib/utils";
import {
  FileText, Star, Share2,
  HardDrive, Target, User,
  MoreHorizontal, BarChart2, EyeOff, Trash2, Plus,
} from "lucide-react";
import { getPRDStatuses } from "@/components/NewDocModal";
import { useUIStore } from "@/store/ui.store";
import { useState, useRef, useEffect } from "react";


function StatCard({ icon: Icon, label, value, accent, href }: {
  icon: React.ElementType; label: string; value: string | number; accent: string; href?: string;
}) {
  const inner = (
    <div className="panel p-5 flex items-center gap-4 hover:scale-[1.01] transition-transform">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: accent + "22" }}>
        <Icon className="w-5 h-5" style={{ color: accent }} />
      </div>
      <div>
        <p className="text-2xl font-bold" style={{ color: "var(--text)" }}>{value}</p>
        <p className="text-xs" style={{ color: "var(--text-3)" }}>{label}</p>
      </div>
    </div>
  );
  return href ? <Link href={href} style={{ textDecoration: "none" }}>{inner}</Link> : inner;
}

function KanbanCard({ doc, statusColor }: { doc: any; statusColor: string }) {
  const meta = doc.content?.attrs?.prdMeta ?? {};
  return (
    <Link
      href={`/documents/${doc.id}`}
      className="block rounded-xl p-3 space-y-2 transition-all hover:scale-[1.01]"
      style={{ background: "var(--bg)", border: "1px solid var(--border)", textDecoration: "none" }}
    >
      <div className="flex items-start gap-2">
        <FileText className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "var(--text-3)" }} />
        <p className="text-xs font-semibold leading-snug" style={{ color: "var(--text)" }}>{doc.title || "Untitled"}</p>
      </div>
      {meta.project_type && (
        <span className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-md"
          style={{ background: "#b4530922", color: "#b45309" }}>{meta.project_type}</span>
      )}
      {meta.product_owner && (
        <div className="flex items-center gap-1">
          <User className="w-3 h-3" style={{ color: "var(--text-3)" }} />
          <span className="text-[10px] truncate" style={{ color: "var(--text-3)" }}>{meta.product_owner}</span>
        </div>
      )}
      <div className="flex items-center gap-1.5 pt-0.5">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: statusColor }} />
        <span className="text-[10px]" style={{ color: "var(--text-3)" }}>{timeAgo(doc.updated_at)}</span>
      </div>
    </Link>
  );
}

/* ── Kanban board ── */
function KanbanBoard({ prdDocs }: { prdDocs: any[] }) {
  const { setNewDocOpen } = useUIStore();
  const qc = useQueryClient();
  const liveStatuses = getPRDStatuses();

  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set());
  const [aggCols, setAggCols] = useState<Set<string>>(new Set());
  const [colMenu, setColMenu] = useState<string | null>(null);
  const colMenuRef = useRef<HTMLDivElement>(null);
  const draggingId = useRef<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [statusOverrides, setStatusOverrides] = useState<Record<string, string>>({});

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (colMenuRef.current && !colMenuRef.current.contains(e.target as Node)) setColMenu(null);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const getDocStatus = (doc: any) =>
    statusOverrides[doc.id] ?? doc.content?.attrs?.prdMeta?.prd_status ?? "backlog";

  const handleDragStart = (docId: string) => { draggingId.current = docId; };

  const handleDrop = async (targetStatus: string) => {
    const docId = draggingId.current;
    if (!docId) return;
    draggingId.current = null;
    setDragOverCol(null);
    /* Optimistic update */
    setStatusOverrides(prev => ({ ...prev, [docId]: targetStatus }));
    try {
      /* Always GET fresh doc from API to ensure we patch against the real stored content */
      const { data: latestDoc } = await api.get(`/documents/${docId}/`);
      const content = latestDoc.content ?? { type: "doc", content: [] };
      const prdMeta = { ...(content?.attrs?.prdMeta ?? {}), prd_status: targetStatus };
      const newContent = { ...content, attrs: { ...(content.attrs ?? {}), prdMeta } };
      await api.patch(`/documents/${docId}/`, { content: newContent });
      await qc.invalidateQueries({ queryKey: ["documents", "prd-all"] });
    } catch (e) {
      console.error("[handleDrop] failed", e);
      /* Revert optimistic update on failure */
      setStatusOverrides(prev => { const n = { ...prev }; delete n[docId]; return n; });
    }
  };

  const trashColumn = async (statusValue: string, docs: any[]) => {
    setColMenu(null);
    await Promise.all(docs.map(d => api.post(`/documents/${d.id}/archive/`).catch(() => {})));
    qc.invalidateQueries({ queryKey: ["documents", "prd-all"] });
  };

  return (
    <div>
      <div className="flex gap-3 overflow-x-auto pb-3" style={{ minHeight: 200 }}>
        {liveStatuses.map(s => {
          if (hiddenCols.has(s.value)) return null;
          const colDocs = prdDocs.filter((doc: any) => getDocStatus(doc) === s.value);
          const isOver = dragOverCol === s.value;
          return (
            <div key={s.value}
              className="flex-none w-56 flex flex-col gap-2 rounded-xl p-2 transition-colors"
              style={{
                background: isOver ? s.color + "18" : "var(--bg-panel)",
                border: isOver ? `2px solid ${s.color}` : "1px solid var(--border)",
                minHeight: 480,
              }}
              onDragOver={e => { e.preventDefault(); setDragOverCol(s.value); }}
              onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverCol(null); }}
              onDrop={e => { e.preventDefault(); handleDrop(s.value); }}
            >
              {/* Column header */}
              <div className="flex items-center justify-between px-1 py-0.5">
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                  <span className="text-xs font-semibold truncate" style={{ color: "var(--text)" }}>{s.label}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                    style={{ background: s.color + "22", color: s.color }}>{colDocs.length}</span>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <div className="relative">
                    <button onClick={() => setColMenu(colMenu === s.value ? null : s.value)}
                      className="p-1 rounded-lg" style={{ color: "var(--text-3)" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      <MoreHorizontal className="w-3.5 h-3.5" />
                    </button>
                    {colMenu === s.value && (
                      <div ref={colMenuRef} className="absolute right-0 top-full mt-1 w-44 rounded-xl py-1 z-50"
                        style={{ background: "var(--bg-panel)", border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)" }}>
                        <button onClick={() => { setAggCols(prev => { const n = new Set(prev); n.has(s.value) ? n.delete(s.value) : n.add(s.value); return n; }); setColMenu(null); }}
                          className="flex items-center gap-2 px-3 py-2 text-sm w-full" style={{ color: "var(--text-2)" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                          <BarChart2 className="w-4 h-4" />{aggCols.has(s.value) ? "Hide aggregation" : "Show aggregation"}
                        </button>
                        <button onClick={() => { setHiddenCols(prev => { const n = new Set(prev); n.add(s.value); return n; }); setColMenu(null); }}
                          className="flex items-center gap-2 px-3 py-2 text-sm w-full" style={{ color: "var(--text-2)" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                          <EyeOff className="w-4 h-4" /> Hide group
                        </button>
                        <div className="my-1" style={{ borderTop: "1px solid var(--border)" }} />
                        <button onClick={() => trashColumn(s.value, colDocs)}
                          className="flex items-center gap-2 px-3 py-2 text-sm w-full" style={{ color: "var(--danger)" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "rgba(239,68,68,0.08)")}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                          <Trash2 className="w-4 h-4" /> Move to Trash
                        </button>
                      </div>
                    )}
                  </div>
                  <button onClick={() => setNewDocOpen(true, s.value)}
                    className="p-1 rounded-lg" style={{ color: "var(--text-3)" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")} title="Add project">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {aggCols.has(s.value) && (
                <div className="flex items-center gap-2 px-1 py-1 rounded-lg"
                  style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}>
                  <BarChart2 className="w-3 h-3" style={{ color: "var(--text-3)" }} />
                  <span className="text-[10px]" style={{ color: "var(--text-3)" }}>Count</span>
                  <span className="ml-auto text-[10px] font-bold" style={{ color: s.color }}>{colDocs.length}</span>
                </div>
              )}

              <div className="flex flex-col gap-2 flex-1">
                {colDocs.map((doc: any) => (
                  <div key={doc.id} draggable
                    onDragStart={() => handleDragStart(doc.id)}
                    onDragEnd={() => { draggingId.current = null; setDragOverCol(null); }}
                    style={{ cursor: "grab", opacity: draggingId.current === doc.id ? 0.4 : 1 }}>
                    <KanbanCard doc={doc} statusColor={s.color} />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {hiddenCols.size > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          <span className="text-xs" style={{ color: "var(--text-3)" }}>Hidden:</span>
          {liveStatuses.filter(s => hiddenCols.has(s.value)).map(s => (
            <button key={s.value}
              onClick={() => setHiddenCols(prev => { const n = new Set(prev); n.delete(s.value); return n; })}
              className="flex items-center gap-1.5 text-[10px] font-medium px-2 py-1 rounded-full"
              style={{ background: s.color + "22", color: s.color, border: `1px solid ${s.color}44` }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
              {s.label} · show
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const activeCompanyId = useAuthStore((s) => s.activeCompanyId);

  const params = activeCompanyId ? { company: activeCompanyId } : {};

  const qc = useQueryClient();

  /* Force-refetch on mount and visibility change */
  useEffect(() => {
    qc.invalidateQueries({ queryKey: ["documents", "prd-all"] });
  }, [qc]);

  useEffect(() => {
    const refetch = () => { if (document.visibilityState === "visible") qc.invalidateQueries({ queryKey: ["documents", "prd-all"] }); };
    document.addEventListener("visibilitychange", refetch);
    return () => document.removeEventListener("visibilitychange", refetch);
  }, [qc]);

  const { data: starred } = useQuery({
    queryKey: ["documents", "starred", activeCompanyId],
    queryFn: async () => { const { data } = await api.get("/documents/starred/", { params }); return data.results ?? data; },
  });

  const { data: sharedDocs } = useQuery({
    queryKey: ["documents", "shared-count", activeCompanyId],
    queryFn: async () => {
      const [teamRes, allRes] = await Promise.all([
        api.get("/documents/", { params: { ...params, visibility: "company" } }),
        api.get("/documents/", { params }),
      ]);
      const teamDocs: any[] = (teamRes.data.results ?? teamRes.data).filter((d: any) => d.owner?.id !== user?.id);
      const directDocs: any[] = (allRes.data.results ?? allRes.data).filter(
        (d: any) => d.owner?.id !== user?.id && d.visibility === "private"
      );
      return teamDocs.length + directDocs.length;
    },
    enabled: !!user,
  });

  const { data: prdDocs } = useQuery({
    queryKey: ["documents", "prd-all", activeCompanyId],
    queryFn: async () => { const { data } = await api.get("/documents/", { params }); return (data.results ?? data) as any[]; },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const { setNewDocOpen } = useUIStore();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Hero */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
          {greeting}, {user?.name?.split(" ")[0]} 👋
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-3)" }}>Here&apos;s what&apos;s happening in your workspace</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FileText} label="My Documents" value={prdDocs?.length ?? "—"} accent="#5b5ef4" />
        <StatCard icon={Star} label="Starred" value={starred?.length ?? "—"} accent="#f59e0b" />
        <StatCard icon={Share2} label="Shared with me" value={sharedDocs ?? "—"} accent="#22c55e" href="/shared" />
        <StatCard icon={HardDrive} label="Storage used" value="—" accent="#a855f7" />
      </div>

      {/* Projects Board */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-4 h-4 shrink-0" style={{ color: "var(--accent)" }} />
          <span className="font-semibold text-sm flex-1" style={{ color: "var(--text)" }}>Projects Board</span>
        </div>
        <KanbanBoard prdDocs={prdDocs ?? []} />
      </div>
    </div>
  );
}
