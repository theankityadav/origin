"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useAuthStore } from "@/store/auth.store";
import { useUIStore } from "@/store/ui.store";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { cn, getInitials } from "@/lib/utils";
import {
  LayoutDashboard, FileText, Star, Clock, Share2, FolderOpen,
  Archive, Trash2, Settings, Users, ChevronLeft, ChevronRight,
  Plus, Building2, Search, Webhook, Tag, X, ChevronDown, ChevronRight as ChevronR,
  Zap, ListOrdered, Activity, Monitor, Layers, PenTool,
} from "lucide-react";
import Image from "next/image";
import { getPRDStatuses, savePRDStatuses, PRDStatus } from "./NewDocModal";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Recent", href: "/recent", icon: Clock },
  { label: "Starred", href: "/starred", icon: Star },
  { label: "Shared with me", href: "/shared", icon: Share2 },
  { label: "My Documents", href: "/documents", icon: FileText },
  { label: "Wireframes", href: "/wireframes", icon: PenTool },
  { label: "Categories", href: "/categories", icon: FolderOpen },
  { label: "Activity Logs", href: "/activity", icon: Activity },
  { label: "Archived", href: "/archived", icon: Archive },
  { label: "Trash", href: "/trash", icon: Trash2 },
];

const bottomItems = [
  { label: "Members",  href: "/members",  icon: Users },
  { label: "Webhooks", href: "/webhooks", icon: Webhook },
  { label: "Settings", href: "/settings", icon: Settings },
];

