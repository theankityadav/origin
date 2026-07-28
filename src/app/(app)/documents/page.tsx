"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth.store";
import api from "@/lib/api";
import Link from "next/link";
import { timeAgo } from "@/lib/utils";
import {
  FileText, Plus, Star, MoreHorizontal, Trash2, Archive,
  Loader2, Lock, Search, Filter, ChevronLeft, ChevronRight,
  CheckSquare, Square, X, StarOff,
} from "lucide-react";
import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useUIStore } from "@/store/ui.store";
import toast from "react-hot-toast";

const PAGE_SIZE = 10;
const FILTER_OPTIONS = [
  { label: "All", value: "all" },
  { label: "Starred", value: "starred" },
  { label: "Archived", value: "archived" },
];

function DocRow({
  doc, selected, onToggle, onRefresh,
}: {
  doc: any;
  selected: boolean;
  onToggle: (id: string) => void;
  onRefresh: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const star = useMutation({
    mutationFn: () => api.post(`/documents/${doc.id}/star/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documents"] }),
  });
  const trash = useMutation({
    mutationFn: () => api.post(`/documents/${doc.id}/trash/`),
    onSuccess: () => { toast.success("Moved to trash"); onRefresh(); },
  });
  const archive = useMutation({
    mutationFn: () => api.post(`/documents/${doc.id}/archive/`),
    onSuccess: () => { toast.success("Archived"); onRefresh(); },
  });

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 group transition-colors"
      style={{ background: selected ? "var(--accent-bg)" : "transparent" }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.background = "var(--bg-hover)"; }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.background = "transparent"; }}
    >
      {/* Checkbox */}
      <button
        onClick={e => { e.preventDefault(); onToggle(doc.id); }}
        className="shrink-0 transition-opacity"
        style={{ color: selected ? "var(--accent)" : "var(--text-3)", opacity: selected ? 1 : 0 }}
        onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
        onMouseLeave={e => { if (!selected) e.currentTarget.style.opacity = "0"; }}
      >
        {selected
          ? <CheckSquare className="w-4 h-4" />
          : <Square className="w-4 h-4" />}
      </button>

      <span className="text-lg shrink-0">{doc.icon || "📄"}</span>

      <Link href={`/documents/${doc.id}`} className="flex-1 min-w-0" onClick={e => selected && e.preventDefault()}>
        <p className="text-sm font-medium truncate transition" style={{ color: "var(--text)" }}>
          {doc.title || "Untitled"}
          {doc.is_locked && <Lock className="w-3 h-3 inline ml-1" style={{ color: "var(--text-3)" }} />}
        </p>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>Updated {timeAgo(doc.updated_at)}</p>
      </Link>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
        <button
          onClick={() => star.mutate()}
          className="p-1.5 rounded-lg transition"
          style={{ color: doc.is_starred_by_me ? "#f59e0b" : "var(--text-3)" }}
          onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-subtle)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          title={doc.is_starred_by_me ? "Unstar" : "Star"}
        >
          <Star className="w-3.5 h-3.5" fill={doc.is_starred_by_me ? "currentColor" : "none"} />
        </button>
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1.5 rounded-lg transition"
            style={{ color: "var(--text-3)" }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-subtle)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-44 rounded-xl shadow-lg z-50 py-1 overflow-hidden"
              style={{ background: "var(--bg-panel)", border: "1px solid var(--border)" }}>
              <button onClick={() => { archive.mutate(); setMenuOpen(false); }}
                className="flex items-center gap-2 px-3 py-2.5 text-sm w-full transition"
                style={{ color: "var(--text-2)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <Archive className="w-4 h-4" /> {doc.is_archived ? "Unarchive" : "Archive"}
              </button>
              <button onClick={() => { trash.mutate(); setMenuOpen(false); }}
                className="flex items-center gap-2 px-3 py-2.5 text-sm w-full transition"
                style={{ color: "var(--danger)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(239,68,68,0.07)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <Trash2 className="w-4 h-4" /> Move to Trash
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DocumentsPage() {
  const activeCompanyId = useAuthStore((s) => s.activeCompanyId);
  const qc = useQueryClient();
  const router = useRouter();
  const { setNewDocOpen } = useUIStore();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const baseParams: Record<string, any> = {
    ...(activeCompanyId ? { company: activeCompanyId } : {}),
    owner: "me",
  };
  if (filter === "starred") baseParams.is_starred = true;
  if (filter === "archived") baseParams.is_archived = true;
  else if (filter !== "archived") baseParams.is_archived = false;
  if (search.trim()) baseParams.search = search.trim();

  const { data: docs, isLoading, refetch } = useQuery({
    queryKey: ["documents", "list", activeCompanyId, filter, search],
    queryFn: async () => {
      const { data } = await api.get("/documents/", { params: baseParams });
      return data.results ?? data;
    },
  });

  // Client-side pagination
  const totalPages = Math.max(1, Math.ceil((docs?.length ?? 0) / PAGE_SIZE));
  const pageDocs = useMemo(() => {
    if (!docs) return [];
    const start = (page - 1) * PAGE_SIZE;
    return docs.slice(start, start + PAGE_SIZE);
  }, [docs, page]);

  // Reset page on filter/search change
  useEffect(() => { setPage(1); setSelected(new Set()); }, [filter, search]);

  const toggleOne = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    const ids = pageDocs.map((d: any) => d.id);
    const allSelected = ids.every((id: string) => selected.has(id));
    setSelected(allSelected ? new Set() : new Set(ids));
  };

  const clearSelection = () => setSelected(new Set());

  // Bulk mutations
  const bulkTrash = useMutation({
    mutationFn: () => Promise.all([...selected].map(id => api.post(`/documents/${id}/trash/`))),
    onSuccess: () => {
      toast.success(`${selected.size} document${selected.size > 1 ? "s" : ""} moved to trash`);
      clearSelection(); refetch();
    },
  });
  const bulkArchive = useMutation({
    mutationFn: () => Promise.all([...selected].map(id => api.post(`/documents/${id}/archive/`))),
    onSuccess: () => {
      toast.success(`${selected.size} document${selected.size > 1 ? "s" : ""} archived`);
      clearSelection(); refetch();
    },
  });
  const bulkStar = useMutation({
    mutationFn: () => Promise.all([...selected].map(id => api.post(`/documents/${id}/star/`))),
    onSuccess: () => {
      toast.success(`${selected.size} document${selected.size > 1 ? "s" : ""} starred`);
      clearSelection();
      qc.invalidateQueries({ queryKey: ["documents"] });
    },
  });

  const allPageSelected = pageDocs.length > 0 && pageDocs.every((d: any) => selected.has(d.id));
  const someSelected = selected.size > 0;
  const isPending = bulkTrash.isPending || bulkArchive.isPending || bulkStar.isPending;

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>My Documents</h1>
        <button
          onClick={() => setNewDocOpen(true)}
          className="btn-primary flex items-center gap-1.5 text-sm px-4 py-2"
        >
          <Plus className="w-4 h-4" />
          New Document
        </button>
      </div>

      {/* Search + Filter bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-3)" }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search documents…"
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl outline-none transition"
            style={{ background: "var(--bg-panel)", border: "1px solid var(--border)", color: "var(--text)" }}
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-3)" }}>
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter dropdown */}
        <div className="relative" ref={filterRef}>
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl transition"
            style={{
              background: filter !== "all" ? "var(--accent-bg)" : "var(--bg-panel)",
              border: `1px solid ${filter !== "all" ? "var(--accent)" : "var(--border)"}`,
              color: filter !== "all" ? "var(--accent)" : "var(--text-2)",
            }}
          >
            <Filter className="w-3.5 h-3.5" />
            {FILTER_OPTIONS.find(f => f.value === filter)?.label ?? "Filter"}
          </button>
          {filterOpen && (
            <div className="absolute right-0 top-full mt-1 w-36 rounded-xl shadow-lg z-50 py-1 overflow-hidden"
              style={{ background: "var(--bg-panel)", border: "1px solid var(--border)" }}>
              {FILTER_OPTIONS.map(f => (
                <button key={f.value} onClick={() => { setFilter(f.value); setFilterOpen(false); }}
                  className="w-full text-left px-3 py-2 text-sm transition"
                  style={{ color: filter === f.value ? "var(--accent)" : "var(--text-2)", background: filter === f.value ? "var(--accent-bg)" : "transparent" }}
                  onMouseEnter={e => { if (filter !== f.value) e.currentTarget.style.background = "var(--bg-hover)"; }}
                  onMouseLeave={e => { if (filter !== f.value) e.currentTarget.style.background = "transparent"; }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bulk action bar */}
      {someSelected && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl animate-fadeIn"
          style={{ background: "var(--accent-bg)", border: "1px solid var(--accent)" }}>
          <span className="text-sm font-medium flex-1" style={{ color: "var(--accent)" }}>
            {selected.size} selected
          </span>
          <button onClick={() => bulkStar.mutate()} disabled={isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-50"
            style={{ background: "rgba(245,158,11,0.1)", color: "#d97706" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(245,158,11,0.2)")}
            onMouseLeave={e => (e.currentTarget.style.background = "rgba(245,158,11,0.1)")}>
            <Star className="w-3.5 h-3.5" /> Star
          </button>
          <button onClick={() => bulkArchive.mutate()} disabled={isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-50"
            style={{ background: "var(--bg-subtle)", color: "var(--text-2)" }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
            onMouseLeave={e => (e.currentTarget.style.background = "var(--bg-subtle)")}>
            <Archive className="w-3.5 h-3.5" /> Archive
          </button>
          <button onClick={() => { if (confirm(`Move ${selected.size} document(s) to trash?`)) bulkTrash.mutate(); }}
            disabled={isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-50"
            style={{ background: "rgba(239,68,68,0.08)", color: "var(--danger)" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(239,68,68,0.15)")}
            onMouseLeave={e => (e.currentTarget.style.background = "rgba(239,68,68,0.08)")}>
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
          <button onClick={clearSelection} className="p-1.5 rounded-lg" style={{ color: "var(--text-3)" }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Document list */}
      <div className="panel overflow-hidden">
        {/* Select-all header */}
        <div className="flex items-center gap-3 px-4 py-2.5" style={{ borderBottom: "1px solid var(--border)" }}>
          <button onClick={toggleAll} className="shrink-0 transition"
            style={{ color: allPageSelected ? "var(--accent)" : "var(--text-3)" }}>
            {allPageSelected
              ? <CheckSquare className="w-4 h-4" />
              : <Square className="w-4 h-4" />}
          </button>
          <span className="text-xs font-medium" style={{ color: "var(--text-3)" }}>
            {docs?.length ?? 0} document{docs?.length !== 1 ? "s" : ""}
            {search && <span> matching "{search}"</span>}
          </span>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--text-3)" }} />
          </div>
        ) : pageDocs.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--border-strong)" }} />
            <p className="mb-2" style={{ color: "var(--text-3)" }}>
              {search ? `No results for "${search}"` : "No documents yet"}
            </p>
            {!search && (
              <button onClick={() => setNewDocOpen(true)}
                className="text-sm font-medium hover:underline" style={{ color: "var(--accent)" }}>
                Create your first document →
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {pageDocs.map((doc: any) => (
              <DocRow
                key={doc.id}
                doc={doc}
                selected={selected.has(doc.id)}
                onToggle={toggleOne}
                onRefresh={refetch}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: "1px solid var(--border)" }}>
            <span className="text-xs" style={{ color: "var(--text-3)" }}>
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg transition disabled:opacity-30"
                style={{ color: "var(--text-2)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)}
                  className="w-7 h-7 rounded-lg text-xs font-medium transition"
                  style={{
                    background: p === page ? "var(--accent)" : "transparent",
                    color: p === page ? "#fff" : "var(--text-2)",
                  }}
                  onMouseEnter={e => { if (p !== page) e.currentTarget.style.background = "var(--bg-hover)"; }}
                  onMouseLeave={e => { if (p !== page) e.currentTarget.style.background = "transparent"; }}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg transition disabled:opacity-30"
                style={{ color: "var(--text-2)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
