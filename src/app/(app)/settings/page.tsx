"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth.store";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { Settings, User, Lock, Bell, Building2, Loader2, ShieldCheck, ShieldOff, QrCode, KeyRound, CheckCircle2 } from "lucide-react";

type Tab = "profile" | "password" | "security" | "workspace";

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [tab, setTab] = useState<Tab>("profile");
  const [name, setName] = useState(user?.name || "");
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const qc = useQueryClient();

  const updateProfile = useMutation({
    mutationFn: () => api.patch("/auth/profile/", { name }),
    onSuccess: ({ data }) => {
      setUser(data);
      toast.success("Profile updated");
    },
  });

  const changePassword = useMutation({
    mutationFn: () => api.post("/auth/change-password/", { current_password: currentPw, new_password: newPw }),
    onSuccess: () => {
      toast.success("Password changed");
      setCurrentPw("");
      setNewPw("");
    },
    onError: (err: any) => toast.error(err?.response?.data?.current_password?.[0] || "Failed to change password"),
  });

  const [totpStep, setTotpStep] = useState<"idle" | "scan" | "confirm" | "done">("idle");
  const [totpData, setTotpData] = useState<{ secret: string; uri: string } | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [disableCode, setDisableCode] = useState("");

  const setup2FA = useMutation({
    mutationFn: () => api.post("/auth/2fa/setup/"),
    onSuccess: ({ data }) => { setTotpData(data); setTotpStep("scan"); },
  });
  const confirm2FA = useMutation({
    mutationFn: () => api.post("/auth/2fa/confirm/", { code: totpCode }),
    onSuccess: () => { toast.success("2FA enabled!"); setTotpStep("done"); qc.invalidateQueries({ queryKey: ["me"] }); },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Invalid code"),
  });
  const disable2FA = useMutation({
    mutationFn: () => api.post("/auth/2fa/disable/", { code: disableCode }),
    onSuccess: () => { toast.success("2FA disabled"); setTotpStep("idle"); setDisableCode(""); qc.invalidateQueries({ queryKey: ["me"] }); },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Invalid code"),
  });

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "profile",  label: "Profile",  icon: User },
    { id: "password", label: "Password", icon: Lock },
    { id: "security", label: "Security",  icon: ShieldCheck },
    { id: "workspace",label: "Workspace", icon: Building2 },
  ];

  const inputCls = "w-full px-3 py-2.5 rounded-xl text-sm outline-none focus:ring-2 transition";
  const inputStyle = { background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" };
  const labelCls = "block text-sm font-medium mb-1.5";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: "var(--text)" }}>
        <Settings className="w-5 h-5" style={{ color: "var(--accent)" }} /> Settings
      </h1>

      <div className="flex gap-6">
        {/* Sidebar tabs */}
        <div className="w-44 shrink-0">
          <nav className="space-y-1">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left"
                style={{
                  background: tab === id ? "var(--accent-bg)" : "transparent",
                  color: tab === id ? "var(--accent)" : "var(--text-2)",
                  fontWeight: tab === id ? 600 : 400,
                }}
              >
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 panel p-6">
          {tab === "profile" && (
            <div className="space-y-5">
              <h2 className="font-semibold" style={{ color: "var(--text)" }}>Profile Settings</h2>
              <div>
                <label className={labelCls} style={{ color: "var(--text-2)" }}>Full name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className={labelCls} style={{ color: "var(--text-2)" }}>Email</label>
                <input value={user?.email} readOnly className={inputCls}
                  style={{ ...inputStyle, background: "var(--bg-hover)", color: "var(--text-3)", cursor: "not-allowed" }} />
              </div>
              <div>
                <label className={labelCls} style={{ color: "var(--text-2)" }}>Role</label>
                <span className="inline-block px-3 py-1.5 text-sm rounded-xl capitalize"
                  style={{ background: "var(--accent-bg)", color: "var(--accent)" }}>{user?.role}</span>
              </div>
              <button onClick={() => updateProfile.mutate()} disabled={updateProfile.isPending}
                className="btn-primary flex items-center gap-2 px-5 py-2 text-sm disabled:opacity-50">
                {updateProfile.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Save changes
              </button>
            </div>
          )}

          {tab === "password" && (
            <div className="space-y-5">
              <h2 className="font-semibold" style={{ color: "var(--text)" }}>Change Password</h2>
              <div>
                <label className={labelCls} style={{ color: "var(--text-2)" }}>Current password</label>
                <input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className={labelCls} style={{ color: "var(--text-2)" }}>New password</label>
                <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} minLength={8} className={inputCls} style={inputStyle} />
              </div>
              <button onClick={() => changePassword.mutate()} disabled={!currentPw || !newPw || changePassword.isPending}
                className="btn-primary flex items-center gap-2 px-5 py-2 text-sm disabled:opacity-50">
                {changePassword.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Update password
              </button>
            </div>
          )}

          {tab === "security" && (
            <div className="space-y-5">
              <h2 className="font-semibold" style={{ color: "var(--text)" }}>Two-Factor Authentication</h2>
              <p className="text-sm" style={{ color: "var(--text-3)" }}>Add an extra layer of security using an authenticator app (Google Authenticator, Authy, etc.)</p>

              {/* Status badge */}
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: user?.totp_enabled ? "rgba(16,185,129,0.08)" : "var(--bg-subtle)", border: `1px solid ${user?.totp_enabled ? "rgba(16,185,129,0.2)" : "var(--border)"}` }}>
                {user?.totp_enabled
                  ? <><CheckCircle2 className="w-5 h-5" style={{ color: "#10b981" }} /><span className="text-sm font-medium" style={{ color: "#10b981" }}>2FA is enabled</span></>
                  : <><ShieldOff className="w-5 h-5" style={{ color: "var(--text-3)" }} /><span className="text-sm" style={{ color: "var(--text-3)" }}>2FA is not enabled</span></>}
              </div>

              {!user?.totp_enabled && totpStep === "idle" && (
                <button onClick={() => setup2FA.mutate()} disabled={setup2FA.isPending}
                  className="btn-primary flex items-center gap-2 px-5 py-2 text-sm disabled:opacity-50">
                  {setup2FA.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
                  Set up 2FA
                </button>
              )}

              {totpStep === "scan" && totpData && (
                <div className="space-y-4">
                  <p className="text-sm" style={{ color: "var(--text-2)" }}>Scan this QR code with your authenticator app:</p>
                  <div className="p-4 rounded-xl inline-block" style={{ background: "white" }}>
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(totpData.uri)}`}
                      alt="TOTP QR Code" width={180} height={180}
                    />
                  </div>
                  <p className="text-xs" style={{ color: "var(--text-3)" }}>Or enter manually: <code className="px-1.5 py-0.5 rounded" style={{ background: "var(--bg-subtle)", color: "var(--accent)" }}>{totpData.secret}</code></p>
                  <div className="space-y-2">
                    <label className={labelCls} style={{ color: "var(--text-2)" }}>Enter the 6-digit code from your app</label>
                    <input value={totpCode} onChange={e => setTotpCode(e.target.value)} maxLength={6} placeholder="000000"
                      className={inputCls} style={inputStyle} />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => confirm2FA.mutate()} disabled={totpCode.length !== 6 || confirm2FA.isPending}
                      className="btn-primary flex items-center gap-2 px-5 py-2 text-sm disabled:opacity-50">
                      {confirm2FA.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />} Verify & Enable
                    </button>
                    <button onClick={() => { setTotpStep("idle"); setTotpData(null); setTotpCode(""); }}
                      className="px-4 py-2 text-sm rounded-xl" style={{ border: "1px solid var(--border)", color: "var(--text-2)" }}>Cancel</button>
                  </div>
                </div>
              )}

              {(totpStep === "done" || user?.totp_enabled) && (
                <div className="space-y-3">
                  <p className="text-sm font-medium" style={{ color: "var(--text)" }}>Disable 2FA</p>
                  <input value={disableCode} onChange={e => setDisableCode(e.target.value)} maxLength={6} placeholder="Enter current 6-digit code"
                    className={inputCls} style={inputStyle} />
                  <button onClick={() => disable2FA.mutate()} disabled={disableCode.length !== 6 || disable2FA.isPending}
                    className="flex items-center gap-2 px-5 py-2 text-sm rounded-xl font-medium disabled:opacity-50"
                    style={{ background: "rgba(239,68,68,0.1)", color: "var(--danger)" }}>
                    {disable2FA.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldOff className="w-4 h-4" />} Disable 2FA
                  </button>
                </div>
              )}
            </div>
          )}

          {tab === "workspace" && (
            <div className="space-y-5">
              <h2 className="font-semibold" style={{ color: "var(--text)" }}>Workspace Settings</h2>
              <p className="text-sm" style={{ color: "var(--text-3)" }}>Configure your company workspace preferences.</p>
              <div className="p-6 rounded-xl text-center" style={{ background: "var(--bg-subtle)", border: "1px dashed var(--border)" }}>
                <Building2 className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--border-strong)" }} />
                <p className="text-sm" style={{ color: "var(--text-3)" }}>Workspace settings coming soon</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
