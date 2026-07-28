"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUIStore } from "@/store/ui.store";
import { useAuthStore } from "@/store/auth.store";
import api from "@/lib/api";
import { Search, X, FileText, Clock, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { timeAgo } from "@/lib/utils";

export default function SearchModal() {
  const { searchOpen, setSearchOpen } = useUIStore();
  const activeCompanyId = useAuthStore((s) => s.activeCompanyId);
  const [q, setQ] = useState("");
  const router = useRouter();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setSearchOpen]);

  const { data, isFetching } = useQuery({
    queryKey: ["search", q, activeCompanyId],
    queryFn: async () => {
      if (!q.trim()) return { results: [] };
      const { data } = await api.get("/search/", {
        params: { q, company: activeCompanyId },
      });
      return data;
    },
    enabled: q.trim().length > 1,
  });

  const handleSelect = (id: string) => {
    setSearchOpen(false);
    setQ("");
    router.push(`/documents/${id}`);
  };

  if (!searchOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4 modal-backdrop">
      <div className="absolute inset-0" onClick={() => setSearchOpen(false)} />
      <div
        className="relative w-full max-w-xl rounded-2xl overflow-hidden animate-fadeUp"
        style={{
          background: "var(--bg-panel)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: "1px solid var(--border)" }}>
          {isFetching ? (
            <Loader2 className="w-4 h-4 animate-spin shrink-0" style={{ color: "var(--text-3)" }} />
          ) : (
            <Search className="w-4 h-4 shrink-0" style={{ color: "var(--text-3)" }} />
          )}
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search documents…"
            className="flex-1 text-sm outline-none bg-transparent"
            style={{ color: "var(--text)" }}
          />
          <button onClick={() => setSearchOpen(false)} style={{ color: "var(--text-3)" }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {data?.results?.length === 0 && q.trim().length > 1 && (
            <p className="text-sm text-center py-8" style={{ color: "var(--text-3)" }}>No results for &ldquo;{q}&rdquo;</p>
          )}
          {data?.results?.map((doc: any) => (
            <button
              key={doc.id}
              onClick={() => handleSelect(doc.id)}
              className="flex items-center gap-3 w-full px-4 py-3 text-left transition-colors"
              style={{ color: "var(--text)" }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <FileText className="w-4 h-4 shrink-0" style={{ color: "var(--accent)" }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>{doc.title || "Untitled"}</p>
                <p className="text-xs" style={{ color: "var(--text-3)" }}>{timeAgo(doc.updated_at)}</p>
              </div>
            </button>
          ))}
          {!q && (
            <div className="px-4 py-8 text-center">
              <Search className="w-6 h-6 mx-auto mb-2" style={{ color: "var(--text-3)" }} />
              <p className="text-sm" style={{ color: "var(--text-3)" }}>Type to search documents…</p>
            </div>
          )}
        </div>

        <div className="px-4 py-2 flex gap-4 text-xs" style={{ borderTop: "1px solid var(--border)", color: "var(--text-3)" }}>
          <span><kbd className="px-1.5 py-0.5 rounded text-[10px]" style={{ background: "var(--bg-subtle)" }}>↑↓</kbd> navigate</span>
          <span><kbd className="px-1.5 py-0.5 rounded text-[10px]" style={{ background: "var(--bg-subtle)" }}>↵</kbd> open</span>
          <span><kbd className="px-1.5 py-0.5 rounded text-[10px]" style={{ background: "var(--bg-subtle)" }}>Esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
