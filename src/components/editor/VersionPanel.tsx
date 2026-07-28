"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import {
  X, History, RotateCcw, Loader2, Activity,
  FilePlus, FileEdit, Trash2, ArchiveRestore, Star,
  Lock, Unlock, UserPlus, MessageSquare, GitBranch, ChevronDown, ChevronUp,
} from "lucide-react";
import { timeAgo, getInitials } from "@/lib/utils";
import toast from "react-hot-toast";

function extractText(content: any): string {
  if (!content) return "";
  if (typeof content === "string") return content;
  const nodes: any[] = content?.content ?? [];
  return nodes.flatMap((n: any) => {
    if (n.type === "text") return [n.text ?? ""];
    if (n.content) return [extractText(n)];
    return [];
  }).join(" ").replace(/\s+/g, " ").trim();
}

function DiffView({ prev, curr }: { prev: any; curr: any }) {
  const a = extractText(prev).split(/\s+/).filter(Boolean);
  const b = extractText(curr).split(/\s+/).filter(Boolean);
  const aSet = new Set(a);
  const bSet = new Set(b);
  const removed = a.filter(w => !bSet.has(w)).slice(0, 30);
  const added   = b.filter(w => !aSet.has(w)).slice(0, 30);
  if (!removed.length && !added.length) {
    return <p className="text-xs italic" style={{ color: "var(--text-3)" }}>No text changes detected</p>;
  }
  return (
    <div className="space-y-1.5 text-xs">
      {removed.length > 0 && (
        <div className="rounded-lg p-2" style={{ background: "rgba(239,68,68,0.07)" }}>
          <p className="font-medium mb-1" style={{ color: "var(--danger)" }}>— Removed</p>
          <p style={{ color: "var(--text-2)" }}>{removed.join(" ")}{removed.length === 30 ? "…" : ""}</p>
        </div>
      )}
      {added.length > 0 && (
        <div className="rounded-lg p-2" style={{ background: "rgba(16,185,129,0.07)" }}>
          <p className="font-medium mb-1" style={{ color: "#10b981" }}>+ Added</p>
          <p style={{ color: "var(--text-2)" }}>{added.join(" ")}{added.length === 30 ? "…" : ""}</p>
        </div>
      )}
    </div>
  );
}

interface Props {
  documentId: string;
  onClose: () => void;
}

const ACTION_META: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  created:          { icon: FilePlus,      label: "Created document",     color: "var(--success)" },
  updated:          { icon: FileEdit,      label: "Edited document",      color: "var(--accent)" },
  deleted:          { icon: Trash2,        label: "Deleted document",     color: "var(--danger)" },
  restored:         { icon: ArchiveRestore,label: "Restored document",    color: "var(--success)" },
  archived:         { icon: ArchiveRestore,label: "Archived document",    color: "var(--warning)" },
  unarchived:       { icon: ArchiveRestore,label: "Unarchived document",  color: "var(--accent)" },
  starred:          { icon: Star,          label: "Starred document",     color: "var(--warning)" },
  locked:           { icon: Lock,          label: "Locked document",      color: "var(--danger)" },
  unlocked:         { icon: Unlock,        label: "Unlocked document",    color: "var(--success)" },
  comment_added:    { icon: MessageSquare, label: "Added a comment",      color: "var(--accent-2)" },
  comment_resolved: { icon: MessageSquare, label: "Resolved a comment",   color: "var(--success)" },
  version_restored: { icon: GitBranch,     label: "Restored a version",   color: "var(--accent)" },
  shared:           { icon: UserPlus,      label: "Shared document",      color: "var(--accent)" },
  permission_changed:{ icon: UserPlus,     label: "Changed permissions",  color: "var(--warning)" },
  member_invited:   { icon: UserPlus,      label: "Invited member",       color: "var(--success)" },
  member_removed:   { icon: UserPlus,      label: "Removed member",       color: "var(--danger)" },
};

