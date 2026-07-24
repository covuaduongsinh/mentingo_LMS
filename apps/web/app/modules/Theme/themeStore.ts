import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type ThemeStore = {
  theme: "light" | "dark";
  toggleTheme: () => void;
};

// zustand's persist writes are fire-and-forget microtasks. Under jsdom/vitest a
// toggle can schedule a write that runs after the test's window has been torn
// down, when localStorage is no longer a functional Storage — surfacing as an
// intermittent "storage.setItem is not a function" uncaught exception. Each op
// re-reads localStorage and swallows the failure, keeping writes safe without
// changing browser behavior. (createJSONStorage caches the returned object once,
// so the guard must live in the methods, not in resolving the storage.)
const safeStorage = createJSONStorage(() => ({
  getItem: (name) => {
    try {
      return window.localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      window.localStorage.setItem(name, value);
    } catch {
      // storage unavailable (e.g. torn-down jsdom window) — ignore
    }
  },
  removeItem: (name) => {
    try {
      window.localStorage.removeItem(name);
    } catch {
      // storage unavailable — ignore
    }
  },
}));

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: "light",
      toggleTheme: () =>
        set((state) => ({
          theme: state.theme === "light" ? "dark" : "light",
        })),
    }),
    {
      name: "theme-storage",
      storage: safeStorage,
    },
  ),
);
