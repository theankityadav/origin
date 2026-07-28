"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth.store";
import api from "@/lib/api";
import { useRouter } from "next/navigation";
import {
  PenTool, Plus, Loader2, Lock, Users, Globe, Eye, Edit3, Trash2, X, ChevronDown, Check,
} from "lucide-react";
import toast from "react-hot-toast";
import { timeAgo } from "@/lib/utils";

const VISIBILITY_OPTIONS = [
  { value: "private", label: "Private", icon: Lock, desc: "Only you" },
  { value: "team",    label: "Team",    icon: Users, desc: "Your team" },
  { value: "company", label: "Company", icon: Users, desc: "Everyone in company" },
  { value: "public",  label: "Public",  icon: Globe, desc: "Anyone with link" },
];

const PERMISSION_LEVELS = [
  { value: "viewer",      label: "Can View" },
  { value: "commenter",   label: "Can Comment" },
  { value: "editor",      label: "Can Edit" },
  { value: "full_access", label: "Full Access" },
];

function NewWireframeModal({ onClose, companyId }: { onClose: () => void; companyId: string }) {
  const qc = useQueryClient();
  const router = useRouter();
  const [title, setTitle] = useState("Untitled Wireframe");
  const [visibility, setVisibility] = useState("private");
  const [permission, setPermission] = useState("viewer");
  const [permOpen, setPermOpen] = useState(false);

  const create = useMutation({
    mutationFn: () => api.post("/documents/", {
      title,
      company: companyId,
      doc_type: "wireframe",
      visibility,
      content: { type: "wireframe", elements: [] },
    }),
    onSuccess: (res) => {
      toast.success("Wireframe created");
      qc.invalidateQueries({ queryKey: ["wireframes", companyId] });
      router.push(`/wireframes/${res.data.id}`);
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Failed to create"),
  });

  const currentPerm = PERMISSION_LEVELS.find(p => p.value === permission);
  const currentVis = VISIBILITY_OPTIONS.find(v => v.value === visibility);
  const VisIcon = currentVis?.icon ?? Lock;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl shadow-2xl"
        style={{ background: "var(--bg-panel)", border: "1px solid var(--border-strong)" }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <h2 className="font-semibold flex items-center gap-2" style={{ color: "var(--text)" }}>
            <PenTool className="w-4 h-4" style={{ color: "var(--accent)" }} /> New Wireframe
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg" style={{ color: "var(--text-3)" }}><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Title */}
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-2)" }}>Title</label>
            <input autoFocus value={title} onChange={e => setTitle(e.target.value)}
              className="w-full text-sm rounded-xl px-3 py-2.5 outline-none"
              style={{ border: "1px solid var(--border)", background: "var(--bg-subtle)", color: "var(--text)" }} />
          </div>

          {/* Visibility */}
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-2)" }}>Access</label>
            <div className="grid grid-cols-2 gap-2">
              {VISIBILITY_OPTIONS.map(({ value, label, icon: Icon, desc }) => (
                <button key={value} onClick={() => setVisibility(value)}
                  className="flex items-center gap-2 p-2.5 rounded-xl border text-left transition text-sm"
                  style={{
                    borderColor: visibility === value ? "var(--accent)" : "var(--border)",
                    background: visibility === value ? "var(--accent-bg)" : "transparent",
                    color: visibility === value ? "var(--accent)" : "var(--text)",
                  }}>
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <div>
                    <p className="font-medium text-xs">{label}</p>
                    <p className="text-[10px]" style={{ color: "var(--text-3)" }}>{desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Permission level — only for non-private */}
          {visibility !== "private" && (
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-2)" }}>
                What can <span className="capitalize">{visibility}</span> members do?
              </label>
              <div className="relative">
                <button onClick={() => setPermOpen(o => !o)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm"
                  style={{ border: "1px solid var(--border)", background: "var(--bg-subtle)", color: "var(--text)" }}>
                  <span className="flex items-center gap-2">
                    {visibility === "viewer" ? <Eye className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
                    {currentPerm?.label}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5" style={{ color: "var(--text-3)" }} />
                </button>
                {permOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl shadow-xl py-1"
                    style={{ background: "var(--bg-panel)", border: "1px solid var(--border-strong)" }}>
                    {PERMISSION_LEVELS.map(p => (
                      <button key={p.value} onClick={() => { setPermission(p.value); setPermOpen(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left"
                        style={{ background: permission === p.value ? "var(--accent-bg)" : "transparent", color: "var(--text)" }}
                        onMouseEnter={e => { if (permission !== p.value) e.currentTarget.style.background = "var(--bg-hover)"; }}
                        onMouseLeave={e => { if (permission !== p.value) e.currentTarget.style.background = "transparent"; }}>
                        {permission === p.value
                          ? <Check className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--accent)" }} />
                          : <span className="w-3.5 h-3.5 shrink-0" />}
                        {p.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <button onClick={() => create.mutate()} disabled={!title.trim() || create.isPending}
            className="w-full py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: "var(--accent)", color: "#fff" }}>
            {create.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><PenTool className="w-4 h-4" /> Create Wireframe</>}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function WireframesPage() {
  const activeCompanyId = useAuthStore(s => s.activeCompanyId);
  const [showModal, setShowModal] = useState(false);
  const qc = useQueryClient();

  const { data: wireframes, isLoading } = useQuery({
    queryKey: ["wireframes", activeCompanyId],
    queryFn: async () => {
      const { data } = await api.get("/documents/", { params: { company: activeCompanyId, doc_type: "wireframe" } });
      return data.results ?? data;
    },
    enabled: !!activeCompanyId,
  });

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/documents/${id}/`),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["wireframes", activeCompanyId] }); },
  });

  const router = useRouter();

  const visIcon = (v: string) => {
    if (v === "public") return <Globe className="w-3 h-3" />;
    if (v === "company" || v === "team") return <Users className="w-3 h-3" />;
    return <Lock className="w-3 h-3" />;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: "var(--text)" }}>
            <PenTool className="w-5 h-5" style={{ color: "var(--accent)" }} /> Wireframes
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-3)" }}>
            Visual mockups and UI flows for your projects
          </p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
          style={{ background: "var(--accent)", color: "#fff" }}>
          <Plus className="w-4 h-4" /> New Wireframe
        </button>
      </div>

      {/* Grid */}
      <div className="panel overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--text-3)" }} /></div>
        ) : wireframes?.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto"
              style={{ background: "var(--accent-bg)" }}>
              <PenTool className="w-6 h-6" style={{ color: "var(--accent)" }} />
            </div>
            <p className="font-semibold" style={{ color: "var(--text)" }}>No wireframes yet</p>
            <p className="text-sm" style={{ color: "var(--text-3)" }}>Create your first wireframe to visually plan your project UI</p>
            <button onClick={() => setShowModal(true)}
              className="mx-auto flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
              style={{ background: "var(--accent)", color: "#fff" }}>
              <Plus className="w-4 h-4" /> Create Wireframe
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {wireframes?.map((wf: any) => (
              <div key={wf.id}
                onClick={() => router.push(`/wireframes/${wf.id}`)}
                className="group relative cursor-pointer rounded-xl overflow-hidden border transition-all hover:shadow-lg"
                style={{ border: "1px solid var(--border)", background: "var(--bg-subtle)" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--accent)")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}>
                {/* Preview area */}
                <div className="h-36 flex items-center justify-center"
                  style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
                  <div className="opacity-20 scale-75 pointer-events-none select-none">
                    {/* Mini wireframe preview */}
                    <div className="w-48 h-28 rounded-lg border-2 p-2 space-y-1.5" style={{ borderColor: "var(--text-3)" }}>
                      <div className="h-3 rounded w-3/4" style={{ background: "var(--text-3)" }} />
                      <div className="h-2 rounded w-full" style={{ background: "var(--border-strong)" }} />
                      <div className="h-2 rounded w-5/6" style={{ background: "var(--border-strong)" }} />
                      <div className="flex gap-1 mt-2">
                        <div className="h-6 rounded flex-1" style={{ background: "var(--text-3)" }} />
                        <div className="h-6 rounded flex-1" style={{ background: "var(--border-strong)" }} />
                      </div>
                    </div>
                  </div>
                </div>
                {/* Info */}
                <div className="px-3 py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>{wf.title}</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>Updated {timeAgo(wf.updated_at)}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 mt-0.5" style={{ color: "var(--text-3)" }}>
                      {visIcon(wf.visibility)}
                      <span className="text-[10px] capitalize">{wf.visibility}</span>
                    </div>
                  </div>
                </div>
                {/* Delete on hover */}
                <button
                  onClick={e => { e.stopPropagation(); if (confirm(`Delete "${wf.title}"?`)) del.mutate(wf.id); }}
                  className="absolute top-2 right-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: "rgba(239,68,68,0.12)", color: "#dc2626" }}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && activeCompanyId && (
        <NewWireframeModal companyId={activeCompanyId} onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}
