"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import AppSidebar from "./AppSidebar";
import AppTopbar from "./AppTopbar";
import SearchModal from "./SearchModal";
import NewDocModal from "./NewDocModal";
import { useUIStore } from "@/store/ui.store";
import api from "@/lib/api";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { newDocOpen, newDocStatus, setNewDocOpen } = useUIStore();
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const activeCompanyId = useAuthStore((s) => s.activeCompanyId);
  const setActiveCompany = useAuthStore((s) => s.setActiveCompany);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);

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

  if (!hasHydrated) return null;
  if (!user || !accessToken) return null;
  if (user.role === "super_admin") return null;

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg)" }}>
      <AppSidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <AppTopbar />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          {children}
        </main>
      </div>
      <SearchModal />
      <NewDocModal open={newDocOpen} onClose={() => setNewDocOpen(false)} defaultStatus={newDocStatus} />
    </div>
  );
}
