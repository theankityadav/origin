"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import AppSidebar from "./AppSidebar";
import AppTopbar from "./AppTopbar";
import SearchModal from "./SearchModal";
import NewDocModal from "./NewDocModal";
import { useUIStore } from "@/store/ui.store";
import api from "@/lib/api";
import { AlertTriangle } from "lucide-react";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { newDocOpen, newDocStatus, setNewDocOpen } = useUIStore();
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const activeCompanyId = useAuthStore((s) => s.activeCompanyId);
  const setActiveCompany = useAuthStore((s) => s.setActiveCompany);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const [isSuspended, setIsSuspended] = useState(false);
  const [suspendedName, setSuspendedName] = useState("");

  useEffect(() => {
    if (!hasHydrated) return;
    if (!accessToken || !user) {
      router.replace("/login");
      return;
    }
    if (user.role === "super_admin") {
      router.replace("/admin");
    }
  }, [hasHydrated, accessToken, user, router]);

  useEffect(() => {
    if (!hasHydrated || !accessToken || activeCompanyId) return;
    api.get("/companies/").then(({ data }) => {
      const companies = data.results ?? data;
      if (companies.length > 0) setActiveCompany(companies[0].id);
    }).catch(() => {});
  }, [hasHydrated, accessToken, activeCompanyId, setActiveCompany]);

  // Check if active company is suspended
  useEffect(() => {
    if (!activeCompanyId || !accessToken) return;
    api.get(`/companies/${activeCompanyId}/`).then(({ data }) => {
      setIsSuspended(data.is_active === false);
      setSuspendedName(data.name ?? "");
    }).catch(() => {});
  }, [activeCompanyId, accessToken]);

  if (!hasHydrated) return null;
  if (!user || !accessToken) return null;
  if (user.role === "super_admin") return null;

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg)" }}>
      <AppSidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <AppTopbar />

        {/* Suspended workspace banner */}
        {isSuspended && (
          <div className="shrink-0 flex items-center gap-3 px-5 py-2.5"
            style={{ background: "rgba(239,68,68,0.12)", borderBottom: "1px solid rgba(239,68,68,0.3)" }}>
            <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: "#f87171" }} />
            <p className="text-sm" style={{ color: "#fca5a5" }}>
              <span className="font-semibold">{suspendedName || "This workspace"} is suspended.</span>
              {" "}All content is read-only. Contact your administrator to reactivate.
            </p>
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          {/* Overlay to block interaction when suspended */}
          {isSuspended ? (
            <div className="relative pointer-events-none select-none opacity-60">
              {children}
            </div>
          ) : children}
        </main>
      </div>
      <SearchModal />
      <NewDocModal open={newDocOpen} onClose={() => setNewDocOpen(false)} defaultStatus={newDocStatus} />
    </div>
  );
}
