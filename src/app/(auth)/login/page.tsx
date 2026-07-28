"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { login } from "@/lib/auth";
import { useAuthStore } from "@/store/auth.store";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useUIStore } from "@/store/ui.store";
import Image from "next/image";

export default function LoginPage() {
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
      const data = await login(form.email, form.password);
      setAuth(data.user, data.access, data.refresh);
      toast.success(`Welcome back, ${data.user.name}!`);
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  const inputCls = [
    "w-full px-4 py-2.5 rounded-xl text-sm transition outline-none",
    "focus:ring-2",
  ].join(" ");

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "var(--bg)" }}
    >
      {/* Background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-20 blur-3xl" style={{ background: "var(--accent)" }} />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full opacity-10 blur-3xl" style={{ background: "var(--accent-2)" }} />
      </div>

      <div className="relative w-full max-w-md animate-fadeUp">
        {/* Logo */}
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
          <p className="text-sm mt-1" style={{ color: "var(--text-3)" }}>where everything begins.</p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8"
          style={{
            background: "var(--bg-panel)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-2)" }}>Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@company.com"
                className={inputCls}
                style={{
                  background: "var(--bg-subtle)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-2)" }}>Password</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  className={inputCls}
                  style={{
                    background: "var(--bg-subtle)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                    paddingRight: "2.75rem",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--text-3)" }}
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="text-right mt-1.5">
                <Link href="/forgot-password" className="text-xs hover:underline" style={{ color: "var(--accent)" }}>
                  Forgot password?
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="text-center text-sm mt-6" style={{ color: "var(--text-3)" }}>
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-semibold hover:underline" style={{ color: "var(--accent)" }}>
              Sign up free
            </Link>
          </p>
          <p className="text-center text-xs mt-3" style={{ color: "var(--text-3)" }}>
            Superadmin?{" "}
            <Link href="/superadmin/login" className="font-semibold hover:underline" style={{ color: "#7c3aed" }}>
              Superadmin portal
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
