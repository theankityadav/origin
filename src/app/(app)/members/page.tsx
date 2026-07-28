"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth.store";
import api from "@/lib/api";
import { getInitials, timeAgo } from "@/lib/utils";
import {
  Users, UserPlus, Mail, Loader2, Copy, Link2,
  AlertTriangle, ShieldAlert, X, ChevronDown,
  UserMinus, Shield, Eye, Edit3, Crown, FolderPlus, Trash2, ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";

const ROLES = ["owner", "admin", "editor", "viewer"] as const;
type Role = typeof ROLES[number];

const roleStyle: Record<string, { background: string; color: string }> = {
  owner:  { background: "rgba(139,92,246,0.12)", color: "#7c3aed" },
  admin:  { background: "rgba(239,68,68,0.1)",   color: "#dc2626" },
  editor: { background: "var(--accent-bg)",       color: "var(--accent)" },
  viewer: { background: "var(--bg-subtle)",        color: "var(--text-3)" },
};

const roleIcons: Record<string, React.ElementType> = {
  owner: Crown, admin: Shield, editor: Edit3, viewer: Eye,
};

function MemberDetailDrawer({
  member, canManage, isSelf, isOwner,
  onClose, onRoleChange, onRemove,
}: {
  member: any;
  canManage: boolean;
  isSelf: boolean;
  isOwner: boolean;
  onClose: () => void;
  onRoleChange: (memberId: string, role: Role) => void;
  onRemove: (memberId: string) => void;
}) {
  const [roleOpen, setRoleOpen] = useState(false);
  const RoleIcon = roleIcons[member.role] ?? Eye;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div
        className="w-80 h-full flex flex-col animate-fadeIn overflow-y-auto"
        style={{ background: "var(--bg-panel)", borderLeft: "1px solid var(--border)", boxShadow: "var(--shadow-lg)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <h3 className="font-semibold text-sm" style={{ color: "var(--text)" }}>Member Details</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: "var(--text-3)" }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Avatar + name */}
        <div className="flex flex-col items-center gap-2 pt-8 pb-6 px-5">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold"
            style={{ background: "var(--accent-bg)", color: "var(--accent)" }}>
            {getInitials(member.user?.name || "?")}
          </div>
          <p className="font-semibold text-base text-center" style={{ color: "var(--text)" }}>{member.user?.name}</p>
          <p className="text-sm text-center" style={{ color: "var(--text-3)" }}>{member.user?.email}</p>
          <span className="text-xs font-medium px-3 py-1 rounded-full capitalize flex items-center gap-1.5"
            style={roleStyle[member.role] || roleStyle.viewer}>
            <RoleIcon className="w-3 h-3" /> {member.role}
          </span>
        </div>

        {/* Details */}
        <div className="px-5 space-y-3" style={{ borderTop: "1px solid var(--border)", paddingTop: "1.25rem" }}>
          <DetailRow label="Joined" value={member.joined_at ? timeAgo(member.joined_at) : "—"} />
          <DetailRow label="Last active" value={member.user?.last_active ? timeAgo(member.user.last_active) : "—"} />
          <DetailRow label="Status" value={member.status ?? "active"} />
          {member.team?.name && <DetailRow label="Team" value={member.team.name} />}
        </div>

        {/* Role change — admin/owner only, not self, not changing owner */}
        {canManage && !isSelf && member.role !== "owner" && (
          <div className="px-5 pt-5" style={{ borderTop: "1px solid var(--border)", marginTop: "1.25rem" }}>
            <p className="text-xs font-medium mb-2" style={{ color: "var(--text-3)" }}>Change role</p>
            <div className="relative">
              <button
                onClick={() => setRoleOpen(!roleOpen)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm"
                style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
              >
                <span className="capitalize flex items-center gap-2">
                  {(() => { const I = roleIcons[member.role] ?? Eye; return <I className="w-3.5 h-3.5" style={{ color: (roleStyle[member.role] || roleStyle.viewer).color }} />; })()}
                  {member.role}
                </span>
                <ChevronDown className="w-3.5 h-3.5" style={{ color: "var(--text-3)" }} />
              </button>
              {roleOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 rounded-xl shadow-lg z-10 py-1 overflow-hidden"
                  style={{ background: "var(--bg-panel)", border: "1px solid var(--border)" }}>
                  {ROLES.filter(r => r !== "owner").map(r => {
                    const RI = roleIcons[r] ?? Eye;
                    return (
                      <button key={r} onClick={() => { onRoleChange(member.id, r); setRoleOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm capitalize transition"
                        style={{ color: r === member.role ? "var(--accent)" : "var(--text)", background: r === member.role ? "var(--accent-bg)" : "transparent" }}
                        onMouseEnter={e => { if (r !== member.role) e.currentTarget.style.background = "var(--bg-hover)"; }}
                        onMouseLeave={e => { if (r !== member.role) e.currentTarget.style.background = "transparent"; }}
                      >
                        <RI className="w-3.5 h-3.5" style={{ color: (roleStyle[r] || roleStyle.viewer).color }} /> {r}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Remove */}
        {canManage && !isSelf && member.role !== "owner" && (
          <div className="px-5 pt-4 pb-6 mt-auto">
            <button
              onClick={() => { if (confirm(`Remove ${member.user?.name} from the workspace?`)) onRemove(member.id); }}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition"
              style={{ border: "1px solid rgba(239,68,68,0.3)", color: "var(--danger)", background: "rgba(239,68,68,0.06)" }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(239,68,68,0.12)")}
              onMouseLeave={e => (e.currentTarget.style.background = "rgba(239,68,68,0.06)")}
            >
              <UserMinus className="w-4 h-4" /> Remove member
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-xs" style={{ color: "var(--text-3)" }}>{label}</span>
      <span className="text-xs font-medium capitalize" style={{ color: "var(--text-2)" }}>{value}</span>
    </div>
  );
}

/* ── Teams Section ── */
function TeamsSection({ companyId, members }: { companyId: string; members: any[] }) {
  const qc = useQueryClient();
  const [newTeamName, setNewTeamName] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const { data: teams, isLoading } = useQuery({
    queryKey: ["teams", companyId],
    queryFn: async () => { const { data } = await api.get("/companies/teams/", { params: { company: companyId } }); return data.results ?? data; },
    enabled: !!companyId,
  });

  const createTeam = useMutation({
    mutationFn: () => api.post("/companies/teams/", { name: newTeamName.trim(), company: companyId }),
    onSuccess: () => { toast.success("Team created"); setNewTeamName(""); setAdding(false); qc.invalidateQueries({ queryKey: ["teams", companyId] }); },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Failed to create team"),
  });

  const deleteTeam = useMutation({
    mutationFn: (id: string) => api.delete(`/companies/teams/${id}/`),
    onSuccess: () => { toast.success("Team deleted"); qc.invalidateQueries({ queryKey: ["teams", companyId] }); },
  });

  const assignTeam = useMutation({
    mutationFn: ({ memberId, teamId }: { memberId: string; teamId: string | null }) =>
      api.patch(`/companies/memberships/${memberId}/`, { team: teamId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["members", companyId] }); qc.invalidateQueries({ queryKey: ["teams", companyId] }); },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Failed to assign"),
  });

  return (
    <div className="panel overflow-visible">
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
        <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--text-2)" }}>
          <Users className="w-4 h-4" style={{ color: "var(--accent)" }} /> Teams
        </h2>
        <button onClick={() => setAdding(a => !a)}
          className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg"
          style={{ background: "var(--accent-bg)", color: "var(--accent)" }}>
          <FolderPlus className="w-3.5 h-3.5" /> New Team
        </button>
      </div>

      {adding && (
        <div className="px-4 py-3 flex gap-2" style={{ borderBottom: "1px solid var(--border)" }}>
          <input autoFocus value={newTeamName} onChange={e => setNewTeamName(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && newTeamName.trim()) createTeam.mutate(); if (e.key === "Escape") setAdding(false); }}
            placeholder="Team name e.g. Engineering"
            className="flex-1 text-sm rounded-xl px-3 py-2 outline-none"
            style={{ border: "1px solid var(--border)", background: "var(--bg-subtle)", color: "var(--text)" }} />
          <button onClick={() => createTeam.mutate()} disabled={!newTeamName.trim() || createTeam.isPending}
            className="text-sm px-4 py-2 rounded-xl font-medium disabled:opacity-50"
            style={{ background: "var(--accent)", color: "#fff" }}>
            {createTeam.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create"}
          </button>
          <button onClick={() => setAdding(false)} className="p-2 rounded-xl" style={{ color: "var(--text-3)" }}><X className="w-4 h-4" /></button>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--text-3)" }} /></div>
      ) : teams?.length === 0 ? (
        <div className="text-center py-8">
          <Users className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--border-strong)" }} />
          <p className="text-sm" style={{ color: "var(--text-3)" }}>No teams yet. Create one to group members.</p>
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor: "var(--border)" }}>
          {teams?.map((team: any) => {
            const teamMembers = members.filter((m: any) => m.team === team.id);
            const unassigned = members.filter((m: any) => !m.team);
            const isOpen = expanded === team.id;
            return (
              <div key={team.id}>
                <div className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                  onClick={() => setExpanded(isOpen ? null : team.id)}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  {isOpen ? <ChevronDown className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--text-3)" }} />
                    : <ChevronRight className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--text-3)" }} />}
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: "var(--accent-bg)", color: "var(--accent)" }}>
                    <Users className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{team.name}</p>
                    <p className="text-xs" style={{ color: "var(--text-3)" }}>{teamMembers.length} member{teamMembers.length !== 1 ? "s" : ""}</p>
                  </div>
                  <button onClick={e => { e.stopPropagation(); if (confirm(`Delete team "${team.name}"?`)) deleteTeam.mutate(team.id); }}
                    className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100"
                    style={{ color: "var(--danger)" }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                    onMouseLeave={e => (e.currentTarget.style.opacity = "0.4")}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {isOpen && (
                  <div className="px-4 pb-3 space-y-1 ml-10" style={{ borderTop: "1px solid var(--border)" }}>
                    <p className="text-xs font-medium pt-2 pb-1" style={{ color: "var(--text-3)" }}>Members in this team</p>
                    {teamMembers.length === 0 && (
                      <p className="text-xs" style={{ color: "var(--text-3)" }}>No members assigned yet.</p>
                    )}
                    {teamMembers.map((m: any) => (
                      <div key={m.id} className="flex items-center gap-2 py-1">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                          style={{ background: "var(--accent-bg)", color: "var(--accent)" }}>{getInitials(m.user?.name)}</div>
                        <span className="text-xs flex-1" style={{ color: "var(--text)" }}>{m.user?.name}</span>
                        <button onClick={() => assignTeam.mutate({ memberId: m.id, teamId: null })}
                          className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(239,68,68,0.1)", color: "#dc2626" }}>
                          Remove
                        </button>
                      </div>
                    ))}
                    {unassigned.length > 0 && (
                      <>
                        <p className="text-xs font-medium pt-2 pb-1" style={{ color: "var(--text-3)" }}>Add member to team</p>
                        {unassigned.map((m: any) => (
                          <div key={m.id} className="flex items-center gap-2 py-1">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                              style={{ background: "var(--bg-subtle)", color: "var(--text-3)" }}>{getInitials(m.user?.name)}</div>
                            <span className="text-xs flex-1" style={{ color: "var(--text-2)" }}>{m.user?.name}</span>
                            <button onClick={() => assignTeam.mutate({ memberId: m.id, teamId: team.id })}
                              className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "var(--accent-bg)", color: "var(--accent)" }}>
                              + Add
                            </button>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function MembersPage() {
  const activeCompanyId = useAuthStore((s) => s.activeCompanyId);
  const currentUser = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("editor");
  const [showInvite, setShowInvite] = useState(false);
  const [lastInviteLink, setLastInviteLink] = useState<string | null>(null);
  const [magicLink, setMagicLink] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<any | null>(null);

  const changeRole = useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: Role }) =>
      api.patch(`/companies/memberships/${memberId}/update_role/`, { role }),
    onSuccess: (_, { role }) => {
      toast.success(`Role updated to ${role}`);
      qc.invalidateQueries({ queryKey: ["members", activeCompanyId] });
      setSelectedMember((prev: any) => prev ? { ...prev, role } : null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Failed to update role"),
  });

  const removeMember = useMutation({
    mutationFn: (memberId: string) =>
      api.post(`/companies/memberships/${memberId}/remove/`),
    onSuccess: () => {
      toast.success("Member removed");
      qc.invalidateQueries({ queryKey: ["members", activeCompanyId] });
      setSelectedMember(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Failed to remove member"),
  });

  const { data: company } = useQuery({
    queryKey: ["company", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return null;
      const { data } = await api.get(`/companies/${activeCompanyId}/`);
      return data;
    },
    enabled: !!activeCompanyId,
  });

  const { data: members, isLoading } = useQuery({
    queryKey: ["members", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data } = await api.get(`/companies/${activeCompanyId}/members/`);
      return data.results ?? data;
    },
    enabled: !!activeCompanyId,
  });

  const memberCount = members?.length ?? 0;
  const maxMembers = company?.max_members ?? 50;
  const isAtLimit = memberCount >= maxMembers;
  const isNearLimit = !isAtLimit && memberCount >= maxMembers * 0.8;

  const myMembership = members?.find((m: any) => m.user?.id === currentUser?.id);
  const isAdminOrOwner = ["owner", "admin"].includes(myMembership?.role ?? "");
  const imOwner = myMembership?.role === "owner";

  const { data: invitations } = useQuery({
    queryKey: ["invitations", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data } = await api.get(`/companies/${activeCompanyId}/invitations/`);
      return data.results ?? data;
    },
    enabled: !!activeCompanyId,
  });

  const invite = useMutation({
    mutationFn: () =>
      api.post(`/companies/${activeCompanyId}/invite/`, { email: inviteEmail, role: inviteRole }),
    onSuccess: (res) => {
      toast.success(`Invite sent to ${inviteEmail}`);
      if (res.data?.invite_link) setLastInviteLink(res.data.invite_link);
      setInviteEmail("");
      qc.invalidateQueries({ queryKey: ["invitations"] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Failed to send invite"),
  });

  const getMagicLink = useMutation({
    mutationFn: (reset: boolean) =>
      api.post(`/companies/${activeCompanyId}/invite-link/`, { action: reset ? "reset" : "get" }),
    onSuccess: (res) => setMagicLink(res.data.link),
    onError: () => toast.error("Failed to generate link"),
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: "var(--text)" }}>
            <Users className="w-5 h-5" style={{ color: "var(--accent)" }} /> Members
          </h1>
          {company && (
            <div className="flex items-center gap-3 mt-1.5">
              <div className="flex items-center gap-1.5">
                <div className="w-28 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-subtle)" }}>
                  <div className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (memberCount / maxMembers) * 100)}%`,
                      background: isAtLimit ? "var(--danger)" : isNearLimit ? "#f59e0b" : "var(--accent)",
                    }} />
                </div>
                <span className="text-xs font-medium" style={{ color: isAtLimit ? "var(--danger)" : "var(--text-3)" }}>
                  {memberCount}/{maxMembers}
                </span>
              </div>
            </div>
          )}
        </div>
        {isAdminOrOwner && (
          <button
            onClick={() => isAtLimit ? null : setShowInvite(!showInvite)}
            disabled={isAtLimit}
            className="btn-primary flex items-center gap-1.5 text-sm px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            title={isAtLimit ? "Member limit reached — contact superadmin to increase" : undefined}
          >
            <UserPlus className="w-4 h-4" /> Invite member
          </button>
        )}
      </div>

      {/* Limit warning banners */}
      {isAtLimit && (
        <div className="flex items-start gap-3 rounded-xl px-4 py-3" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}>
          <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--danger)" }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--danger)" }}>Member limit reached ({maxMembers}/{maxMembers})</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>
              You cannot invite more members. Please contact your <strong style={{ color: "var(--text-2)" }}>superadmin</strong> to increase the limit for this company.
            </p>
          </div>
        </div>
      )}
      {isNearLimit && (
        <div className="flex items-start gap-3 rounded-xl px-4 py-3" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)" }}>
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#f59e0b" }} />
          <p className="text-sm" style={{ color: "#92400e" }}>
            <strong>Approaching limit</strong> — {maxMembers - memberCount} seat{maxMembers - memberCount !== 1 ? "s" : ""} remaining. Contact your superadmin if you need more.
          </p>
        </div>
      )}

      {/* Invite form */}
      {showInvite && (
        <div className="panel p-5 space-y-4 animate-fadeUp">
          <h3 className="font-medium text-sm" style={{ color: "var(--text)" }}>Invite via email</h3>
          <div className="flex gap-2">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@company.com"
              className="flex-1 px-3 py-2 text-sm rounded-lg outline-none transition"
              style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg outline-none"
              style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
            >
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
              <option value="admin">Admin</option>
            </select>
            <button
              onClick={() => invite.mutate()}
              disabled={!inviteEmail.trim() || invite.isPending}
              className="btn-primary flex items-center gap-1.5 px-4 py-2 text-sm disabled:opacity-50"
            >
              {invite.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              Send invite
            </button>
          </div>
          {/* Show invite link after sending */}
          {lastInviteLink && (
            <div className="rounded-xl p-3 flex items-center gap-3" style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}>
              <Link2 className="w-4 h-4 shrink-0" style={{ color: "var(--accent)" }} />
              <code className="flex-1 text-xs truncate" style={{ color: "var(--text-3)" }}>{lastInviteLink}</code>
              <button onClick={() => { navigator.clipboard.writeText(lastInviteLink!); toast.success("Copied!"); }}
                className="shrink-0 p-1.5 rounded-lg" style={{ background: "var(--accent-bg)", color: "var(--accent)" }}>
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Magic invite link */}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
            <p className="text-sm font-medium mb-2" style={{ color: "var(--text)" }}>Magic invite link</p>
            <p className="text-xs mb-3" style={{ color: "var(--text-3)" }}>Anyone with this link can join — they set their own password. Username is their email.</p>
            {magicLink ? (
              <div className="rounded-xl p-3 flex items-center gap-3" style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}>
                <code className="flex-1 text-xs truncate" style={{ color: "var(--text-3)" }}>{magicLink}</code>
                <button onClick={() => { navigator.clipboard.writeText(magicLink!); toast.success("Copied!"); }}
                  className="shrink-0 p-1.5 rounded-lg" style={{ background: "var(--accent-bg)", color: "var(--accent)" }}>
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => getMagicLink.mutate(true)} className="text-xs px-2 py-1 rounded-lg" style={{ color: "var(--text-3)", border: "1px solid var(--border)" }}>Reset</button>
              </div>
            ) : (
              <button onClick={() => getMagicLink.mutate(false)} disabled={getMagicLink.isPending}
                className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl" style={{ background: "var(--accent-bg)", color: "var(--accent)" }}>
                {getMagicLink.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
                Generate invite link
              </button>
            )}
          </div>
        </div>
      )}

      {/* Members list */}
      <div className="panel overflow-hidden">
        <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-2)" }}>
            {members?.length || 0} member{members?.length !== 1 ? "s" : ""}
          </h2>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--text-3)" }} /></div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {members?.map((m: any) => {
              const RoleIcon = roleIcons[m.role] ?? Eye;
              const isSelf = m.user?.id === currentUser?.id;
              return (
                <div key={m.id}
                  className="flex items-center gap-4 px-4 py-3 cursor-pointer transition-colors"
                  onClick={() => setSelectedMember(m)}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <div className="w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm shrink-0"
                    style={{ background: "var(--accent-bg)", color: "var(--accent)" }}>
                    {getInitials(m.user?.name || "?")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>{m.user?.name}</p>
                      {isSelf && <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "var(--bg-subtle)", color: "var(--text-3)" }}>you</span>}
                    </div>
                    <p className="text-xs truncate" style={{ color: "var(--text-3)" }}>{m.user?.email}</p>
                  </div>
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full capitalize flex items-center gap-1.5"
                    style={roleStyle[m.role] || roleStyle.viewer}>
                    <RoleIcon className="w-3 h-3" /> {m.role}
                  </span>
                  {m.user?.last_active && (
                    <span className="text-xs hidden sm:block shrink-0" style={{ color: "var(--text-3)" }}>
                      Active {timeAgo(m.user.last_active)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Teams */}
      {isAdminOrOwner && (
        <TeamsSection companyId={activeCompanyId!} members={members ?? []} />
      )}

      {/* Pending invites */}
      {invitations?.length > 0 && (
        <div className="panel overflow-hidden">
          <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
            <h2 className="text-sm font-semibold" style={{ color: "var(--text-2)" }}>Pending Invitations ({invitations.length})</h2>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {invitations.map((inv: any) => (
              <div key={inv.id} className="flex items-center gap-4 px-4 py-3 transition-colors"
                onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: "var(--bg-subtle)", color: "var(--text-3)" }}>
                  <Mail className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--text-2)" }}>{inv.email}</p>
                  <p className="text-xs" style={{ color: "var(--text-3)" }}>Invited by {inv.invited_by?.name}</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: "rgba(245,158,11,0.12)", color: "#d97706" }}>Pending</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Member detail drawer */}
      {selectedMember && (
        <MemberDetailDrawer
          member={selectedMember}
          canManage={isAdminOrOwner}
          isSelf={selectedMember.user?.id === currentUser?.id}
          isOwner={imOwner}
          onClose={() => setSelectedMember(null)}
          onRoleChange={(memberId, role) => changeRole.mutate({ memberId, role })}
          onRemove={(memberId) => removeMember.mutate(memberId)}
        />
      )}
    </div>
  );
}
