"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth.store";
import api from "@/lib/api";
import Link from "next/link";
import { timeAgo } from "@/lib/utils";
import { Clock, FileText, Loader2 } from "lucide-react";

export default function RecentPage() {
  const activeCompanyId = useAuthStore((s) => s.activeCompanyId);

  const { data: docs, isLoading } = useQuery({
    queryKey: ["documents", "recent", activeCompanyId],
    queryFn: async () => {
      const { data } = await api.get("/documents/recent/", {
        params: activeCompanyId ? { company: activeCompanyId } : {},
      });
      return data.results ?? data;
    },
  });

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: "var(--text)" }}>
        <Clock className="w-5 h-5 text-indigo-500" /> Recently Viewed
      </h1>
      <div className="panel rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--text-3)" }} /></div>
        ) : docs?.length === 0 ? (
          <div className="text-center py-16">
            <Clock className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--border-strong)" }} />
            <p className="text-sm" style={{ color: "var(--text-3)" }}>No recent documents</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {docs?.map((doc: any) => (
              <Link key={doc.id} href={`/documents/${doc.id}`} className="flex items-center gap-3 px-4 py-3 transition"
                style={{ color: "inherit" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--bg-hover)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}>
                <span className="text-lg shrink-0">{doc.icon || "📄"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>{doc.title}</p>
                  <p className="text-xs" style={{ color: "var(--text-3)" }}>Updated {timeAgo(doc.updated_at)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
