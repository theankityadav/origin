"use client";

import { MessageSquare, Share2, History, Lock, MoreHorizontal, Check, Loader2, Archive, Trash2, Star, Download, FileText, FileCode, Table2, SearchCheck, SearchX, FolderOpen, ChevronRight } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth.store";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";

interface Props {
  title: string;
  onTitleChange: (v: string) => void;
  saveStatus: "saved" | "saving" | "unsaved";
  doc: any;
  onToggleComments: () => void;
  onToggleShare: () => void;
  onToggleVersions: () => void;
  showComments: boolean;
}

export default function DocumentHeader({
  title, onTitleChange, saveStatus, doc,
  onToggleComments, onToggleShare, onToggleVersions, showComments,
}: Props) {
  const qc = useQueryClient();
  const activeCompanyId = useAuthStore((s) => s.activeCompanyId);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showCategory, setShowCategory] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });

  const { data: categories } = useQuery({
    queryKey: ["categories", activeCompanyId],
    queryFn: async () => {
      const { data } = await api.get("/categories/", {
        params: activeCompanyId ? { company: activeCompanyId } : {},
      });
      return data.results ?? data;
    },
    enabled: !!activeCompanyId && menuOpen,
  });

  const categoryMutation = useMutation({
    mutationFn: (categoryId: string | null) =>
      api.patch(`/documents/${doc?.id}/`, { category: categoryId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["document", doc?.id] });
      qc.invalidateQueries({ queryKey: ["docs-by-category"] });
      qc.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Category updated");
      setMenuOpen(false);
      setShowCategory(false);
    },
    onError: () => toast.error("Failed to update category"),
  });

  const currentCategory = categories?.find((c: any) => c.id === doc?.category);

  const handleExport = (fmt: string) => {
    if (!doc?.id) return;
    const token = JSON.parse(localStorage.getItem("origin-auth") || "{}").state?.accessToken;
    const a = document.createElement("a");
    a.href = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"}/documents/${doc.id}/export/?format=${fmt}`;
    a.setAttribute("download", "");
    // Use fetch to honour auth header then trigger download
    fetch(a.href, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const ext = fmt === "csv" ? "csv" : fmt === "html" ? "html" : "md";
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${doc.title || "document"}.${ext}`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success(`Exported as .${ext}`);
      })
      .catch(() => toast.error("Export failed"));
    setMenuOpen(false);
    setShowExport(false);
  };

  const seoMutation = useMutation({
    mutationFn: () => api.patch(`/documents/${doc?.id}/`, { seo_indexed: !doc?.seo_indexed }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["document", doc?.id] }); toast.success(doc?.seo_indexed ? "Removed from search engines" : "Enabled search engine indexing"); },
  });

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const lockMutation = useMutation({
    mutationFn: () => api.post(`/documents/${doc?.id}/lock/`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["document", doc?.id] }); toast.success(doc?.is_locked ? "Unlocked" : "Locked"); },
  });

  const starMutation = useMutation({
    mutationFn: () => api.post(`/documents/${doc?.id}/star/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["document", doc?.id] }),
  });

  const archiveMutation = useMutation({
    mutationFn: () => api.post(`/documents/${doc?.id}/archive/`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["document", doc?.id] }); toast.success("Archived"); },
  });

  const iconBtn = "p-2 rounded-lg transition-colors";
  const iconBtnStyle = { color: "var(--text-3)" };
  const iconBtnHover = (e: React.MouseEvent<HTMLButtonElement>) =>
    (e.currentTarget.style.background = "var(--bg-hover)");
  const iconBtnLeave = (e: React.MouseEvent<HTMLButtonElement>) =>
    (e.currentTarget.style.background = "transparent");

  const SaveIndicator = () => (
    <span className="text-xs flex items-center gap-1" style={{ color: "var(--text-3)" }}>
      {saveStatus === "saving" && <><Loader2 className="w-3 h-3 animate-spin" /> Saving…</>}
      {saveStatus === "saved" && <><Check className="w-3 h-3" style={{ color: "var(--success)" }} /> Saved</>}
      {saveStatus === "unsaved" && "Unsaved"}
    </span>
  );

  return (
    <div
      className="sticky top-0 px-8 py-3 flex items-center gap-3"
      style={{
        background: "var(--bg-panel)",
        borderBottom: "1px solid var(--border)",
        zIndex: 100,
      }}
    >
      {/* Title */}
      <div className="flex-1 min-w-0">
        <input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          readOnly={doc?.is_locked}
          className="text-xl font-bold bg-transparent outline-none w-full truncate transition"
          style={{ color: "var(--text)", caretColor: "var(--accent)" }}
          placeholder="Untitled Document"
        />
      </div>

      <SaveIndicator />

      {/* Actions */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => starMutation.mutate()}
          title={doc?.is_starred_by_me ? "Unstar" : "Star"}
          className={iconBtn}
          style={{ color: doc?.is_starred_by_me ? "var(--warning)" : "var(--text-3)" }}
          onMouseEnter={iconBtnHover} onMouseLeave={iconBtnLeave}
        >
          <Star className="w-4 h-4" fill={doc?.is_starred_by_me ? "currentColor" : "none"} />
        </button>

        <button
          onClick={onToggleComments}
          title="Comments"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm transition-colors"
          style={{
            background: showComments ? "var(--accent-bg)" : "transparent",
            color: showComments ? "var(--accent)" : "var(--text-3)",
          }}
          onMouseEnter={e => { if (!showComments) e.currentTarget.style.background = "var(--bg-hover)"; }}
          onMouseLeave={e => { if (!showComments) e.currentTarget.style.background = "transparent"; }}
        >
          <MessageSquare className="w-4 h-4" />
          {doc?.comment_count > 0 && <span className="text-xs font-semibold">{doc.comment_count}</span>}
        </button>

        <button onClick={onToggleVersions} title="Version History"
          className={iconBtn} style={iconBtnStyle}
          onMouseEnter={iconBtnHover} onMouseLeave={iconBtnLeave}
        >
          <History className="w-4 h-4" />
        </button>

        <button onClick={onToggleShare} className="btn-primary flex items-center gap-1.5 px-3 py-1.5 text-sm">
          <Share2 className="w-3.5 h-3.5" /> Share
        </button>

        {/* More menu */}
        <div className="relative" ref={menuRef}>
          <button
            ref={btnRef}
            onClick={() => {
              if (!menuOpen && btnRef.current) {
                const r = btnRef.current.getBoundingClientRect();
                setMenuPos({ top: r.bottom + 6, right: window.innerWidth - r.right });
              }
              setMenuOpen(o => !o);
            }}
            className={iconBtn} style={iconBtnStyle}
            onMouseEnter={iconBtnHover} onMouseLeave={iconBtnLeave}
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          {menuOpen && (
            <div
              className="fixed w-52 rounded-xl py-1 animate-fadeIn"
              style={{ top: menuPos.top, right: menuPos.right, background: "var(--bg-panel)", border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)", zIndex: 9999 }}
            >
              {/* Export submenu */}
              <button
                onClick={() => setShowExport(!showExport)}
                className="flex items-center justify-between gap-2 px-3 py-2 text-sm w-full transition-colors"
                style={{ color: "var(--text-2)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <span className="flex items-center gap-2"><Download className="w-4 h-4" /> Export</span>
                <span style={{ color: "var(--text-3)", fontSize: 10 }}>▶</span>
              </button>
              {showExport && (
                <div className="mx-2 mb-1 rounded-xl overflow-hidden" style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}>
                  {[
                    { fmt: "markdown", label: "Markdown (.md)", icon: FileCode },
                    { fmt: "html",     label: "HTML (.html)",   icon: FileText },
                    { fmt: "csv",      label: "Metadata (.csv)",icon: Table2 },
                  ].map(({ fmt, label, icon: Icon }) => (
                    <button key={fmt} onClick={() => handleExport(fmt)}
                      className="flex items-center gap-2 px-3 py-2 text-xs w-full transition-colors"
                      style={{ color: "var(--text-2)" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <Icon className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} /> {label}
                    </button>
                  ))}
                </div>
              )}

              {/* SEO indexing */}
              {doc?.visibility === "public" && (
                <button onClick={() => { seoMutation.mutate(); setMenuOpen(false); }}
                  className="flex items-center gap-2 px-3 py-2 text-sm w-full transition-colors"
                  style={{ color: "var(--text-2)" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  {doc?.seo_indexed
                    ? <><SearchX className="w-4 h-4" /> Remove from Search</>
                    : <><SearchCheck className="w-4 h-4" /> Allow Search Indexing</>}
                </button>
              )}

              {/* Category picker */}
              <button
                onClick={() => setShowCategory(!showCategory)}
                className="flex items-center justify-between gap-2 px-3 py-2 text-sm w-full transition-colors"
                style={{ color: "var(--text-2)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <span className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4" />
                  Category
                  {currentCategory && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: currentCategory.color + "22", color: currentCategory.color }}>
                      {currentCategory.icon || ""} {currentCategory.name}
                    </span>
                  )}
                </span>
                <ChevronRight className="w-3 h-3" style={{ color: "var(--text-3)" }} />
              </button>
              {showCategory && (
                <div className="mx-2 mb-1 rounded-xl overflow-hidden" style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}>
                  <button
                    onClick={() => categoryMutation.mutate(null)}
                    className="flex items-center gap-2 px-3 py-2 text-xs w-full transition-colors"
                    style={{ color: doc?.category ? "var(--text-2)" : "var(--accent)" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    {!doc?.category && <Check className="w-3 h-3" />} None
                  </button>
                  {categories?.map((cat: any) => (
                    <button key={cat.id}
                      onClick={() => categoryMutation.mutate(cat.id)}
                      className="flex items-center gap-2 px-3 py-2 text-xs w-full transition-colors"
                      style={{ color: doc?.category === cat.id ? "var(--accent)" : "var(--text-2)" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      {doc?.category === cat.id && <Check className="w-3 h-3 shrink-0" />}
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: cat.color }} />
                      {cat.icon} {cat.name}
                    </button>
                  ))}
                  {!categories?.length && <p className="px-3 py-2 text-xs" style={{ color: "var(--text-3)" }}>No categories yet</p>}
                </div>
              )}

              <div className="my-1" style={{ borderTop: "1px solid var(--border)" }} />
              <button onClick={() => { lockMutation.mutate(); setMenuOpen(false); }}
                className="flex items-center gap-2 px-3 py-2 text-sm w-full transition-colors"
                style={{ color: "var(--text-2)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <Lock className="w-4 h-4" /> {doc?.is_locked ? "Unlock page" : "Lock page"}
              </button>
              <button onClick={() => { archiveMutation.mutate(); setMenuOpen(false); }}
                className="flex items-center gap-2 px-3 py-2 text-sm w-full transition-colors"
                style={{ color: "var(--text-2)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <Archive className="w-4 h-4" /> Archive
              </button>
              <div className="my-1" style={{ borderTop: "1px solid var(--border)" }} />
              <button
                className="flex items-center gap-2 px-3 py-2 text-sm w-full transition-colors"
                style={{ color: "var(--danger)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(239,68,68,0.08)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <Trash2 className="w-4 h-4" /> Move to Trash
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