export default function VersionPanel({ documentId, onClose }: Props) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"activity" | "versions">("activity");
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);

  const { data: activity, isLoading: actLoading } = useQuery({
    queryKey: ["activity", documentId],
    queryFn: async () => {
      const { data } = await api.get(`/activity/?document=${documentId}`);
      return data.results ?? data;
    },
    enabled: !!documentId,
    refetchInterval: 15000,
  });

  const { data: versions, isLoading: verLoading } = useQuery({
    queryKey: ["versions", documentId],
    queryFn: async () => {
      const { data } = await api.get(`/documents/${documentId}/versions/`);
      return data;
    },
    enabled: !!documentId,
  });

  const restore = useMutation({
    mutationFn: (versionId: string) =>
      api.post(`/documents/${documentId}/versions/`, { version_id: versionId }),
    onSuccess: () => {
      toast.success("Version restored");
      qc.invalidateQueries({ queryKey: ["document", documentId] });
      qc.invalidateQueries({ queryKey: ["versions", documentId] });
      qc.invalidateQueries({ queryKey: ["activity", documentId] });
    },
    onError: () => toast.error("Failed to restore version"),
  });

  const tabs = [
    { id: "activity", label: "Activity", icon: Activity },
    { id: "versions", label: "Versions", icon: History },
  ] as const;

  return (
    <div
      className="w-72 flex flex-col h-full shrink-0 animate-fadeIn"
      style={{ borderLeft: "1px solid var(--border)", background: "var(--bg-panel)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
        <h3 className="font-semibold text-sm flex items-center gap-2" style={{ color: "var(--text)" }}>
          <History className="w-4 h-4" style={{ color: "var(--accent)" }} /> Doc History
        </h3>
        <button
          onClick={onClose}
          className="p-1 rounded-lg transition"
          style={{ color: "var(--text-3)" }}
          onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex px-3 pt-2 gap-1" style={{ borderBottom: "1px solid var(--border)" }}>
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg transition-colors"
            style={{
              color: tab === id ? "var(--accent)" : "var(--text-3)",
              borderBottom: tab === id ? "2px solid var(--accent)" : "2px solid transparent",
              background: "transparent",
            }}
          >
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* ── Activity Tab ── */}
        {tab === "activity" && (
          <div className="p-3 space-y-1">
            {actLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--text-3)" }} />
              </div>
            ) : !activity?.length ? (
              <p className="text-xs text-center py-8" style={{ color: "var(--text-3)" }}>No activity yet</p>
            ) : (
              activity.map((entry: any) => {
                const meta = ACTION_META[entry.action] ?? { icon: FileEdit, label: entry.action, color: "var(--text-3)" };
                const Icon = meta.icon;
                return (
                  <div
                    key={entry.id}
                    className="flex gap-3 px-2 py-2.5 rounded-xl transition-colors"
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    {/* Avatar */}
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5"
                      style={{ background: "var(--accent-bg)", color: "var(--accent)" }}
                    >
                      {getInitials(entry.user?.name || "?")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Icon className="w-3 h-3 shrink-0" style={{ color: meta.color }} />
                        <span className="text-xs font-medium" style={{ color: "var(--text)" }}>
                          {entry.user?.name || "Unknown"}
                        </span>
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-2)" }}>
                        {meta.label}
                        {entry.metadata?.version && (
                          <span style={{ color: "var(--text-3)" }}> · v{entry.metadata.version}</span>
                        )}
                        {entry.metadata?.comment && (
                          <span style={{ color: "var(--text-3)" }}>: "{entry.metadata.comment}"</span>
                        )}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>
                        {timeAgo(entry.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── Versions Tab ── */}
        {tab === "versions" && (
          <div className="p-3 space-y-2">
            {verLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--text-3)" }} />
              </div>
            ) : !versions?.length ? (
              <p className="text-xs text-center py-8" style={{ color: "var(--text-3)" }}>No versions yet</p>
            ) : (
              versions.map((v: any, i: number) => {
                const prevVersion = versions[i + 1];
                const isExpanded = expandedVersion === v.id;
                return (
                  <div
                    key={v.id}
                    className="rounded-xl group transition-all overflow-hidden"
                    style={{ background: "var(--bg-subtle)", border: `1px solid ${i === 0 ? "var(--accent)" : "var(--border)"}` }}
                  >
                    <div className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <GitBranch className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--accent)" }} />
                            <p className="text-xs font-semibold" style={{ color: "var(--text)" }}>
                              Version {v.version_number}
                            </p>
                            {i === 0 && (
                              <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                                style={{ background: "var(--accent-bg)", color: "var(--accent)" }}>
                                Current
                              </span>
                            )}
                          </div>
                          {v.change_summary && (
                            <p className="text-xs mt-0.5" style={{ color: "var(--text-2)" }}>{v.change_summary}</p>
                          )}
                          <p className="text-xs mt-1" style={{ color: "var(--text-3)" }}>
                            {v.created_by?.name} · {timeAgo(v.created_at)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {prevVersion && (
                            <button
                              onClick={() => setExpandedVersion(isExpanded ? null : v.id)}
                              title="Show changes"
                              className="p-1.5 rounded-lg transition opacity-0 group-hover:opacity-100"
                              style={{ color: "var(--text-3)", background: "var(--bg-hover)" }}
                            >
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                          )}
                          {i !== 0 && (
                            <button
                              onClick={() => restore.mutate(v.id)}
                              disabled={restore.isPending}
                              title="Restore this version"
                              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition"
                              style={{ color: "var(--accent)", background: "var(--accent-bg)" }}
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    {isExpanded && prevVersion && (
                      <div className="px-3 pb-3 pt-1" style={{ borderTop: "1px solid var(--border)" }}>
                        <p className="text-xs font-medium mb-2" style={{ color: "var(--text-3)" }}>
                          Changes from v{prevVersion.version_number} → v{v.version_number}
                        </p>
                        <DiffView prev={prevVersion.content} curr={v.content} />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
