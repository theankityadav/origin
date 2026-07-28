"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { X, Check, Link2, Users, Globe, Lock, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

interface Props { doc: any; onClose: () => void; }

const PERMISSION_LEVELS = [
  { value: "viewer", label: "Can View" },
  { value: "commenter", label: "Can Comment" },
  { value: "editor", label: "Can Edit" },
  { value: "full_access", label: "Full Access" },
];

const VISIBILITY_OPTIONS = [
  { value: "private", label: "Private", icon: Lock, desc: "Only people with access" },
  { value: "team", label: "Team", icon: Users, desc: "Everyone in your team" },
  { value: "company", label: "Company", icon: Users, desc: "Everyone in your company" },
  { value: "public", label: "Public link", icon: Globe, desc: "Anyone with the link" },
];

export default function ShareModal({ doc, onClose }: Props) {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [level, setLevel] = useState("viewer");
  const [copied, setCopied] = useState(false);
  const [visibility, setVisibility] = useState(doc?.visibility || "private");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const { data: permissions } = useQuery({
    queryKey: ["permissions", doc?.id],
    queryFn: async () => {
      const { data } = await api.get("/permissions/", { params: { document: doc?.id } });
      return data.results ?? data;
    },
    enabled: !!doc?.id,
  });

  const addPermission = useMutation({
    mutationFn: async () => {
      const { data: users } = await api.get("/auth/profile/");
      return api.post("/permissions/", { document: doc?.id, user_id: users.id, level });
    },
    onSuccess: () => {
      toast.success("Access granted");
      setEmail("");
      qc.invalidateQueries({ queryKey: ["permissions", doc?.id] });
    },
    onError: () => toast.error("Could not find user with that email"),
  });

  const updateVisibility = useMutation({
    mutationFn: (vis: string) => api.patch(`/documents/${doc?.id}/`, { visibility: vis }),
    onSuccess: (_, vis) => {
      setVisibility(vis);
      qc.setQueryData(["document", doc?.id], (old: any) => old ? { ...old, visibility: vis } : old);
      toast.success("Visibility updated");
    },
  });

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/documents/${doc?.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const modal = (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
    >
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div
        style={{
          position: "relative",
          background: "var(--bg-panel)",
          border: "1px solid var(--border)",
          borderRadius: "1rem",
          boxShadow: "0 25px 50px rgba(0,0,0,0.25)",
          width: "100%",
          maxWidth: "540px",
          maxHeight: "calc(100vh - 4rem)",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <h2 className="font-semibold" style={{ color: "var(--text)" }}>Share "{doc?.title}"</h2>
          <button onClick={onClose} className="p-1 rounded-lg transition" style={{ color: "var(--text-3)" }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Visibility */}
          <div>
            <label className="text-sm font-medium mb-2 block" style={{ color: "var(--text-2)" }}>Access level</label>
            <div className="grid grid-cols-2 gap-2">
              {VISIBILITY_OPTIONS.map(({ value, label, icon: Icon, desc }) => (
                <button
                  key={value}
                  onClick={() => updateVisibility.mutate(value)}
                  className="flex items-start gap-2 p-3 rounded-xl border text-left transition"
                  style={{
                    borderColor: visibility === value ? "var(--accent)" : "var(--border)",
                    background: visibility === value ? "var(--accent-bg)" : "transparent",
                  }}
                >
                  <Icon className="w-4 h-4 mt-0.5 shrink-0" style={{ color: visibility === value ? "var(--accent)" : "var(--text-3)" }} />
                  <div>
                    <p className="text-sm font-medium" style={{ color: visibility === value ? "var(--accent)" : "var(--text)" }}>{label}</p>
                    <p className="text-xs" style={{ color: "var(--text-3)" }}>{desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Invite */}
          <div>
            <label className="text-sm font-medium mb-2 block" style={{ color: "var(--text-2)" }}>Invite people</label>
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="flex-1 text-sm rounded-xl px-3 py-2 outline-none"
                style={{ border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)" }}
              />
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="text-sm rounded-xl px-2 py-2 outline-none"
                style={{ border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)" }}
              >
                {PERMISSION_LEVELS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
              <button
                onClick={() => addPermission.mutate()}
                disabled={!email.trim() || addPermission.isPending}
                className="text-sm px-4 py-2 rounded-xl transition disabled:opacity-50"
                style={{ background: "var(--accent)", color: "#fff" }}
              >
                {addPermission.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Invite"}
              </button>
            </div>
          </div>

          {/* Current permissions */}
          {permissions?.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium" style={{ color: "var(--text-2)" }}>People with access</label>
              {permissions.map((p: any) => (
                <div key={p.id} className="flex items-center gap-3 py-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold" style={{ background: "var(--accent-bg)", color: "var(--accent)" }}>
                    {p.user?.name?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>{p.user?.name}</p>
                    <p className="text-xs truncate" style={{ color: "var(--text-3)" }}>{p.user?.email}</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full capitalize" style={{ background: "var(--bg-subtle)", color: "var(--text-2)" }}>
                    {p.level.replace("_", " ")}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Copy link */}
          <button
            onClick={copyLink}
            className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm transition"
            style={{ border: "1px solid var(--border)", color: "var(--text-2)", background: "transparent" }}
          >
            {copied ? <Check className="w-4 h-4" style={{ color: "var(--success)" }} /> : <Link2 className="w-4 h-4" style={{ color: "var(--text-3)" }} />}
            {copied ? "Link copied!" : "Copy link"}
          </button>
        </div>
      </div>
    </div>
  );

  if (!mounted) return null;
  return createPortal(modal, document.body);
}
