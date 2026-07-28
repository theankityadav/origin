"use client";

import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { useUIStore } from "@/store/ui.store";
import { logout } from "@/lib/auth";
import { Bell, Plus, LogOut, User, ChevronDown, Sun, Moon, Search } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { getInitials } from "@/lib/utils";
import Link from "next/link";

export default function AppTopbar() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { theme, toggleTheme, setSearchOpen, setNewDocOpen } = useUIStore();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = async () => {
    await logout(refreshToken || "");
    clearAuth();
    router.push("/login");
  };

  const iconBtn = "p-2 rounded-xl transition-colors cursor-pointer";

  return (
    <header
      style={{
        height: "var(--topbar-h)",
        background: "var(--bg-panel)",
        borderBottom: "1px solid var(--border)",
      }}
      className="flex items-center justify-between px-4 shrink-0"
    >
      {/* Left */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setSearchOpen(true)}
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm transition-colors"
          style={{ background: "var(--bg-subtle)", color: "var(--text-3)", border: "1px solid var(--border)" }}
        >
          <Search className="w-3.5 h-3.5" />
          <span>Search…</span>
          <kbd className="ml-2 text-[10px] px-1.5 py-0.5 rounded" style={{ background: "var(--bg-hover)", color: "var(--text-3)" }}>⌘K</kbd>
        </button>
      </div>

      {/* Right */}
      <div className="flex items-center gap-1">
        {/* New doc */}
        <button
          onClick={() => setNewDocOpen(true)}
          className="btn-primary flex items-center gap-1.5 text-sm px-3 py-1.5 mr-1"
        >
          <Plus className="w-3.5 h-3.5" />
          New
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className={iconBtn}
          style={{ color: "var(--text-2)" }}
          title={theme === "dark" ? "Switch to light" : "Switch to dark"}
          onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Notifications */}
        <Link
          href="/notifications"
          className={iconBtn}
          style={{ color: "var(--text-2)" }}
          onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
        >
          <Bell className="w-4 h-4" />
        </Link>

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-xl transition-colors ml-1"
            onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: "var(--accent-bg)", color: "var(--accent)" }}
            >
              {user ? getInitials(user.name) : "?"}
            </div>
            <span className="text-sm font-medium hidden sm:block" style={{ color: "var(--text)" }}>{user?.name}</span>
            <ChevronDown className="w-3.5 h-3.5" style={{ color: "var(--text-3)" }} />
          </button>

          {menuOpen && (
            <div
              className="absolute right-0 top-full mt-2 w-52 rounded-2xl z-50 py-1.5 overflow-hidden animate-fadeUp"
              style={{
                background: "var(--bg-panel)",
                border: "1px solid var(--border)",
                boxShadow: "var(--shadow-lg)",
              }}
            >
              <div className="px-4 py-2.5" style={{ borderBottom: "1px solid var(--border)" }}>
                <p className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>{user?.name}</p>
                <p className="text-xs truncate" style={{ color: "var(--text-3)" }}>{user?.email}</p>
              </div>
              <div className="py-1">
                <Link
                  href="/settings"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-sm transition-colors"
                  style={{ color: "var(--text-2)" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <User className="w-4 h-4" /> Profile & Settings
                </Link>
                <button
                  onClick={toggleTheme}
                  className="flex items-center gap-2.5 px-4 py-2 text-sm w-full text-left transition-colors"
                  style={{ color: "var(--text-2)" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  {theme === "dark" ? "Light mode" : "Dark mode"}
                </button>
              </div>
              <div style={{ borderTop: "1px solid var(--border)" }} className="pt-1">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2.5 px-4 py-2 text-sm w-full text-left transition-colors"
                  style={{ color: "var(--danger)" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <LogOut className="w-4 h-4" /> Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
