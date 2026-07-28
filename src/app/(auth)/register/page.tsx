"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { register } from "@/lib/auth";
import { useAuthStore } from "@/store/auth.store";
import { Eye, EyeOff, FileText, Loader2 } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [form, setForm] = useState({ name: "", email: "", password: "", password2: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.password2) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const data = await register(form.email, form.name, form.password, form.password2);
      setAuth(data.user, data.access, data.refresh);
      router.push("/onboarding");
    } catch (err: any) {
      const errors = err?.response?.data;
      const msg = errors?.email?.[0] || errors?.password?.[0] || errors?.detail || "Registration failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    background: "var(--bg-subtle)",
    border: "1px solid var(--border)",
    color: "var(--text)",
  };
  const inputCls = "w-full px-4 py-2.5 rounded-xl text-sm transition outline-none focus:ring-2";

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--bg)" }}>
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-20 blur-3xl" style={{ background: "var(--accent)" }} />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full opacity-10 blur-3xl" style={{ background: "var(--accent-2)" }} />
      </div>

      <div className="relative w-full max-w-md animate-fadeUp">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4" style={{ background: "var(--accent)", boxShadow: "0 8px 32px rgba(91,94,244,0.35)" }}>
            <FileText className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Create your account</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-3)" }}>Start documenting with your team</p>
        </div>

        <div className="rounded-2xl p-8" style={{ background: "var(--bg-panel)", border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)" }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-2)" }}>Full name</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ankit Yadav"
                className={inputCls}
                style={inputStyle}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-2)" }}>Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@company.com"
                className={inputCls}
                style={inputStyle}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-2)" }}>Password</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  required
                  minLength={8}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Min 8 characters"
                  className={inputCls}
                  style={{ ...inputStyle, paddingRight: "2.75rem" }}
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-3)" }}>
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-2)" }}>Confirm password</label>
              <input
                type="password"
                required
                value={form.password2}
                onChange={(e) => setForm({ ...form, password2: e.target.value })}
                placeholder="Re-enter password"
                className={inputCls}
                style={inputStyle}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 text-sm flex items-center justify-center gap-2 mt-2 disabled:opacity-60"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className="text-center text-sm mt-6" style={{ color: "var(--text-3)" }}>
            Already have an account?{" "}
            <Link href="/login" className="font-semibold hover:underline" style={{ color: "var(--accent)" }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
