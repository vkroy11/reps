/**
 * The Storage port.
 *
 * One interface, so domain code never imports a storage library directly. The
 * app supplies an AsyncStorage-backed adapter (which is localStorage on web);
 * tests supply an in-memory one; a native-only MMKV adapter can replace it
 * later for speed without touching a caller.
 */
export interface Storage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/** Keys are namespaced so a stray clear() cannot take unrelated data with it. */
export const storageKey = {
  deviceId: 'reps.device-id',
  onboardingDraft: 'reps.onboarding-draft',
  focusedPathId: 'reps.focused-path-id',
  onboarded: 'reps.onboarded',
  reminder: 'reps.reminder',
} as const;

/**
 * Reads and writes JSON through the port. Anything unparseable is treated as
 * absent rather than thrown: a corrupt draft should not brick onboarding.
 */
export function createJsonStore(storage: Storage) {
  return {
    async read<T>(key: string, parse: (value: unknown) => T | null): Promise<T | null> {
      const raw = await storage.getItem(key);
      if (raw === null) return null;

      try {
        return parse(JSON.parse(raw));
      } catch {
        return null;
      }
    },

    async write(key: string, value: unknown): Promise<void> {
      await storage.setItem(key, JSON.stringify(value));
    },

    async clear(key: string): Promise<void> {
      await storage.removeItem(key);
    },
  };
}

export type JsonStore = ReturnType<typeof createJsonStore>;

/** Used by tests and as a fallback when a platform store is unavailable. */
export function createMemoryStorage(): Storage {
  const map = new Map<string, string>();

  return {
    async getItem(key) {
      return map.get(key) ?? null;
    },
    async setItem(key, value) {
      map.set(key, value);
    },
    async removeItem(key) {
      map.delete(key);
    },
  };
}
