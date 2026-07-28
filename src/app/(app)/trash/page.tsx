"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth.store";
import api from "@/lib/api";
import { timeAgo } from "@/lib/utils";
import { Trash2, RotateCcw, Loader2, Search, X, CheckSquare, Square, ShieldAlert, PenTool, FileText } from "lucide-react";
import toast from "react-hot-toast";
import { useState, useMemo } from "react";

export default function TrashPage() {
  const activeCompanyId = useAuthStore((s) => s.activeCompanyId);
  const currentUser = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: docs, isLoading } = useQuery({
    queryKey: ["documents", "trash", activeCompanyId],
    queryFn: async () => {
      const { data } = await api.get("/documents/trash_list/", {
        params: activeCompanyId ? { company: activeCompanyId } : {},
      });
      return data.results ?? data;
    },
  });

  const { data: members } = useQuery({
    queryKey: ["members", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data } = await api.get(`/companies/${activeCompanyId}/members/`);
      return data.results ?? data;
    },
    enabled: !!activeCompanyId,
  });

  const myRole = members?.find((m: any) => m.user?.id === currentUser?.id)?.role ?? "";
  const isAdmin = ["owner", "admin"].includes(myRole) || !!(currentUser as any)?.is_super_admin;

  const filtered = useMemo(() => {
    if (!docs) return [];
    if (!search.trim()) return docs;
    return docs.filter((d: any) =>
      (d.title || "Untitled").toLowerCase().includes(search.toLowerCase())
    );
  }, [docs, search]);

  const restore = useMutation({
    mutationFn: (id: string) => api.post(`/documents/${id}/restore/`),
    onSuccess: () => {
      toast.success("Document restored");
      qc.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Restore failed"),
  });

  const purge = useMutation({
    mutationFn: (id: string) => api.delete(`/documents/${id}/purge/`),
    onSuccess: () => {
      toast.success("Permanently deleted");
      qc.invalidateQueries({ queryKey: ["documents", "trash"] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Delete failed"),
  });

  const bulkRestore = useMutation({
    mutationFn: () => Promise.all([...selected].map(id => api.post(`/documents/${id}/restore/`))),
    onSuccess: () => {
      toast.success(`${selected.size} document${selected.size > 1 ? "s" : ""} restored`);
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["documents"] });
    },
  });

  const bulkPurge = useMutation({
    mutationFn: () => Promise.all([...selected].map(id => api.delete(`/documents/${id}/purge/`))),
    onSuccess: () => {
      toast.success(`${selected.size} document${selected.size > 1 ? "s" : ""} permanently deleted`);
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["documents", "trash"] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Failed"),
  });

  const toggleOne = (id: string) =>
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const allSelected = filtered.length > 0 && filtered.every((d: any) => selected.has(d.id));
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(filtered.map((d: any) => d.id)));

  const someSelected = selected.size > 0;
  const isPending = restore.isPending || purge.isPending || bulkRestore.isPending || bulkPurge.isPending;

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: "var(--text)" }}>
          <Trash2 className="w-5 h-5" style={{ color: "var(--danger)" }} /> Trash
        </h1>
        <p className="text-xs" style={{ color: "var(--text-3)" }}>Items are permanently deleted after 30 days</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-3)" }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search trash…"
          className="w-full pl-9 pr-9 py-2 text-sm rounded-xl outline-none"
          style={{ background: "var(--bg-panel)", border: "1px solid var(--border)", color: "var(--text)" }}
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-3)" }}>
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Bulk action bar */}
      {someSelected && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl"
          style={{ background: "var(--accent-bg)", border: "1px solid var(--accent)" }}>
          <span className="text-sm font-medium flex-1" style={{ color: "var(--accent)" }}>
            {selected.size} selected
          </span>
          <button onClick={() => bulkRestore.mutate()} disabled={isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-50"
            style={{ background: "var(--bg-subtle)", color: "var(--text-2)" }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
            onMouseLeave={e => (e.currentTarget.style.background = "var(--bg-subtle)")}>
            <RotateCcw className="w-3.5 h-3.5" /> Restore all
          </button>
          {isAdmin && (
            <button
              onClick={() => { if (confirm(`Permanently delete ${selected.size} document(s)? This cannot be undone.`)) bulkPurge.mutate(); }}
              disabled={isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-50"
              style={{ background: "rgba(239,68,68,0.08)", color: "var(--danger)" }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(239,68,68,0.16)")}
              onMouseLeave={e => (e.currentTarget.style.background = "rgba(239,68,68,0.08)")}>
              <Trash2 className="w-3.5 h-3.5" /> Delete forever
            </button>
          )}
          <button onClick={() => setSelected(new Set())} className="p-1.5 rounded-lg" style={{ color: "var(--text-3)" }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="panel overflow-hidden">
        {/* Header row */}
        <div className="flex items-center gap-3 px-4 py-2.5" style={{ borderBottom: "1px solid var(--border)" }}>
          <button onClick={toggleAll} style={{ color: allSelected ? "var(--accent)" : "var(--text-3)" }}>
            {allSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
          </button>
          <span className="text-xs font-medium" style={{ color: "var(--text-3)" }}>
            {filtered.length} item{filtered.length !== 1 ? "s" : ""}{search ? ` matching "${search}"` : " in trash"}
          </span>
          {isAdmin && (
            <span className="ml-auto flex items-center gap-1 text-xs" style={{ color: "var(--danger)" }}>
              <ShieldAlert className="w-3 h-3" /> Admin — permanent delete enabled
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--text-3)" }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Trash2 className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--border-strong)" }} />
            <p className="text-sm" style={{ color: "var(--text-3)" }}>
              {search ? `No results for "${search}"` : "Trash is empty"}
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {filtered.map((doc: any) => {
              const isSel = selected.has(doc.id);
              return (
                <div key={doc.id}
                  className="flex items-center gap-3 px-4 py-3 group transition-colors"
                  style={{ background: isSel ? "var(--accent-bg)" : "transparent" }}
                  onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = "var(--bg-hover)"; }}
                  onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = "transparent"; }}
                >
                  <button onClick={() => toggleOne(doc.id)}
                    className="shrink-0 transition-opacity"
                    style={{ color: isSel ? "var(--accent)" : "var(--text-3)", opacity: isSel ? 1 : 0 }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                    onMouseLeave={e => { if (!isSel) e.currentTarget.style.opacity = "0"; }}>
                    {isSel ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  </button>
                  <span className="shrink-0 opacity-50">
                    {doc.doc_type === "wireframe"
                      ? <PenTool className="w-4 h-4" style={{ color: "var(--accent)" }} />
                      : <FileText className="w-4 h-4" style={{ color: "var(--text-3)" }} />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate line-through" style={{ color: "var(--text-3)" }}>
                        {doc.title || "Untitled"}
                      </p>
                      {doc.doc_type === "wireframe" && (
                        <span className="shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                          style={{ background: "var(--accent-bg)", color: "var(--accent)" }}>
                          Wireframe
                        </span>
                      )}
                    </div>
                    <p className="text-xs" style={{ color: "var(--text-3)" }}>
                      Deleted {timeAgo(doc.deleted_at || doc.updated_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition shrink-0">
                    <button
                      onClick={() => restore.mutate(doc.id)}
                      disabled={isPending}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg transition disabled:opacity-40"
                      style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text-2)" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "var(--bg-subtle)")}>
                      <RotateCcw className="w-3.5 h-3.5" /> Restore
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => { if (confirm(`Permanently delete "${doc.title || "Untitled"}"? This cannot be undone.`)) purge.mutate(doc.id); }}
                        disabled={isPending}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg transition disabled:opacity-40"
                        style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.25)", color: "var(--danger)" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "rgba(239,68,68,0.14)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "rgba(239,68,68,0.07)")}>
                        <Trash2 className="w-3.5 h-3.5" /> Delete forever
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
