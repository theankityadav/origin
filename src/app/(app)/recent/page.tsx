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
      <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
        <Clock className="w-5 h-5 text-indigo-500" /> Recently Viewed
      </h1>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
        ) : docs?.length === 0 ? (
          <div className="text-center py-16">
            <Clock className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No recent documents</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {docs?.map((doc: any) => (
              <Link key={doc.id} href={`/documents/${doc.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition">
                <span className="text-lg shrink-0">{doc.icon || "📄"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{doc.title}</p>
                  <p className="text-xs text-gray-400">Updated {timeAgo(doc.updated_at)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
