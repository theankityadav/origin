"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth.store";
import api from "@/lib/api";
import Link from "next/link";
import {
  FolderOpen, FileText, Loader2, Plus, Pencil, Trash2,
  ChevronDown, ChevronRight, X, Check,
} from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { timeAgo } from "@/lib/utils";

const PRESET_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#3b82f6", "#64748b",
];

function CategoryForm({
  initial, onSave, onCancel, loading,
}: {
  initial?: { name: string; color: string; icon: string };
  onSave: (v: { name: string; color: string; icon: string }) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [color, setColor] = useState(initial?.color ?? "#6366f1");
  const [icon, setIcon] = useState(initial?.icon ?? "");

  return (
    <div className="p-4 space-y-3" style={{ borderBottom: "1px solid var(--border)" }}>
      <div className="flex items-center gap-2">
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Category name"
          className="flex-1 px-3 py-2 text-sm rounded-xl outline-none"
          style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
          onKeyDown={e => { if (e.key === "Enter" && name.trim()) onSave({ name, color, icon }); }}
        />
        <input
          value={icon}
          onChange={e => setIcon(e.target.value)}
          placeholder="Icon emoji"
          className="w-20 px-3 py-2 text-sm rounded-xl outline-none text-center"
          style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
        />
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs" style={{ color: "var(--text-3)" }}>Color:</span>
        {PRESET_COLORS.map(c => (
          <button key={c} onClick={() => setColor(c)}
            className="w-5 h-5 rounded-full transition-transform hover:scale-110"
            style={{ background: c, outline: c === color ? "2px solid var(--text)" : "none", outlineOffset: "2px" }}
          />
        ))}
      </div>
      <div className="flex items-center gap-2 justify-end">
        <button onClick={onCancel} className="px-3 py-1.5 text-xs rounded-xl"
          style={{ background: "var(--bg-subtle)", color: "var(--text-2)" }}>
          Cancel
        </button>
        <button onClick={() => name.trim() && onSave({ name, color, icon })}
          disabled={!name.trim() || loading}
          className="px-3 py-1.5 text-xs rounded-xl font-medium disabled:opacity-50"
          style={{ background: color, color: "#fff" }}>
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 inline mr-1" />}
          {initial ? "Save" : "Create"}
        </button>
      </div>
    </div>
  );
}

function CategoryRow({ cat, activeCompanyId, onRefresh }: { cat: any; activeCompanyId: string | null; onRefresh: () => void }) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);

  const { data: docs, isLoading: docsLoading } = useQuery({
    queryKey: ["docs-by-category", cat.id],
    queryFn: async () => {
      const { data } = await api.get("/documents/", {
        params: { category: cat.id, is_deleted: false, is_archived: false },
      });
      return data.results ?? data;
    },
    enabled: expanded,
  });

  const updateCat = useMutation({
    mutationFn: (v: any) => api.patch(`/categories/${cat.id}/`, v),
    onSuccess: () => { toast.success("Category updated"); setEditing(false); qc.invalidateQueries({ queryKey: ["categories"] }); },
    onError: (e: any) => toast.error(e?.response?.data?.name?.[0] || "Failed"),
  });

  const deleteCat = useMutation({
    mutationFn: () => api.delete(`/categories/${cat.id}/`),
    onSuccess: () => { toast.success("Category deleted"); qc.invalidateQueries({ queryKey: ["categories"] }); },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Failed to delete"),
  });

  if (editing) {
    return (
      <CategoryForm
        initial={{ name: cat.name, color: cat.color, icon: cat.icon }}
        onSave={v => updateCat.mutate(v)}
        onCancel={() => setEditing(false)}
        loading={updateCat.isPending}
      />
    );
  }

  return (
    <>
      <div
        className="flex items-center gap-3 px-4 py-3.5 group transition-colors cursor-pointer"
        onClick={() => setExpanded(x => !x)}
        onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
      >
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0"
          style={{ background: cat.color + "22" }}>
          {cat.icon || <FolderOpen className="w-4 h-4" style={{ color: cat.color }} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium" style={{ color: "var(--text)" }}>{cat.name}</p>
        </div>
        <span className="text-xs px-2 py-1 rounded-full shrink-0"
          style={{ background: cat.color + "18", color: cat.color }}>
          {cat.document_count ?? 0} docs
        </span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0"
          onClick={e => e.stopPropagation()}>
          <button onClick={() => setEditing(true)}
            className="p-1.5 rounded-lg transition" style={{ color: "var(--text-3)" }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-subtle)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => { if (confirm(`Delete "${cat.name}"?`)) deleteCat.mutate(); }}
            className="p-1.5 rounded-lg transition" style={{ color: "var(--danger)" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(239,68,68,0.08)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
        {expanded
          ? <ChevronDown className="w-4 h-4 shrink-0" style={{ color: "var(--text-3)" }} />
          : <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "var(--text-3)" }} />}
      </div>

      {/* Expanded doc list */}
      {expanded && (
        <div style={{ background: "var(--bg-subtle)", borderBottom: "1px solid var(--border)" }}>
          {docsLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--text-3)" }} />
            </div>
          ) : !docs || docs.length === 0 ? (
            <p className="text-xs text-center py-4" style={{ color: "var(--text-3)" }}>No documents in this category</p>
          ) : (
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {docs.map((doc: any) => (
                <Link key={doc.id} href={`/documents/${doc.id}`}
                  className="flex items-center gap-3 px-6 py-2.5 transition-colors"
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <span className="text-base shrink-0">{doc.icon || "📄"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate" style={{ color: "var(--text)" }}>{doc.title || "Untitled"}</p>
                    <p className="text-xs" style={{ color: "var(--text-3)" }}>Updated {timeAgo(doc.updated_at)}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default function CategoriesPage() {
  const activeCompanyId = useAuthStore((s) => s.activeCompanyId);
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  const { data: categories, isLoading, refetch } = useQuery({
    queryKey: ["categories", activeCompanyId],
    queryFn: async () => {
      const { data } = await api.get("/categories/", {
        params: activeCompanyId ? { company: activeCompanyId } : {},
      });
      return data.results ?? data;
    },
    enabled: !!activeCompanyId,
  });

  const createCat = useMutation({
    mutationFn: (v: { name: string; color: string; icon: string }) =>
      api.post("/categories/", { ...v, company: activeCompanyId }),
    onSuccess: () => {
      toast.success("Category created");
      setShowCreate(false);
      qc.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.name?.[0] || e?.response?.data?.detail || "Failed to create"),
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: "var(--text)" }}>
          <FolderOpen className="w-5 h-5" style={{ color: "var(--accent)" }} /> Categories
        </h1>
        <button
          onClick={() => setShowCreate(x => !x)}
          className="btn-primary flex items-center gap-1.5 text-sm px-4 py-2"
        >
          {showCreate ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showCreate ? "Cancel" : "New Category"}
        </button>
      </div>

      <div className="panel overflow-hidden">
        {showCreate && (
          <CategoryForm
            onSave={v => createCat.mutate(v)}
            onCancel={() => setShowCreate(false)}
            loading={createCat.isPending}
          />
        )}

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--text-3)" }} />
          </div>
        ) : !categories || categories.length === 0 ? (
          <div className="text-center py-16">
            <FolderOpen className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--border-strong)" }} />
            <p className="text-sm" style={{ color: "var(--text-2)" }}>No categories yet</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-3)" }}>Categories help organise your documents</p>
            {!showCreate && (
              <button onClick={() => setShowCreate(true)}
                className="mt-3 text-sm font-medium hover:underline" style={{ color: "var(--accent)" }}>
                Create your first category →
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {categories.map((cat: any) => (
              <CategoryRow key={cat.id} cat={cat} activeCompanyId={activeCompanyId} onRefresh={refetch} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
