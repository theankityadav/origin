"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { useUIStore } from "@/store/ui.store";
import { logout } from "@/lib/auth";
import { ShieldCheck, Sun, Moon, ChevronDown, LogOut } from "lucide-react";
import { getInitials } from "@/lib/utils";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const { theme, toggleTheme } = useUIStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!accessToken || !user) { router.replace("/superadmin/login"); return; }
    if (user.role !== "super_admin") router.replace("/dashboard");
  }, [hasHydrated, accessToken, user, router]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!hasHydrated || !user || !accessToken) return null;
  if (user.role !== "super_admin") return null;

  const handleLogout = async () => {
    await logout(refreshToken || "");
    clearAuth();
    router.push("/superadmin/login");
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      {/* Superadmin topbar */}
      <header
        className="flex items-center justify-between px-5 shrink-0"
        style={{ height: "var(--topbar-h)", background: "var(--bg-panel)", borderBottom: "1px solid var(--border)" }}
      >
        {/* Left: branding */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#7c3aed,#6366f1)" }}>
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>Superadmin</span>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: "rgba(124,58,237,0.1)", color: "#7c3aed" }}>
            {user.name}
          </span>
        </div>

        {/* Right: theme + user menu */}
        <div className="flex items-center gap-1">
          <button onClick={toggleTheme}
            className="p-2 rounded-xl transition-colors"
            style={{ color: "var(--text-2)" }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            title={theme === "dark" ? "Light mode" : "Dark mode"}>
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-xl transition-colors ml-1"
              onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: "rgba(124,58,237,0.15)", color: "#7c3aed" }}>
                {getInitials(user.name)}
              </div>
              <span className="text-sm font-medium hidden sm:block" style={{ color: "var(--text)" }}>{user.name}</span>
              <ChevronDown className="w-3.5 h-3.5" style={{ color: "var(--text-3)" }} />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 rounded-2xl z-50 py-1.5 overflow-hidden animate-fadeUp"
                style={{ background: "var(--bg-panel)", border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)" }}>
                <div className="px-4 py-2.5" style={{ borderBottom: "1px solid var(--border)" }}>
                  <p className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>{user.name}</p>
                  <p className="text-xs truncate" style={{ color: "var(--text-3)" }}>{user.email}</p>
                </div>
                <div className="pt-1">
                  <button onClick={handleLogout}
                    className="flex items-center gap-2.5 px-4 py-2 text-sm w-full text-left transition-colors"
                    style={{ color: "var(--danger)" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <LogOut className="w-4 h-4" /> Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
