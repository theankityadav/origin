"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useUIStore } from "@/store/ui.store";
import Image from "next/image";

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const theme = useUIStore((s) => s.theme);
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/superadmin/login/", form);
      setAuth(data.user, data.access, data.refresh);
      toast.success(`Welcome, ${data.user.name}!`);
      router.push("/admin");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full px-4 py-2.5 rounded-xl text-sm outline-none transition";

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--bg)" }}>
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-15 blur-3xl" style={{ background: "#7c3aed" }} />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-10 blur-3xl" style={{ background: "#6366f1" }} />
      </div>

      <div className="relative w-full max-w-md animate-fadeUp">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-2">
            <Image
              src={theme === "dark" ? "/dark_logoo.png" : "/light_logoo.png"}
              alt="Origin"
              width={140}
              height={40}
              className="object-contain"
              priority
            />
          </div>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-3)" }}>where everything begins.</p>
          <p className="text-xs mt-2 px-3 py-1 rounded-full inline-block font-medium"
            style={{ background: "rgba(124,58,237,0.1)", color: "#7c3aed" }}>
            🔒 Superadmin Portal — restricted access
          </p>
        </div>

        <div className="rounded-2xl p-8" style={{ background: "var(--bg-panel)", border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)" }}>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-2)" }}>Email</label>
              <input
                type="email" required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="superadmin@company.com"
                className={inputCls}
                style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-2)" }}>Password</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"} required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  className={inputCls}
                  style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)", paddingRight: "2.75rem" }}
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-3)" }}>
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-2.5 text-sm font-semibold rounded-xl text-white flex items-center justify-center gap-2 disabled:opacity-60 transition"
              style={{ background: "linear-gradient(135deg,#7c3aed,#6366f1)" }}>
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</> : "Sign in as Superadmin"}
            </button>
          </form>

          <p className="text-center text-xs mt-5" style={{ color: "var(--text-3)" }}>
            Regular user?{" "}
            <a href="/login" className="font-semibold hover:underline" style={{ color: "var(--accent)" }}>Go to user login</a>
          </p>
        </div>
      </div>
    </div>
  );
}
