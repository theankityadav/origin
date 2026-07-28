"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Building2, Plus, Settings, Loader2, Check, X, Copy, Users, Link2, ToggleLeft, ToggleRight, Pencil, Trash2, AlertTriangle, FileText, CreditCard, Crown, CalendarDays, HardDrive, ShieldCheck, Zap, Briefcase, Star } from "lucide-react";
import toast from "react-hot-toast";
import { timeAgo, getInitials } from "@/lib/utils";

/* ─── Company Detail Modal ─────────────────────────────────────────── */
function CompanyModal({ company, onClose }: { company: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"settings" | "members" | "documents" | "payment">("settings");
  const [companyName, setCompanyName] = useState(company.name);
  const [maxMembers, setMaxMembers] = useState(company.max_members);
  const [storageGb, setStorageGb] = useState(company.storage_limit_gb ?? 10);
  const [isActive, setIsActive] = useState(company.is_active);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: pendingInvites } = useQuery({
    queryKey: ["admin-invites", company.id],
    queryFn: async () => { const { data } = await api.get(`/companies/${company.id}/invitations/`); return data; },
  });
  const adminInvite = pendingInvites?.find((i: any) => i.role === "admin" || i.role === "owner") ?? pendingInvites?.[0];
  const [deleteInput, setDeleteInput] = useState("");

  const { data: members, isLoading: loadingMembers } = useQuery({
    queryKey: ["admin-members", company.id],
    queryFn: async () => { const { data } = await api.get(`/companies/${company.id}/members/`); return data; },
    enabled: tab === "members",
  });

  const { data: docs, isLoading: loadingDocs } = useQuery({
    queryKey: ["admin-docs", company.id],
    queryFn: async () => { const { data } = await api.get(`/documents/?company=${company.id}`); return data.results ?? data; },
    enabled: tab === "documents",
  });

  const save = useMutation({
    mutationFn: () => api.patch(`/companies/${company.id}/settings/`, { name: companyName, max_members: maxMembers, storage_limit_gb: storageGb, is_active: isActive }),
    onSuccess: () => { toast.success("Settings saved"); qc.invalidateQueries({ queryKey: ["admin-companies"] }); onClose(); },
    onError: () => toast.error("Failed to save"),
  });

  const deleteCompany = useMutation({
    mutationFn: () => api.delete(`/companies/${company.id}/`),
    onSuccess: () => { toast.success(`"${company.name}" deleted`); qc.invalidateQueries({ queryKey: ["admin-companies"] }); onClose(); },
    onError: () => toast.error("Failed to delete"),
  });

  const getLink = useMutation({
    mutationFn: (reset: boolean) => api.post(`/companies/${company.id}/invite-link/`, { action: reset ? "reset" : "get" }),
    onSuccess: (res) => setInviteLink(res.data.link),
  });

  const roleColor: Record<string, { bg: string; color: string }> = {
    owner:  { bg: "rgba(124,58,237,0.12)", color: "#7c3aed" },
    admin:  { bg: "rgba(239,68,68,0.1)",   color: "#dc2626" },
    editor: { bg: "var(--accent-bg)",       color: "var(--accent)" },
    viewer: { bg: "var(--bg-subtle)",        color: "var(--text-3)" },
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }} onClick={onClose} />

      <div className="panel relative w-full max-w-lg overflow-hidden animate-fadeUp"
        style={{ border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>

        {/* Header */}
        <div className="flex items-center gap-4 p-5" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--accent-bg)" }}>
            <Building2 className="w-5 h-5" style={{ color: "var(--accent)" }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-base truncate" style={{ color: "var(--text)" }}>{company.name}</h2>
              {!isActive && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(239,68,68,0.1)", color: "var(--danger)" }}>Inactive</span>}
            </div>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>
              {company.member_count}/{company.max_members} members · Created {timeAgo(company.created_at)}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: "var(--text-3)" }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-5 pt-3 overflow-x-auto" style={{ borderBottom: "1px solid var(--border)", paddingBottom: "0" }}>
          {([
            { id: "settings",  icon: Settings,    label: "Settings" },
            { id: "members",   icon: Users,        label: "Members" },
            { id: "documents", icon: FileText,     label: "Documents" },
            { id: "payment",   icon: CreditCard,   label: "Payment" },
          ] as const).map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => setTab(id)}
              className="px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors rounded-t-lg flex items-center gap-1.5"
              style={{
                color: tab === id ? "var(--accent)" : "var(--text-3)",
                borderBottom: tab === id ? "2px solid var(--accent)" : "2px solid transparent",
                background: "transparent",
              }}>
              <Icon className="w-3.5 h-3.5" />{label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5">
          {tab === "settings" && (
            <div className="space-y-5">
              {/* Invited admin email */}
              {adminInvite && (
                <div className="rounded-xl p-3 space-y-1" style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.2)" }}>
                  <p className="text-xs font-medium" style={{ color: "var(--text-3)" }}>Invited Admin</p>
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>{adminInvite.email}</p>
                      <p className="text-xs" style={{ color: adminInvite.status === 'accepted' ? '#10b981' : '#f59e0b' }}>
                        {adminInvite.status === 'accepted' ? '✓ Registered' : '⏳ Pending — hasn\'t registered yet'}
                      </p>
                    </div>
                    <button onClick={() => { navigator.clipboard.writeText(adminInvite.email); toast.success("Copied!"); }}
                      className="p-1.5 rounded-lg shrink-0" style={{ background: "var(--accent-bg)", color: "var(--accent)" }}>
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Company name */}
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--text-2)" }}>
                  <Pencil className="w-3 h-3 inline mr-1" />Company Name
                </label>
                <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full text-sm rounded-xl px-3 py-2.5 outline-none font-medium"
                  style={{ border: "1px solid var(--border)", background: "var(--bg-subtle)", color: "var(--text)" }} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--text-2)" }}>Max Members</label>
                  <input type="number" min={1} value={maxMembers} onChange={(e) => setMaxMembers(+e.target.value)}
                    className="w-full text-sm rounded-xl px-3 py-2.5 outline-none"
                    style={{ border: "1px solid var(--border)", background: "var(--bg-subtle)", color: "var(--text)" }} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--text-2)" }}>Storage (GB)</label>
                  <input type="number" min={1} value={storageGb} onChange={(e) => setStorageGb(+e.target.value)}
                    className="w-full text-sm rounded-xl px-3 py-2.5 outline-none"
                    style={{ border: "1px solid var(--border)", background: "var(--bg-subtle)", color: "var(--text)" }} />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}>
                <span className="text-sm font-medium" style={{ color: "var(--text)" }}>Company Active</span>
                <button onClick={() => setIsActive(!isActive)} style={{ color: isActive ? "var(--accent)" : "var(--text-3)" }}>
                  {isActive ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                </button>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium" style={{ color: "var(--text-2)" }}>Magic Invite Link</p>
                <p className="text-xs" style={{ color: "var(--text-3)" }}>Share this link — anyone can join without an email invite.</p>
                {inviteLink ? (
                  <div className="flex items-center gap-2 rounded-xl p-3" style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}>
                    <Link2 className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--accent)" }} />
                    <code className="flex-1 text-xs truncate" style={{ color: "var(--text-3)" }}>{inviteLink}</code>
                    <button onClick={() => { navigator.clipboard.writeText(inviteLink!); toast.success("Copied!"); }}
                      className="p-1.5 rounded-lg shrink-0" style={{ background: "var(--accent-bg)", color: "var(--accent)" }}>
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => getLink.mutate(true)} className="text-xs px-2 py-1 rounded-lg shrink-0"
                      style={{ border: "1px solid var(--border)", color: "var(--text-3)" }}>Reset</button>
                  </div>
                ) : (
                  <button onClick={() => getLink.mutate(false)} disabled={getLink.isPending}
                    className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl"
                    style={{ background: "var(--accent-bg)", color: "var(--accent)" }}>
                    {getLink.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
                    Get Invite Link
                  </button>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <button onClick={() => save.mutate()} disabled={save.isPending || !companyName.trim()}
                  className="btn-primary flex items-center gap-1.5 px-5 py-2.5 text-sm flex-1">
                  {save.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Save Changes
                </button>
                <button onClick={onClose} className="px-4 py-2.5 text-sm rounded-xl"
                  style={{ border: "1px solid var(--border)", color: "var(--text-2)" }}>Cancel</button>
              </div>

              {/* Delete zone */}
              <div className="rounded-xl p-4 mt-2" style={{ border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.04)" }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--danger)" }}>Delete Company</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>Permanently removes the company and all its data.</p>
                  </div>
                  <button onClick={() => setConfirmDelete(!confirmDelete)}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
                    style={{ background: "rgba(239,68,68,0.1)", color: "var(--danger)" }}>
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>

                {confirmDelete && (
                  <div className="mt-4 space-y-3 pt-3" style={{ borderTop: "1px solid rgba(239,68,68,0.2)" }}>
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "var(--danger)" }} />
                      <p className="text-xs" style={{ color: "var(--danger)" }}>
                        Type <strong>{company.name}</strong> to confirm deletion.
                      </p>
                    </div>
                    <input
                      type="text"
                      value={deleteInput}
                      onChange={(e) => setDeleteInput(e.target.value)}
                      placeholder={company.name}
                      className="w-full text-sm rounded-xl px-3 py-2 outline-none"
                      style={{ border: "1px solid rgba(239,68,68,0.4)", background: "var(--bg-subtle)", color: "var(--text)" }}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => deleteCompany.mutate()}
                        disabled={deleteInput !== company.name || deleteCompany.isPending}
                        className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl font-semibold disabled:opacity-40"
                        style={{ background: "var(--danger)", color: "white" }}>
                        {deleteCompany.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        Permanently Delete
                      </button>
                      <button onClick={() => { setConfirmDelete(false); setDeleteInput(""); }}
                        className="text-sm px-4 py-2 rounded-xl"
                        style={{ border: "1px solid var(--border)", color: "var(--text-2)" }}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "members" && (
            <div>
              {loadingMembers ? (
                <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--text-3)" }} /></div>
              ) : !members?.length ? (
                <div className="text-center py-10" style={{ color: "var(--text-3)" }}>No members yet</div>
              ) : (
                <div className="space-y-1">
                  {members.map((m: any) => {
                    const rc = roleColor[m.role] ?? roleColor.viewer;
                    return (
                      <div key={m.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition"
                        style={{ borderRadius: "12px" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                          style={{ background: "var(--accent-bg)", color: "var(--accent)" }}>
                          {getInitials(m.user?.name ?? "?")}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>{m.user?.name}</p>
                          <p className="text-xs truncate" style={{ color: "var(--text-3)" }}>{m.user?.email}</p>
                        </div>
                        <span className="text-xs px-2.5 py-0.5 rounded-full font-medium capitalize shrink-0"
                          style={{ background: rc.bg, color: rc.color }}>{m.role}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {tab === "documents" && (
            <div>
              {loadingDocs ? (
                <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--text-3)" }} /></div>
              ) : !docs?.length ? (
                <div className="text-center py-10">
                  <FileText className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--border-strong)" }} />
                  <p className="text-sm" style={{ color: "var(--text-3)" }}>No documents yet</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-xs font-medium mb-3" style={{ color: "var(--text-3)" }}>{docs.length} document{docs.length !== 1 ? "s" : ""}</p>
                  {docs.map((d: any) => (
                    <div key={d.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition"
                      onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: "var(--bg-subtle)" }}>
                        <FileText className="w-3.5 h-3.5" style={{ color: "var(--text-3)" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>{d.title || "Untitled"}</p>
                        <p className="text-xs" style={{ color: "var(--text-3)" }}>by {d.owner?.name ?? "Unknown"}</p>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full capitalize shrink-0"
                        style={{ background: "var(--bg-subtle)", color: "var(--text-3)" }}>{d.visibility}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "payment" && (
            <div className="space-y-4">
              {/* Active Plan */}
              <div className="rounded-xl p-4" style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.1), rgba(124,58,237,0.08))", border: "1px solid rgba(99,102,241,0.2)" }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--accent)", color: "white" }}>
                    <Crown className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-sm" style={{ color: "var(--text)" }}>Pro Plan</p>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "rgba(16,185,129,0.12)", color: "#10b981" }}>● Active</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg p-3" style={{ background: "var(--bg-panel)", border: "1px solid var(--border)" }}>
                    <p className="text-xs" style={{ color: "var(--text-3)" }}>Billing cycle</p>
                    <p className="text-sm font-semibold mt-0.5" style={{ color: "var(--text)" }}>Monthly</p>
                  </div>
                  <div className="rounded-lg p-3" style={{ background: "var(--bg-panel)", border: "1px solid var(--border)" }}>
                    <p className="text-xs" style={{ color: "var(--text-3)" }}>Amount</p>
                    <p className="text-sm font-semibold mt-0.5" style={{ color: "var(--text)" }}>₹2,999/mo</p>
                  </div>
                </div>
              </div>

              {/* Expiry */}
              <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}>
                <CalendarDays className="w-5 h-5 shrink-0" style={{ color: "var(--accent)" }} />
                <div className="flex-1">
                  <p className="text-xs" style={{ color: "var(--text-3)" }}>Plan renews on</p>
                  <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>Aug 16, 2026</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b" }}>31 days left</span>
              </div>

              {/* Usage */}
              <div className="rounded-xl p-4 space-y-3" style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}>
                <p className="text-xs font-semibold" style={{ color: "var(--text-2)" }}>Plan Usage</p>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span style={{ color: "var(--text-3)" }}><Users className="w-3 h-3 inline mr-1" />Members</span>
                    <span style={{ color: "var(--text)" }}>{company.member_count} / {company.max_members}</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100,(company.member_count/company.max_members)*100)}%`, background: "var(--accent)" }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span style={{ color: "var(--text-3)" }}><HardDrive className="w-3 h-3 inline mr-1" />Storage</span>
                    <span style={{ color: "var(--text)" }}>2.4 GB / {company.storage_limit_gb ?? 10} GB</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100,(2.4/(company.storage_limit_gb??10))*100)}%`, background: "#10b981" }} />
                  </div>
                </div>
              </div>

              {/* Security */}
              <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}>
                <ShieldCheck className="w-5 h-5 shrink-0" style={{ color: "#10b981" }} />
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>Enterprise Security</p>
                  <p className="text-xs" style={{ color: "var(--text-3)" }}>SSO, audit logs, data residency included</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Company Card ──────────────────────────────────────────────────── */
function CompanyCard({ company }: { company: any }) {
  const [open, setOpen] = useState(false);
  const used = company.member_count ?? 0;
  const max = company.max_members ?? 50;
  const pct = Math.min(100, (used / max) * 100);

  return (
    <>
      <div
        onClick={() => setOpen(true)}
        className="panel flex items-center gap-4 p-5 cursor-pointer transition-all"
        style={{ border: "1px solid var(--border)" }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 0 0 3px rgba(91,94,244,0.07)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--accent-bg)" }}>
          <Building2 className="w-5 h-5" style={{ color: "var(--accent)" }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold truncate" style={{ color: "var(--text)" }}>{company.name}</h3>
            {!company.is_active && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(239,68,68,0.1)", color: "var(--danger)" }}>Inactive</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-subtle)" }}>
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct >= 100 ? "var(--danger)" : pct >= 80 ? "#f59e0b" : "var(--accent)" }} />
            </div>
            <p className="text-xs" style={{ color: "var(--text-3)" }}>
              {used}/{max} members · Created {timeAgo(company.created_at)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="text-center">
            <p className="text-lg font-bold leading-none" style={{ color: "var(--text)" }}>{used}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>Members</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold leading-none" style={{ color: "var(--text)" }}>{max}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>Limit</p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); setOpen(true); }}
            className="p-2 rounded-xl transition"
            style={{ background: "var(--bg-subtle)", color: "var(--text-2)" }}
            onMouseEnter={e => { e.stopPropagation(); (e.currentTarget as HTMLElement).style.background = "var(--accent-bg)"; (e.currentTarget as HTMLElement).style.color = "var(--accent)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-subtle)"; (e.currentTarget as HTMLElement).style.color = "var(--text-2)"; }}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {open && <CompanyModal company={company} onClose={() => setOpen(false)} />}
    </>
  );
}

/* ─── Plan definitions ──────────────────────────────────────────────── */
const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "₹0",
    period: "",
    icon: Zap,
    color: "#6b7280",
    gradient: "rgba(107,114,128,0.08)",
    border: "rgba(107,114,128,0.2)",
    maxMembers: 1,
    storageGb: 1,
    historyDays: 7,
    features: ["1 member", "5 documents", "1 GB storage", "7-day history"],
  },
  {
    id: "pro",
    name: "Pro",
    price: "₹23,999",
    period: "/mo",
    icon: Star,
    color: "#6366f1",
    gradient: "rgba(99,102,241,0.08)",
    border: "rgba(99,102,241,0.25)",
    maxMembers: 50,
    storageGb: 10,
    historyDays: 90,
    features: ["50 members", "Unlimited docs", "10 GB storage", "90-day history"],
    popular: true,
  },
  {
    id: "business",
    name: "Business",
    price: "₹93,999",
    period: "/mo",
    icon: Briefcase,
    color: "#7c3aed",
    gradient: "rgba(124,58,237,0.08)",
    border: "rgba(124,58,237,0.25)",
    maxMembers: 200,
    storageGb: 50,
    historyDays: 365,
    features: ["200 members", "Unlimited docs", "50 GB storage", "SSO + analytics"],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    period: "",
    icon: Crown,
    color: "#f59e0b",
    gradient: "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.25)",
    maxMembers: 9999,
    storageGb: 1000,
    historyDays: 9999,
    features: ["Unlimited members", "Unlimited docs", "Unlimited storage", "SCIM · SAML · SLA"],
  },
] as const;

type PlanId = typeof PLANS[number]["id"];

function NewCompanyModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [step, setStep] = useState<"plan" | "details">("plan");
  const [selectedPlan, setSelectedPlan] = useState<PlanId>("pro");
  const [name, setName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const plan = PLANS.find((p) => p.id === selectedPlan)!;

  const create = useMutation({
    mutationFn: async () => {
      const { data: company } = await api.post("/companies/", {
        name,
        max_members: plan.maxMembers,
        storage_limit_gb: plan.storageGb,
      });
      if (adminEmail.trim()) {
        const { data: inv } = await api.post(`/companies/${company.id}/invite/`, {
          email: adminEmail.trim().toLowerCase(),
          role: "admin",
        });
        return { company, invite_link: inv.invite_link };
      }
      return { company, invite_link: null };
    },
    onSuccess: ({ invite_link }) => {
      qc.invalidateQueries({ queryKey: ["admin-companies"] });
      if (invite_link) {
        setInviteLink(invite_link);
        toast.success("Company created! Share invite link with admin.");
      } else {
        toast.success("Company created");
        onClose();
      }
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Failed to create company"),
  });

  const Overlay = () => (
    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }} onClick={onClose} />
  );

  /* ── Success screen ── */
  if (inviteLink) return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <Overlay />
      <div className="panel relative w-full max-w-md p-6 space-y-4 animate-fadeUp" style={{ border: "1px solid var(--border)" }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(16,185,129,0.1)" }}>
          <Check className="w-5 h-5" style={{ color: "#10b981" }} />
        </div>
        <div>
          <h2 className="text-lg font-semibold" style={{ color: "var(--text)" }}>Company Created!</h2>
          <p className="text-sm mt-1" style={{ color: "var(--text-3)" }}>
            Share this invite link with <strong style={{ color: "var(--text-2)" }}>{adminEmail}</strong>.
            They will <strong style={{ color: "var(--text-2)" }}>set their own password</strong> when they open it.
          </p>
        </div>

        {/* How it works */}
        <div className="rounded-xl p-4 space-y-2" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)" }}>
          <p className="text-xs font-semibold" style={{ color: "#f59e0b" }}>How does the admin login?</p>
          <ol className="text-xs space-y-1 list-decimal list-inside" style={{ color: "var(--text-3)" }}>
            <li>Send them the invite link below</li>
            <li>They open it, enter their email <strong style={{ color: "var(--text-2)" }}>{adminEmail}</strong> and choose a password</li>
            <li>They can then login at <strong style={{ color: "var(--text-2)" }}>origin.codesolution.in/login</strong></li>
          </ol>
        </div>

        {/* Invite link */}
        <div className="flex items-center gap-2 rounded-xl p-3" style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}>
          <code className="flex-1 text-xs truncate" style={{ color: "var(--text-3)" }}>{inviteLink}</code>
          <button onClick={() => { navigator.clipboard.writeText(inviteLink!); toast.success("Link copied!"); }}
            className="p-1.5 rounded-lg shrink-0" style={{ background: "var(--accent-bg)", color: "var(--accent)" }}>
            <Copy className="w-3.5 h-3.5" />
          </button>
        </div>
        <button onClick={onClose} className="btn-primary w-full py-2.5 text-sm">Done</button>
      </div>
    </div>
  );

  /* ── Step 1: Plan picker ── */
  if (step === "plan") return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <Overlay />
      <div className="panel relative w-full max-w-2xl animate-fadeUp" style={{ border: "1px solid var(--border)", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
        <div className="flex items-center justify-between p-5" style={{ borderBottom: "1px solid var(--border)" }}>
          <div>
            <h2 className="text-lg font-bold" style={{ color: "var(--text)" }}>Choose a Plan</h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>Select the plan for this company</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: "var(--text-3)" }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 grid grid-cols-2 gap-3 overflow-y-auto">
          {PLANS.map((p) => {
            const Icon = p.icon;
            const active = selectedPlan === p.id;
            return (
              <button key={p.id} onClick={() => setSelectedPlan(p.id)}
                className="relative text-left rounded-2xl p-4 transition-all"
                style={{
                  background: active ? p.gradient : "var(--bg-subtle)",
                  border: `2px solid ${active ? p.color : "var(--border)"}`,
                  boxShadow: active ? `0 0 0 4px ${p.color}18` : "none",
                }}>
                {"popular" in p && p.popular && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-xs px-2.5 py-0.5 rounded-full font-semibold text-white"
                    style={{ background: p.color }}>Most Popular</span>
                )}
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${p.color}20`, color: p.color }}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-sm leading-none" style={{ color: "var(--text)" }}>{p.name}</p>
                    <p className="text-xs mt-0.5 font-semibold" style={{ color: p.color }}>
                      {p.price}<span className="font-normal" style={{ color: "var(--text-3)" }}>{p.period}</span>
                    </p>
                  </div>
                </div>
                <ul className="space-y-1">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-2)" }}>
                      <Check className="w-3 h-3 shrink-0" style={{ color: p.color }} />{f}
                    </li>
                  ))}
                </ul>
                {active && (
                  <div className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: p.color }}>
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex gap-2 p-5 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
          <button onClick={() => setStep("details")}
            className="btn-primary flex-1 flex items-center justify-center gap-2 py-2.5 text-sm">
            Continue with {plan.name} <span style={{ opacity: 0.7 }}>→</span>
          </button>
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-xl"
            style={{ border: "1px solid var(--border)", color: "var(--text-2)" }}>Cancel</button>
        </div>
      </div>
    </div>
  );

  /* ── Step 2: Company details ── */
  const Icon = plan.icon;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <Overlay />
      <div className="panel relative w-full max-w-md animate-fadeUp" style={{ border: "1px solid var(--border)" }}>
        {/* Header */}
        <div className="flex items-center gap-3 p-5" style={{ borderBottom: "1px solid var(--border)" }}>
          <button onClick={() => setStep("plan")} className="p-1.5 rounded-lg text-sm" style={{ color: "var(--text-3)", border: "1px solid var(--border)" }}>←</button>
          <div className="flex-1">
            <h2 className="text-base font-bold" style={{ color: "var(--text)" }}>Company Details</h2>
            <p className="text-xs" style={{ color: "var(--text-3)" }}>Step 2 of 2</p>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
            style={{ background: `${plan.color}15`, color: plan.color }}>
            <Icon className="w-3.5 h-3.5" />{plan.name}
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Plan summary */}
          <div className="rounded-xl p-3 flex items-center gap-3" style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}>
            <div className="grid grid-cols-3 gap-3 w-full text-center">
              <div>
                <p className="text-xs font-bold" style={{ color: "var(--text)" }}>{plan.maxMembers >= 9999 ? "∞" : plan.maxMembers}</p>
                <p className="text-xs" style={{ color: "var(--text-3)" }}>Members</p>
              </div>
              <div>
                <p className="text-xs font-bold" style={{ color: "var(--text)" }}>{plan.storageGb >= 1000 ? "∞" : `${plan.storageGb} GB`}</p>
                <p className="text-xs" style={{ color: "var(--text-3)" }}>Storage</p>
              </div>
              <div>
                <p className="text-xs font-bold" style={{ color: "var(--text)" }}>{plan.historyDays >= 9999 ? "∞" : `${plan.historyDays}d`}</p>
                <p className="text-xs" style={{ color: "var(--text-3)" }}>History</p>
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block" style={{ color: "var(--text-2)" }}>Company Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Corp"
              className="w-full text-sm rounded-xl px-3 py-2.5 outline-none"
              style={{ border: "1px solid var(--border)", background: "var(--bg-subtle)", color: "var(--text)" }} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block" style={{ color: "var(--text-2)" }}>
              Admin Email <span className="font-normal" style={{ color: "var(--text-3)" }}>(invite will be sent)</span>
            </label>
            <input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="admin@company.com"
              className="w-full text-sm rounded-xl px-3 py-2.5 outline-none"
              style={{ border: "1px solid var(--border)", background: "var(--bg-subtle)", color: "var(--text)" }} />
          </div>
        </div>

        <div className="flex gap-2 px-5 pb-5">
          <button onClick={() => create.mutate()} disabled={!name.trim() || create.isPending}
            className="btn-primary flex-1 flex items-center justify-center gap-2 py-2.5 text-sm">
            {create.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Create Company
          </button>
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-xl"
            style={{ border: "1px solid var(--border)", color: "var(--text-2)" }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [showNew, setShowNew] = useState(false);

  const { data: companies, isLoading } = useQuery({
    queryKey: ["admin-companies"],
    queryFn: async () => { const { data } = await api.get("/companies/"); return data.results ?? data; },
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: "var(--text)" }}>
            <Building2 className="w-6 h-6" style={{ color: "var(--accent)" }} /> Company Management
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-3)" }}>Superadmin · Manage all companies, limits and invite links</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary flex items-center gap-1.5 px-4 py-2 text-sm">
          <Plus className="w-4 h-4" /> New Company
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--text-3)" }} /></div>
      ) : companies?.length === 0 ? (
        <div className="text-center py-16 panel" style={{ border: "1px dashed var(--border)" }}>
          <Building2 className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--text-3)" }} />
          <p style={{ color: "var(--text-3)" }}>No companies yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {companies?.map((c: any) => <CompanyCard key={c.id} company={c} />)}
        </div>
      )}

      {showNew && <NewCompanyModal onClose={() => setShowNew(false)} />}
    </div>
  );
}
