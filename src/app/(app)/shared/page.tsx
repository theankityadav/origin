"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth.store";
import api from "@/lib/api";
import Link from "next/link";
import { timeAgo, getInitials } from "@/lib/utils";
import { Share2, Loader2, Search, Users, UserCheck, Building2, Globe } from "lucide-react";

const VISIBILITY_META: Record<string, { label: string; color: string; bg: string; Icon: any }> = {
  company: { label: "Team",   color: "#6366f1", bg: "rgba(99,102,241,0.12)",  Icon: Building2 },
  public:  { label: "Public", color: "#22c55e", bg: "rgba(34,197,94,0.12)",   Icon: Globe     },
  team:    { label: "Team",   color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  Icon: Users     },
};

function OwnerAvatar({ name }: { name: string }) {
  const colors = ["#6366f1","#8b5cf6","#ec4899","#ef4444","#f97316","#22c55e","#14b8a6","#3b82f6"];
  const bg = colors[(name || "?").charCodeAt(0) % colors.length];
  return (
    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
      style={{ background: bg }}>
      {getInitials(name || "?")}
    </div>
  );
}

function DocRow({ doc, isDirectShare }: { doc: any; isDirectShare?: boolean }) {
  const vis = VISIBILITY_META[doc.visibility] ?? VISIBILITY_META.company;
  const Icon = isDirectShare ? UserCheck : vis.Icon;
  const label = isDirectShare ? "Direct" : vis.label;
  const color = isDirectShare ? "#ec4899" : vis.color;
  const bg    = isDirectShare ? "rgba(236,72,153,0.12)" : vis.bg;

  return (
    <Link
      href={`/documents/${doc.id}`}
      className="flex items-center gap-3 px-4 py-3.5 transition-colors group"
      style={{ textDecoration: "none" }}
      onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
    >
      <span className="text-lg shrink-0">{doc.icon || "📄"}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>{doc.title || "Untitled"}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <OwnerAvatar name={doc.owner?.name ?? "?"} />
          <span className="text-xs" style={{ color: "var(--text-3)" }}>
            {doc.owner?.name ?? "Unknown"} · {timeAgo(doc.updated_at)}
          </span>
        </div>
      </div>
      <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full shrink-0 font-medium"
        style={{ background: bg, color }}>
        <Icon className="w-3 h-3" /> {label}
      </span>
    </Link>
  );
}

export default function SharedWithMePage() {
  const user = useAuthStore((s) => s.user);
  const activeCompanyId = useAuthStore((s) => s.activeCompanyId);
  const [tab, setTab] = useState<"team" | "direct">("team");
  const [search, setSearch] = useState("");

  const params = activeCompanyId ? { company: activeCompanyId } : {};

  /* Team / company-wide shared docs */
  const { data: teamDocs, isLoading: loadingTeam } = useQuery({
    queryKey: ["documents", "shared-team", activeCompanyId],
    queryFn: async () => {
      const { data } = await api.get("/documents/", {
        params: { ...params, visibility: "company" },
      });
      const all: any[] = data.results ?? data;
      return all.filter((d: any) => d.owner?.id !== user?.id);
    },
  });

  /* Individually shared (via permissions) — docs not owned by me but visible via permissions */
  const { data: directDocs, isLoading: loadingDirect } = useQuery({
    queryKey: ["documents", "shared-direct", activeCompanyId],
    queryFn: async () => {
      const { data } = await api.get("/documents/", { params });
      const all: any[] = data.results ?? data;
      return all.filter(
        (d: any) =>
          d.owner?.id !== user?.id &&
          d.visibility === "private"
      );
    },
  });

  const list = tab === "team" ? (teamDocs ?? []) : (directDocs ?? []);
  const isLoading = tab === "team" ? loadingTeam : loadingDirect;

  const filtered = list.filter((d: any) =>
    (d.title || "Untitled").toLowerCase().includes(search.toLowerCase())
  );

  const teamCount   = teamDocs?.length ?? 0;
  const directCount = directDocs?.length ?? 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: "var(--text)" }}>
          <Share2 className="w-5 h-5" style={{ color: "#22c55e" }} /> Shared with me
        </h1>
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "var(--text-3)" }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search…"
            className="pl-8 pr-3 py-1.5 text-sm rounded-lg outline-none"
            style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)", width: 200 }}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: "var(--bg-subtle)" }}>
        {([
          { key: "team",   label: "Team / Company", Icon: Building2, count: teamCount },
          { key: "direct", label: "Shared directly", Icon: UserCheck, count: directCount },
        ] as const).map(({ key, label, Icon, count }) => (
          <button key={key} onClick={() => setTab(key)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all"
            style={{
              background: tab === key ? "var(--bg-panel)" : "transparent",
              color: tab === key ? "var(--accent)" : "var(--text-3)",
              boxShadow: tab === key ? "var(--shadow-sm, 0 1px 4px rgba(0,0,0,0.08))" : "none",
            }}>
            <Icon className="w-4 h-4" />
            {label}
            <span className="text-xs px-1.5 py-0.5 rounded-full"
              style={{ background: tab === key ? "var(--accent-bg)" : "var(--bg-hover)", color: tab === key ? "var(--accent)" : "var(--text-3)" }}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* List */}
      <div className="panel overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--text-3)" }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            {tab === "team"
              ? <Building2 className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--border-strong)" }} />
              : <UserCheck className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--border-strong)" }} />
            }
            <p className="text-sm font-medium" style={{ color: "var(--text-2)" }}>
              {search ? "No results found" : tab === "team" ? "No team documents yet" : "No documents shared directly with you"}
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--text-3)" }}>
              {!search && (tab === "team"
                ? "When an admin shares a document with the whole company, it will appear here."
                : "When someone shares a document specifically with you, it will appear here.")}
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {filtered.map((doc: any) => (
              <DocRow key={doc.id} doc={doc} isDirectShare={tab === "direct"} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
