"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth.store";
import api from "@/lib/api";
import Link from "next/link";
import { timeAgo } from "@/lib/utils";
import { Archive, FileText, Loader2, RotateCcw } from "lucide-react";
import toast from "react-hot-toast";

export default function ArchivedPage() {
  const activeCompanyId = useAuthStore((s) => s.activeCompanyId);
  const queryClient = useQueryClient();

  const { data: docs, isLoading } = useQuery({
    queryKey: ["documents", "archived", activeCompanyId],
    queryFn: async () => {
      const { data } = await api.get("/documents/", {
        params: {
          is_archived: true,
          ...(activeCompanyId ? { company: activeCompanyId } : {}),
        },
      });
      return data.results ?? data;
    },
  });

  const unarchive = useMutation({
    mutationFn: (id: string) => api.post(`/documents/${id}/archive/`),
    onSuccess: () => {
      toast.success("Document unarchived");
      queryClient.invalidateQueries({ queryKey: ["documents", "archived"] });
    },
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: "var(--text)" }}>
        <Archive className="w-5 h-5" style={{ color: "var(--text-3)" }} /> Archived
      </h1>

      <div className="panel overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--text-3)" }} />
          </div>
        ) : !docs || docs.length === 0 ? (
          <div className="text-center py-16">
            <Archive className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--border-strong)" }} />
            <p className="text-sm" style={{ color: "var(--text-2)" }}>No archived documents</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-3)" }}>Archived documents will appear here</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {docs.map((doc: any) => (
              <div key={doc.id} className="flex items-center gap-3 px-4 py-3.5 transition-colors group"
                onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <span className="text-lg shrink-0">{doc.icon || "📄"}</span>
                <Link href={`/documents/${doc.id}`} className="flex-1 min-w-0" style={{ textDecoration: "none" }}>
                  <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>{doc.title || "Untitled"}</p>
                  <p className="text-xs" style={{ color: "var(--text-3)" }}>Archived {timeAgo(doc.updated_at)}</p>
                </Link>
                <button
                  onClick={() => unarchive.mutate(doc.id)}
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                  style={{ background: "var(--bg-subtle)", color: "var(--text-2)", border: "1px solid var(--border)" }}
                  title="Unarchive"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Restore
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
