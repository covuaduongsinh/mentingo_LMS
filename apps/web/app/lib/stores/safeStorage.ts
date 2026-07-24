import { createJSONStorage } from "zustand/middleware";

import type { StateStorage } from "zustand/middleware";

/**
 * zustand's persist writes are fire-and-forget microtasks. Under jsdom/vitest a
 * state change can schedule a write that runs after the test window is torn
 * down, when the underlying Storage is no longer functional — surfacing as an
 * intermittent "storage.setItem is not a function" uncaught exception. These
 * wrappers re-read the Storage on every op and swallow failures, keeping writes
 * safe without changing browser behavior. (createJSONStorage caches the object
 * it's given once, so the guard must live in the methods.)
 */
function createSafeStateStorage(getStorage: () => Storage): StateStorage {
  return {
    getItem: (name) => {
      try {
        return getStorage().getItem(name);
      } catch {
        return null;
      }
    },
    setItem: (name, value) => {
      try {
        getStorage().setItem(name, value);
      } catch {
        // storage unavailable (e.g. torn-down jsdom window) — ignore
      }
    },
    removeItem: (name) => {
      try {
        getStorage().removeItem(name);
      } catch {
        // storage unavailable — ignore
      }
    },
  };
}

export const safeLocalStorage = createJSONStorage(() =>
  createSafeStateStorage(() => window.localStorage),
);

export const safeSessionStorage = createJSONStorage(() =>
  createSafeStateStorage(() => window.sessionStorage),
);
