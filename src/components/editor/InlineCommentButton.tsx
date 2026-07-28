"use client";

import { useEffect, useRef, useState } from "react";
import { MessageSquarePlus, X, Send } from "lucide-react";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getInitials, timeAgo } from "@/lib/utils";

interface Props {
  documentId: string;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

function avatarColor(name: string) {
  const colors = ["#6366f1","#8b5cf6","#ec4899","#ef4444","#f97316","#22c55e","#14b8a6","#3b82f6"];
  return colors[(name || "?").charCodeAt(0) % colors.length];
}

export default function InlineCommentButton({ documentId, containerRef }: Props) {
  const qc = useQueryClient();
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [anchorPos, setAnchorPos] = useState<{ top: number; from?: number; to?: number } | null>(null);
  const [selectedText, setSelectedText] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [expandedBubble, setExpandedBubble] = useState<string | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const scrollToAnchor = (anchorText: string, commentId: string) => {
    const container = containerRef.current;
    if (!container || !anchorText) return;

    // Walk text nodes to find the anchor text
    const walk = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    let node: Text | null;
    while ((node = walk.nextNode() as Text | null)) {
      const idx = node.textContent?.indexOf(anchorText) ?? -1;
      if (idx === -1) continue;

      // Wrap in a <mark> for highlight
      const range = document.createRange();
      range.setStart(node, idx);
      range.setEnd(node, idx + anchorText.length);
      const mark = document.createElement("mark");
      mark.style.cssText = "background: rgba(99,102,241,0.3); color: inherit; border-radius: 3px; padding: 0 1px; transition: background 0.5s;";
      mark.id = `anchor-${commentId}`;
      try {
        range.surroundContents(mark);
      } catch {
        // surroundContents fails if range crosses elements; fall back to just scrolling
      }

      // Scroll the mark into view
      (mark.id ? document.getElementById(mark.id) ?? mark : mark)
        .scrollIntoView({ behavior: "smooth", block: "center" });

      setHighlightedId(commentId);

      // Remove highlight after 2.5 s
      setTimeout(() => {
        const el = document.getElementById(`anchor-${commentId}`);
        if (el && el.parentNode) {
          const parent = el.parentNode;
          while (el.firstChild) parent.insertBefore(el.firstChild, el);
          parent.removeChild(el);
        }
        setHighlightedId(null);
      }, 2500);
      return;
    }
  };

  const { data: comments } = useQuery({
    queryKey: ["comments", documentId],
    queryFn: async () => {
      const { data } = await api.get("/comments/", { params: { document: documentId } });
      return (data.results ?? data).filter((c: any) => !c.parent && !c.is_resolved && c.anchor_text);
    },
    refetchInterval: 30000,
  });

  useEffect(() => {
    const handleSelection = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.toString().trim()) {
        if (!showForm) setPos(null);
        return;
      }
      const container = containerRef.current;
      if (!container) return;
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      setSelectedText(sel.toString().trim());
      setPos({
        top: rect.top - containerRect.top - 8,
        left: rect.right - containerRect.left + 12,
      });
      setAnchorPos({
        top: rect.top - containerRect.top,
      });
    };

    document.addEventListener("selectionchange", handleSelection);
    return () => document.removeEventListener("selectionchange", handleSelection);
  }, [showForm, containerRef]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (formRef.current && !formRef.current.contains(e.target as Node)) {
        setShowForm(false);
        setComment("");
        setPos(null);
      }
    };
    if (showForm) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showForm]);

  const handlePost = async () => {
    if (!comment.trim()) return;
    setSaving(true);
    try {
      await api.post("/comments/", {
        document: documentId,
        content: comment,
        anchor_text: selectedText,
        anchor_pos: anchorPos ?? {},
      });
      toast.success("Comment added");
      qc.invalidateQueries({ queryKey: ["comments", documentId] });
      setComment("");
      setShowForm(false);
      setPos(null);
      window.getSelection()?.removeAllRanges();
    } catch {
      toast.error("Failed to post comment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Floating comment bubbles — stacked column to the right of the editor */}
      {(comments ?? []).length > 0 && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: "100%",
            marginLeft: 24,
            width: 260,
            zIndex: 40,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {(comments ?? []).map((c: any) => {
            if (!c.anchor_text) return null;
            const isExpanded = expandedBubble === c.id;
            const authorName = c.author?.name || "?";
            const color = avatarColor(authorName);
            return (
              <div
                key={c.id}
                style={{ cursor: "pointer", position: "relative" }}
                onClick={() => {
                  setExpandedBubble(isExpanded ? null : c.id);
                  scrollToAnchor(c.anchor_text, c.id);
                }}
              >
                {/* Connector line */}
                <div
                  style={{
                    position: "absolute",
                    left: -24,
                    top: "50%",
                    width: 20,
                    height: 1,
                    background: "var(--border-strong)",
                    pointerEvents: "none",
                  }}
                />
                <div
                  className="rounded-xl p-2.5"
                  style={{
                    background: "var(--bg-panel)",
                    border: `1px solid ${highlightedId === c.id ? "var(--accent)" : "var(--border-strong)"}`,
                    boxShadow: highlightedId === c.id
                      ? "0 0 0 3px rgba(99,102,241,0.2), 0 2px 12px rgba(0,0,0,0.12)"
                      : "0 2px 12px rgba(0,0,0,0.12)",
                    transition: "border-color 0.2s, box-shadow 0.2s",
                  }}
                >
                  <div className="flex items-start gap-2">
                    <div
                      className="rounded-full flex items-center justify-center text-xs font-bold shrink-0 text-white"
                      style={{ background: color, width: 26, height: 26, minWidth: 26 }}
                    >
                      {getInitials(authorName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-1.5 flex-wrap">
                        <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>{authorName}</span>
                        <span className="text-xs" style={{ color: "var(--text-3)" }}>{timeAgo(c.created_at)}</span>
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-2)", wordBreak: "break-word" }}>{c.content}</p>
                    </div>
                  </div>
                  {isExpanded && (
                    <p className="mt-2 text-xs italic px-2 py-1 rounded-lg"
                      style={{ background: "var(--accent-bg)", color: "var(--accent)", borderLeft: "2px solid var(--accent)", wordBreak: "break-word" }}>
                      "{c.anchor_text.slice(0, 100)}{c.anchor_text.length > 100 ? "…" : ""}"
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New comment button / form on text selection */}
      {pos && (
        <div style={{ position: "absolute", top: pos.top, left: pos.left, zIndex: 50 }}>
          {!showForm ? (
            <button
              onMouseDown={(e) => { e.preventDefault(); setShowForm(true); }}
              className="flex items-center gap-1 px-2 py-1.5 text-xs rounded-lg shadow-lg font-medium transition-all"
              style={{ background: "var(--accent)", color: "#fff" }}
              title="Add comment on selection"
            >
              <MessageSquarePlus className="w-3.5 h-3.5" />
              Comment
            </button>
          ) : (
            <div
              ref={formRef}
              className="w-64 rounded-xl shadow-xl p-3 space-y-2"
              style={{ background: "var(--bg-panel)", border: "1px solid var(--border-strong)", boxShadow: "var(--shadow-lg)" }}
            >
              {selectedText && (
                <p className="text-xs italic px-2 py-1 rounded-lg line-clamp-2"
                  style={{ background: "var(--accent-bg)", color: "var(--accent)", borderLeft: "2px solid var(--accent)" }}>
                  "{selectedText.slice(0, 80)}{selectedText.length > 80 ? "…" : ""}"
                </p>
              )}
              <textarea
                autoFocus
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handlePost(); }}
                placeholder="Add a comment… (⌘↵ to post)"
                className="w-full text-xs rounded-lg px-2.5 py-2 resize-none outline-none"
                style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
              />
              <div className="flex gap-2">
                <button
                  onClick={handlePost}
                  disabled={!comment.trim() || saving}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs rounded-lg font-medium disabled:opacity-40"
                  style={{ background: "var(--accent)", color: "#fff" }}
                >
                  <Send className="w-3 h-3" /> Post
                </button>
                <button
                  onClick={() => { setShowForm(false); setComment(""); setPos(null); }}
                  className="p-1.5 rounded-lg"
                  style={{ background: "var(--bg-subtle)", color: "var(--text-3)" }}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
