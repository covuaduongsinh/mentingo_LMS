import { create } from "zustand";
import { persist } from "zustand/middleware";

import { safeLocalStorage } from "~/lib/stores/safeStorage";

interface INavigationStore {
  expandedMenus: string[];
  setExpandedMenus: (menus: string[]) => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebarCollapsed: () => void;
}

export const useNavigationStore = create<INavigationStore>()(
  persist(
    (set) => ({
      expandedMenus: [],
      setExpandedMenus: (menus) => set({ expandedMenus: menus }),
      isSidebarCollapsed: false,
      setIsSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),
      toggleSidebarCollapsed: () =>
        set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
    }),
    {
      name: "navigation-storage",
      storage: safeLocalStorage,
      partialize: (state) => ({
        expandedMenus: state.expandedMenus,
        isSidebarCollapsed: state.isSidebarCollapsed,
      }),
    },
  ),
);