/* ── Generic collapsible list manager (reused for Project Types & Sprints) ── */
function ListManager({
  storageKey, label, icon: Icon, collapsed,
  itemColor = "#6366f1",
}: {
  storageKey: string; label: string; icon: any; collapsed: boolean; itemColor?: string;
}) {
  const [items, setItems] = useState<string[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newVal, setNewVal] = useState("");

  useEffect(() => {
    try { setItems(JSON.parse(localStorage.getItem(storageKey) || "[]")); } catch { setItems([]); }
  }, [storageKey]);

  const save = (next: string[]) => { setItems(next); localStorage.setItem(storageKey, JSON.stringify(next)); };
  const add = () => { const v = newVal.trim(); if (v && !items.includes(v)) save([...items, v]); setNewVal(""); setAdding(false); };
  const remove = (t: string) => save(items.filter(x => x !== t));

  if (collapsed) return (
    <button title={label} className="nav-link justify-center px-0">
      <Icon className="w-4 h-4 shrink-0" style={{ color: "var(--text-3)" }} />
    </button>
  );

  return (
    <div>
      <button onClick={() => setExpanded(e => !e)} className="nav-link w-full" style={{ color: "var(--text-3)" }}>
        <Icon className="w-4 h-4 shrink-0" />
        <span className="flex-1 text-left text-xs font-medium">{label}</span>
        {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronR className="w-3.5 h-3.5" />}
      </button>
      {expanded && (
        <div className="ml-2 mt-1 space-y-0.5">
          {items.map(t => (
            <div key={t} className="flex items-center gap-1.5 group px-2 py-1 rounded-lg"
              onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: itemColor }} />
              <span className="flex-1 text-xs truncate" style={{ color: "var(--text-2)" }}>{t}</span>
              <button onClick={() => remove(t)} className="opacity-0 group-hover:opacity-100 p-0.5 rounded">
                <X className="w-3 h-3" style={{ color: "var(--text-3)" }} />
              </button>
            </div>
          ))}
          {adding ? (
            <div className="flex items-center gap-1 px-1">
              <input autoFocus value={newVal} onChange={e => setNewVal(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") add(); if (e.key === "Escape") { setAdding(false); setNewVal(""); } }}
                placeholder="Name…" className="flex-1 text-xs px-2 py-1 rounded-lg outline-none"
                style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }} />
              <button onClick={add} className="p-1 rounded-lg text-xs font-medium" style={{ background: "var(--accent)", color: "#fff" }}>Add</button>
            </div>
          ) : (
            <button onClick={() => setAdding(true)} className="flex items-center gap-1.5 px-2 py-1 text-xs rounded-lg w-full"
              style={{ color: "var(--accent)" }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <Plus className="w-3 h-3" /> Add
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Status manager (admin) — with color picker ─────────────────── */
function StatusManager({ collapsed }: { collapsed: boolean }) {
  const [statuses, setStatuses] = useState<PRDStatus[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState("#6366f1");
  const [newGroup, setNewGroup] = useState("To-do");

  useEffect(() => { setStatuses(getPRDStatuses()); }, []);

  const save = (next: PRDStatus[]) => { setStatuses(next); savePRDStatuses(next); };

  const add = () => {
    const v = newLabel.trim();
    if (!v) return;
    const entry: PRDStatus = { value: v.toLowerCase().replace(/\s+/g, "_"), label: v, color: newColor, group: newGroup };
    save([...statuses, entry]);
    setNewLabel(""); setAdding(false);
  };

  if (collapsed) return (
    <button title="Statuses" className="nav-link justify-center px-0">
      <Zap className="w-4 h-4 shrink-0" style={{ color: "var(--text-3)" }} />
    </button>
  );

  return (
    <div>
      <button onClick={() => setExpanded(e => !e)} className="nav-link w-full" style={{ color: "var(--text-3)" }}>
        <Zap className="w-4 h-4 shrink-0" />
        <span className="flex-1 text-left text-xs font-medium">PRD Statuses</span>
        {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronR className="w-3.5 h-3.5" />}
      </button>
      {expanded && (
        <div className="ml-2 mt-1 space-y-0.5">
          {statuses.map((s, i) => (
            <div key={s.value} className="flex items-center gap-1.5 group px-2 py-1 rounded-lg"
              onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
              <span className="flex-1 text-xs truncate" style={{ color: "var(--text-2)" }}>{s.label}</span>
              <input type="color" value={s.color}
                onChange={e => { const next = [...statuses]; next[i] = { ...s, color: e.target.value }; save(next); }}
                className="w-4 h-4 rounded cursor-pointer border-0 p-0 opacity-0 group-hover:opacity-100" style={{ background: "none" }} />
              <button onClick={() => save(statuses.filter((_, j) => j !== i))} className="opacity-0 group-hover:opacity-100 p-0.5 rounded">
                <X className="w-3 h-3" style={{ color: "var(--text-3)" }} />
              </button>
            </div>
          ))}
          {adding ? (
            <div className="space-y-1 px-1 py-1">
              <input autoFocus value={newLabel} onChange={e => setNewLabel(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") add(); if (e.key === "Escape") setAdding(false); }}
                placeholder="Status name…" className="w-full text-xs px-2 py-1 rounded-lg outline-none"
                style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }} />
              <div className="flex items-center gap-1">
                <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer border-0 p-0" style={{ background: "none" }} />
                <select value={newGroup} onChange={e => setNewGroup(e.target.value)}
                  className="flex-1 text-xs px-1 py-1 rounded-lg outline-none"
                  style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}>
                  {["To-do","In progress","Complete"].map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                <button onClick={add} className="p-1 rounded-lg text-xs font-medium shrink-0" style={{ background: "var(--accent)", color: "#fff" }}>Add</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAdding(true)} className="flex items-center gap-1.5 px-2 py-1 text-xs rounded-lg w-full"
              style={{ color: "var(--accent)" }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <Plus className="w-3 h-3" /> Add status
            </button>
          )}
        </div>
      )}
    </div>
  );
}


/* ── Main sidebar ────────────────────────────────────────────────── */
export default function AppSidebar() {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar, setSearchOpen, setNewDocOpen, theme } = useUIStore();
  const user = useAuthStore((s) => s.user);
  const activeCompanyId = useAuthStore((s) => s.activeCompanyId);

  const { data: members } = useQuery({
    queryKey: ["members", activeCompanyId],
    queryFn: async () => { const { data } = await api.get(`/companies/${activeCompanyId}/members/`); return data.results ?? data; },
    enabled: !!activeCompanyId,
    staleTime: 60_000,
  });
  const myMembership = members?.find((m: any) => m.user?.id === user?.id);
  const displayRole = myMembership?.role ?? user?.role ?? "";

  return (
    <>

      <aside
        style={{
          background: "var(--bg-panel)",
          borderRight: "1px solid var(--border)",
          width: sidebarOpen ? "var(--sidebar-w)" : "var(--sidebar-collapsed)",
        }}
        className="relative flex flex-col transition-all duration-200 shrink-0 overflow-hidden"
      >
        {/* Header */}
        <div
          style={{ borderBottom: "1px solid var(--border)", height: "var(--topbar-h)" }}
          className="flex items-center gap-2 px-3 shrink-0"
        >
          <Link href="/dashboard" className="flex items-center justify-center min-w-0 flex-1 overflow-hidden">
            {sidebarOpen ? (
              <Image
                src={theme === "dark" ? "/dark_logoo.png" : "/light_logoo.png"}
                alt="Origin"
                width={160}
                height={46}
                className="object-contain"
                style={{ height: 46, width: "auto", maxWidth: "100%" }}
                priority
              />
            ) : (
              <Image
                src="/favicon.png"
                alt="Origin"
                width={24}
                height={24}
                className="object-contain rounded-md mx-auto"
                style={{ width: 24, height: 24 }}
                priority
              />
            )}
          </Link>
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: "var(--text-3)" }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            {sidebarOpen ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Search + New */}
        <div className="px-2 pt-3 pb-2 space-y-1">
          <button
            onClick={() => setSearchOpen(true)}
            className={cn("nav-link w-full", !sidebarOpen && "justify-center px-0")}
          >
            <Search className="w-4 h-4 shrink-0" style={{ color: "var(--text-3)" }} />
            {sidebarOpen && (
              <span className="flex-1 text-left text-xs" style={{ color: "var(--text-3)" }}>
                Search… <kbd className="ml-1 text-[10px] px-1 py-0.5 rounded" style={{ background: "var(--bg-subtle)", color: "var(--text-3)" }}>⌘K</kbd>
              </span>
            )}
          </button>
          <button
            onClick={() => setNewDocOpen(true)}
            className={cn("nav-link w-full font-medium", !sidebarOpen && "justify-center px-0")}
            style={{ color: "var(--accent)" }}
          >
            <Plus className="w-4 h-4 shrink-0" />
            {sidebarOpen && "New Document"}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 space-y-0.5 py-1">
          {navItems.map(({ label, href, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={cn("nav-link", active && "active", !sidebarOpen && "justify-center px-0")}
                title={!sidebarOpen ? label : undefined}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {sidebarOpen && <span className="truncate">{label}</span>}
              </Link>
            );
          })}

          {/* PRD management sections */}
          <div className="mt-2 space-y-0.5" style={{ borderTop: "1px solid var(--border)", paddingTop: 8 }}>
            <ListManager storageKey="prd_project_types" label="Project Types" icon={Tag} collapsed={!sidebarOpen} itemColor="#b45309" />
            <ListManager storageKey="prd_sprints" label="Planned Sprints" icon={ListOrdered} collapsed={!sidebarOpen} itemColor="#6366f1" />
            <ListManager storageKey="prd_platforms" label="Platforms" icon={Monitor} collapsed={!sidebarOpen} itemColor="#0ea5e9" />
            <ListManager storageKey="prd_impacts" label="Impacts" icon={Layers} collapsed={!sidebarOpen} itemColor="#8b5cf6" />
            <StatusManager collapsed={!sidebarOpen} />
          </div>
        </nav>

        {/* Bottom */}
        <div className="px-2 pb-3 space-y-0.5" style={{ borderTop: "1px solid var(--border)", paddingTop: "10px" }}>
          {bottomItems.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn("nav-link", pathname === href && "active", !sidebarOpen && "justify-center px-0")}
              title={!sidebarOpen ? label : undefined}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {sidebarOpen && <span>{label}</span>}
            </Link>
          ))}
          {user?.role === "super_admin" && (
            <Link
              href="/admin"
              className={cn("nav-link", pathname === "/admin" && "active", !sidebarOpen && "justify-center px-0")}
              title={!sidebarOpen ? "Company Management" : undefined}
            >
              <Building2 className="w-4 h-4 shrink-0" />
              {sidebarOpen && <span>Companies</span>}
            </Link>
          )}

          {/* User card */}
          <div
            className={cn("flex items-center gap-2.5 px-2 py-2 mt-1 rounded-xl", !sidebarOpen && "justify-center px-0")}
            style={{ background: "var(--bg-subtle)" }}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={{ background: "var(--accent-bg)", color: "var(--accent)" }}
            >
              {user ? getInitials(user.name) : "?"}
            </div>
            {sidebarOpen && user && (
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate" style={{ color: "var(--text)" }}>{user.name}</p>
                <p className="text-[11px] truncate capitalize" style={{ color: "var(--text-3)" }}>{displayRole}</p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
