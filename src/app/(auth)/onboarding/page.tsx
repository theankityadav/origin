"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import api from "@/lib/api";
import {
  Briefcase, BookOpen, User, ArrowRight, Users, Mail, Plus, X, Check, Loader2, FileText,
} from "lucide-react";
import toast from "react-hot-toast";

const USE_CASES = [
  {
    id: "work",
    icon: Briefcase,
    title: "For work",
    desc: "Track projects, company goals, meeting notes",
  },
  {
    id: "personal",
    icon: User,
    title: "For personal use",
    desc: "Write better, think more clearly, stay organised",
  },
  {
    id: "education",
    icon: BookOpen,
    title: "For school",
    desc: "Keep notes, research, and tasks in one place",
  },
];

const STEPS = ["Use case", "Invite team", "You're set"];

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-1.5 mb-10">
      {STEPS.map((_, i) => (
        <div
          key={i}
          className="h-1 rounded-full flex-1 transition-all duration-500"
          style={{
            background: i <= step ? "var(--accent)" : "var(--border)",
          }}
        />
      ))}
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const activeCompanyId = useAuthStore((s) => s.activeCompanyId);
  const user = useAuthStore((s) => s.user);

  const [step, setStep] = useState(0);
  const [useCase, setUseCase] = useState<string | null>(null);
  const [emails, setEmails] = useState(["", "", ""]);
  const [sending, setSending] = useState(false);

  const handleAddEmail = () => setEmails((e) => [...e, ""]);
  const handleEmailChange = (i: number, val: string) =>
    setEmails((prev) => prev.map((e, idx) => (idx === i ? val : e)));
  const handleRemoveEmail = (i: number) =>
    setEmails((prev) => prev.filter((_, idx) => idx !== i));

  const handleInvite = async () => {
    const valid = emails.filter((e) => e.trim() && e.includes("@"));
    if (!valid.length || !activeCompanyId) {
      setStep(2);
      return;
    }
    setSending(true);
    try {
      await Promise.all(
        valid.map((email) =>
          api.post(`/companies/${activeCompanyId}/invite/`, {
            email,
            role: "editor",
          })
        )
      );
      toast.success(`Invite${valid.length > 1 ? "s" : ""} sent!`);
    } catch {
      toast.error("Some invites failed — you can retry from Members.");
    } finally {
      setSending(false);
      setStep(2);
    }
  };

  const handleFinish = () => router.replace("/dashboard");

  const cardStyle = {
    background: "var(--bg-panel)",
    border: "1px solid var(--border)",
    boxShadow: "var(--shadow-lg)",
  };

  const inputStyle = {
    background: "var(--bg-subtle)",
    border: "1px solid var(--border)",
    color: "var(--text)",
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative"
      style={{ background: "var(--bg)" }}
    >
      {/* Background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-15 blur-3xl" style={{ background: "var(--accent)" }} />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full opacity-10 blur-3xl" style={{ background: "var(--accent-2)" }} />
      </div>

      <div className="relative w-full max-w-lg animate-fadeUp">
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-3"
            style={{ background: "var(--accent)", boxShadow: "0 8px 32px rgba(91,94,244,0.35)" }}
          >
            <FileText className="w-6 h-6 text-white" />
          </div>
          <p className="text-sm font-medium" style={{ color: "var(--text-3)" }}>
            Step {step + 1} of {STEPS.length}
          </p>
        </div>

        <div className="rounded-2xl p-8" style={cardStyle}>
          <ProgressBar step={step} />

          {/* ── Step 0: Use case ── */}
          {step === 0 && (
            <div className="space-y-6 animate-fadeUp">
              <div className="text-center">
                <div className="text-4xl mb-3">💡</div>
                <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
                  How do you want to use Origin?
                </h1>
                <p className="text-sm mt-1.5" style={{ color: "var(--text-3)" }}>
                  This helps us customise your experience
                </p>
              </div>

              <div className="space-y-2.5">
                {USE_CASES.map(({ id, icon: Icon, title, desc }) => (
                  <button
                    key={id}
                    onClick={() => setUseCase(id)}
                    className="w-full flex items-center gap-4 px-4 py-4 rounded-xl text-left transition-all"
                    style={{
                      background: useCase === id ? "var(--accent-bg)" : "var(--bg-subtle)",
                      border: `2px solid ${useCase === id ? "var(--accent)" : "transparent"}`,
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        background: useCase === id ? "var(--accent)" : "var(--bg-hover)",
                        color: useCase === id ? "#fff" : "var(--text-3)",
                      }}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{title}</p>
                      <p className="text-xs" style={{ color: "var(--text-3)" }}>{desc}</p>
                    </div>
                    {useCase === id && (
                      <div className="ml-auto w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "var(--accent)" }}>
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setStep(1)}
                disabled={!useCase}
                className="btn-primary w-full py-3 text-sm flex items-center justify-center gap-2 disabled:opacity-40"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ── Step 1: Invite team ── */}
          {step === 1 && (
            <div className="space-y-6 animate-fadeUp">
              <div className="text-center">
                <div className="text-4xl mb-3">👥</div>
                <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
                  Who else is on your team?
                </h1>
                <p className="text-sm mt-1.5" style={{ color: "var(--text-3)" }}>
                  Add your team members by email
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-3)" }}>
                  Invite your team
                </p>
                {emails.map((email, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => handleEmailChange(i, e.target.value)}
                      placeholder="name@company.com"
                      className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none focus:ring-2 transition"
                      style={inputStyle}
                    />
                    {emails.length > 1 && (
                      <button
                        onClick={() => handleRemoveEmail(i)}
                        className="p-1.5 rounded-lg transition"
                        style={{ color: "var(--text-3)" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={handleAddEmail}
                  className="flex items-center gap-1.5 text-sm mt-1 transition"
                  style={{ color: "var(--accent)" }}
                >
                  <Plus className="w-4 h-4" /> Add more
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 py-3 rounded-xl text-sm font-medium transition"
                  style={{ background: "var(--bg-subtle)", color: "var(--text-2)", border: "1px solid var(--border)" }}
                >
                  Skip for now
                </button>
                <button
                  onClick={handleInvite}
                  disabled={sending}
                  className="btn-primary flex-1 py-3 text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                  {sending ? "Sending…" : "Send invites"}
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2: Done ── */}
          {step === 2 && (
            <div className="text-center space-y-6 animate-fadeUp py-4">
              <div>
                <div
                  className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                  style={{ background: "var(--accent-bg)" }}
                >
                  <Check className="w-8 h-8" style={{ color: "var(--accent)" }} />
                </div>
                <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
                  You&apos;re all set, {user?.name?.split(" ")[0] || "there"}!
                </h1>
                <p className="text-sm mt-2" style={{ color: "var(--text-3)" }}>
                  Your workspace is ready. Start creating documents.
                </p>
              </div>

              <div className="space-y-2 text-left p-4 rounded-xl" style={{ background: "var(--bg-subtle)" }}>
                {[
                  "Create your first document",
                  "Invite your team members",
                  "Organise with categories",
                ].map((tip, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm" style={{ color: "var(--text-2)" }}>
                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--accent-bg)" }}>
                      <Check className="w-3 h-3" style={{ color: "var(--accent)" }} />
                    </div>
                    {tip}
                  </div>
                ))}
              </div>

              <button
                onClick={handleFinish}
                className="btn-primary w-full py-3 text-sm flex items-center justify-center gap-2"
              >
                Go to dashboard <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
