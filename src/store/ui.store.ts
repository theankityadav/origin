import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIState {
  sidebarOpen: boolean;
  searchOpen: boolean;
  newDocOpen: boolean;
  newDocStatus: string | undefined;
  theme: "light" | "dark";
  setSidebarOpen: (open: boolean) => void;
  setSearchOpen: (open: boolean) => void;
  setNewDocOpen: (open: boolean, status?: string) => void;
  toggleSidebar: () => void;
  toggleTheme: () => void;
  setTheme: (t: "light" | "dark") => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      searchOpen: false,
      newDocOpen: false,
      newDocStatus: undefined,
      theme: "light",
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      setSearchOpen: (searchOpen) => set({ searchOpen }),
      setNewDocOpen: (newDocOpen, status) => set({ newDocOpen, newDocStatus: newDocOpen ? status : undefined }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      toggleTheme: () => set((s) => ({ theme: s.theme === "light" ? "dark" : "light" })),
      setTheme: (t) => set({ theme: t }),
    }),
    { name: "ui-store", partialize: (s) => ({ theme: s.theme, sidebarOpen: s.sidebarOpen }) }
  )
);
