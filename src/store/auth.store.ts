import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/lib/auth";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  activeCompanyId: string | null;
  _hasHydrated: boolean;
  setAuth: (user: User, access: string, refresh: string) => void;
  setUser: (user: User) => void;
  setActiveCompany: (id: string) => void;
  clearAuth: () => void;
  setHasHydrated: (val: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      activeCompanyId: null,
      _hasHydrated: false,
      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken }),
      setUser: (user) => set({ user }),
      setActiveCompany: (activeCompanyId) => set({ activeCompanyId }),
      clearAuth: () =>
        set({ user: null, accessToken: null, refreshToken: null, activeCompanyId: null }),
      setHasHydrated: (val) => set({ _hasHydrated: val }),
    }),
    {
      name: "payme-auth",
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        activeCompanyId: state.activeCompanyId,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
