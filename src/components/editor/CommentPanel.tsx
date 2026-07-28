"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { getInitials, timeAgo } from "@/lib/utils";
import { X, Send, CheckCheck, Loader2, MessageSquare, CornerDownRight } from "lucide-react";
import toast from "react-hot-toast";

interface Props {
  documentId: string;
  onClose: () => void;
}

function Avatar({ name, size = 6 }: { name: string; size?: number }) {
  const initials = getInitials(name || "?");
  const colors = ["#6366f1","#8b5cf6","#ec4899","#ef4444","#f97316","#22c55e","#14b8a6","#3b82f6"];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div
      className={`w-${size} h-${size} rounded-full flex items-center justify-center text-xs font-bold shrink-0 text-white`}
      style={{ background: color, minWidth: `${size * 4}px`, minHeight: `${size * 4}px` }}
    >
      {initials}
    </div>
  );
}

function CommentItem({ comment, documentId }: { comment: any; documentId: string }) {
  const qc = useQueryClient();
  const [replyText, setReplyText] = useState("");
  const [showReply, setShowReply] = useState(false);

  const resolve = useMutation({
    mutationFn: () => api.post(`/comments/${comment.id}/resolve/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comments", documentId] }),
  });

  const addReply = useMutation({
    mutationFn: () => api.post("/comments/", { document: documentId, parent: comment.id, content: replyText }),
    onSuccess: () => {
      setReplyText("");
      setShowReply(false);
      qc.invalidateQueries({ queryKey: ["comments", documentId] });
    },
  });

  return (
    <div
      className="rounded-xl p-3 space-y-2"
      style={{
        background: comment.is_resolved ? "var(--bg-subtle)" : "var(--bg-panel)",
        border: `1px solid ${comment.is_resolved ? "var(--border)" : "var(--border-strong)"}`,
        opacity: comment.is_resolved ? 0.7 : 1,
      }}
    >
      {/* Author row */}
      <div className="flex items-center gap-2">
        <Avatar name={comment.author?.name || "?"} size={6} />
        <div className="flex-1 min-w-0">
          <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>{comment.author?.name}</span>
          <span className="text-xs ml-2" style={{ color: "var(--text-3)" }}>{timeAgo(comment.created_at)}</span>
        </div>
        {comment.is_resolved && (
          <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e" }}>
            Resolved
          </span>
        )}
      </div>

      {/* Anchor quote */}
      {comment.anchor_text && (
        <p className="text-xs italic px-2 py-1 rounded-lg line-clamp-2"
          style={{ background: "var(--accent-bg)", color: "var(--accent)", borderLeft: "2px solid var(--accent)" }}>
          "{comment.anchor_text.slice(0, 100)}{comment.anchor_text.length > 100 ? "…" : ""}"
        </p>
      )}

      {/* Content */}
      <p className="text-sm" style={{ color: "var(--text-2)" }}>{comment.content}</p>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={() => setShowReply(!showReply)}
          className="flex items-center gap-1 text-xs transition hover:opacity-80"
          style={{ color: "var(--accent)" }}
        >
          <CornerDownRight className="w-3 h-3" /> Reply
        </button>
        <button
          onClick={() => resolve.mutate()}
          disabled={resolve.isPending}
          className="flex items-center gap-1 text-xs transition hover:opacity-80"
          style={{ color: comment.is_resolved ? "var(--text-3)" : "var(--success, #22c55e)" }}
        >
          <CheckCheck className="w-3.5 h-3.5" />
          {comment.is_resolved ? "Unresolve" : "Resolve"}
        </button>
      </div>

      {/* Replies */}
      {comment.replies?.length > 0 && (
        <div className="space-y-2 pl-3" style={{ borderLeft: "2px solid var(--border)" }}>
          {comment.replies.map((r: any) => (
            <div key={r.id} className="flex gap-2 items-start">
              <Avatar name={r.author?.name || "?"} size={5} />
              <div className="min-w-0">
                <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>{r.author?.name}</span>
                <span className="text-xs ml-1.5" style={{ color: "var(--text-3)" }}>{timeAgo(r.created_at)}</span>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-2)" }}>{r.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {showReply && (
        <div className="flex gap-2 pt-1">
          <input
            autoFocus
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && replyText.trim()) addReply.mutate(); }}
            placeholder="Reply…"
            className="flex-1 text-xs rounded-lg px-2.5 py-1.5 outline-none"
            style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
          />
          <button
            onClick={() => addReply.mutate()}
            disabled={!replyText.trim() || addReply.isPending}
            className="p-1.5 rounded-lg disabled:opacity-40"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            <Send className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function CommentPanel({ documentId, onClose }: Props) {
  const qc = useQueryClient();
  const [newComment, setNewComment] = useState("");
  const [tab, setTab] = useState<"open" | "resolved">("open");

  const { data: comments, isLoading } = useQuery({
    queryKey: ["comments", documentId],
    queryFn: async () => {
      const { data } = await api.get("/comments/", { params: { document: documentId } });
      return data.results ?? data;
    },
  });

  const addComment = useMutation({
    mutationFn: () => api.post("/comments/", { document: documentId, content: newComment }),
    onSuccess: () => {
      setNewComment("");
      qc.invalidateQueries({ queryKey: ["comments", documentId] });
      toast.success("Comment added");
    },
  });

  const rootComments = comments?.filter((c: any) => !c.parent) ?? [];
  const open = rootComments.filter((c: any) => !c.is_resolved);
  const resolved = rootComments.filter((c: any) => c.is_resolved);
  const visible = tab === "open" ? open : resolved;

  return (
    <div
      className="w-80 flex flex-col h-full shrink-0"
      style={{ borderLeft: "1px solid var(--border)", background: "var(--bg-panel)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
        <h3 className="font-semibold text-sm flex items-center gap-2" style={{ color: "var(--text)" }}>
          <MessageSquare className="w-4 h-4" style={{ color: "var(--accent)" }} />
          Comments
          {open.length > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ background: "var(--accent-bg)", color: "var(--accent)" }}>
              {open.length}
            </span>
          )}
        </h3>
        <button onClick={onClose} className="p-1 rounded-lg transition"
          style={{ color: "var(--text-3)" }}
          onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex px-3 pt-2 gap-1" style={{ borderBottom: "1px solid var(--border)" }}>
        {(["open", "resolved"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-3 py-1.5 text-xs font-medium rounded-t-lg capitalize transition"
            style={{
              color: tab === t ? "var(--accent)" : "var(--text-3)",
              borderBottom: tab === t ? "2px solid var(--accent)" : "2px solid transparent",
              background: "transparent",
            }}>
            {t} {t === "open" ? `(${open.length})` : `(${resolved.length})`}
          </button>
        ))}
      </div>

      {/* Comment list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--text-3)" }} />
          </div>
        ) : visible.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--border-strong)" }} />
            <p className="text-xs" style={{ color: "var(--text-3)" }}>
              {tab === "open" ? "No open comments" : "No resolved comments"}
            </p>
          </div>
        ) : (
          visible.map((c: any) => (
            <CommentItem key={c.id} comment={c} documentId={documentId} />
          ))
        )}
      </div>

      {/* New comment */}
      <div className="p-3" style={{ borderTop: "1px solid var(--border)" }}>
        <textarea
          rows={3}
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && newComment.trim()) addComment.mutate(); }}
          placeholder="Add a comment… (⌘↵ to post)"
          className="w-full text-sm rounded-xl px-3 py-2 outline-none resize-none"
          style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
        />
        <button
          onClick={() => addComment.mutate()}
          disabled={!newComment.trim() || addComment.isPending}
          className="mt-2 w-full text-sm py-2 rounded-xl font-medium disabled:opacity-50 transition flex items-center justify-center gap-2"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          {addComment.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Post comment
        </button>
      </div>
    </div>
  );
}
