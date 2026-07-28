"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { Loader2, Building2, CheckCircle2, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";

function JoinPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const setActiveCompany = useAuthStore((s) => s.setActiveCompany);

  const token = searchParams.get("token");
  const linkToken = searchParams.get("link_token");
  const companyParam = searchParams.get("company");

  const [info, setInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const lookup = async () => {
      try {
        const params: any = {};
        if (token) params.token = token;
        if (linkToken) { params.link_token = linkToken; params.company = companyParam; }
        const { data } = await api.get("/companies/invite/lookup/", { params });
        setInfo(data);
        if (data.email) setName(data.email.split("@")[0]);
      } catch (e: any) {
        setError(e?.response?.data?.detail || "Invalid or expired invite link.");
      } finally {
        setLoading(false);
      }
    };
    if (token || linkToken) lookup();
    else { setError("No invite token found."); setLoading(false); }
  }, [token, linkToken, companyParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setSubmitting(true);
    try {
      const body: any = { password, name };
      if (token) body.token = token;
      if (linkToken) { body.link_token = linkToken; body.company_id = companyParam; body.email = info?.email || email; }
      const { data } = await api.post("/companies/invite/accept/", body);
      setAuth(data.user, data.access, data.refresh);
      setActiveCompany(data.company_id);
      setDone(true);
      setTimeout(() => router.replace("/dashboard"), 1500);
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--accent)" }} />
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--bg)" }}>
      <div className="text-center max-w-sm">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(239,68,68,0.1)" }}>
          <Building2 className="w-7 h-7" style={{ color: "var(--danger)" }} />
        </div>
        <h1 className="text-xl font-bold mb-2" style={{ color: "var(--text)" }}>Invalid Invite</h1>
        <p className="text-sm mb-6" style={{ color: "var(--text-3)" }}>{error}</p>
        <button onClick={() => router.push("/login")} className="btn-primary px-6 py-2 text-sm">Go to Login</button>
      </div>
    </div>
  );

  if (done) return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--bg)" }}>
      <div className="text-center">
        <CheckCircle2 className="w-14 h-14 mx-auto mb-4" style={{ color: "var(--success)" }} />
        <h1 className="text-xl font-bold mb-2" style={{ color: "var(--text)" }}>You're in!</h1>
        <p className="text-sm" style={{ color: "var(--text-3)" }}>Redirecting to your dashboard…</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--bg)" }}>
      <div className="w-full max-w-md">
        <div className="panel p-8" style={{ border: "1px solid var(--border)" }}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5" style={{ background: "var(--accent-bg)" }}>
            <Building2 className="w-6 h-6" style={{ color: "var(--accent)" }} />
          </div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--text)" }}>
            Join {info?.company?.name}
          </h1>
          <p className="text-sm mb-6" style={{ color: "var(--text-3)" }}>
            {info?.email ? <>You were invited as <strong style={{ color: "var(--text)" }}>{info.email}</strong>. Set your password to continue.</> : "Create your account to join the workspace."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!info?.email && (
              <div>
                <label className="text-sm font-medium mb-1.5 block" style={{ color: "var(--text-2)" }}>Email</label>
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  className="w-full text-sm rounded-xl px-3 py-2.5 outline-none"
                  style={{ border: "1px solid var(--border)", background: "var(--bg-subtle)", color: "var(--text)" }}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-1.5 block" style={{ color: "var(--text-2)" }}>
                Your name <span style={{ color: "var(--text-3)" }}>(username will be your email)</span>
              </label>
              <input
                type="text"
                required
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-sm rounded-xl px-3 py-2.5 outline-none"
                style={{ border: "1px solid var(--border)", background: "var(--bg-subtle)", color: "var(--text)" }}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block" style={{ color: "var(--text-2)" }}>Password</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  required
                  minLength={6}
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-sm rounded-xl px-3 py-2.5 pr-10 outline-none"
                  style={{ border: "1px solid var(--border)", background: "var(--bg-subtle)", color: "var(--text)" }}
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-3)" }}>
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full py-2.5 text-sm font-semibold flex items-center justify-center gap-2 mt-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Join Workspace"}
            </button>
          </form>

          <p className="text-xs text-center mt-4" style={{ color: "var(--text-3)" }}>
            Already have an account?{" "}
            <button onClick={() => router.push("/login")} className="font-semibold hover:underline" style={{ color: "var(--accent)" }}>Log in</button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--accent)" }} />
      </div>
    }>
      <JoinPageInner />
    </Suspense>
  );
}
