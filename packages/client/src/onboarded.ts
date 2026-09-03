import { storageKey, type Storage } from './storage';

/**
 * Whether this device has ever finished the questionnaire and got a path.
 *
 * This exists so the app can open on Today without waiting for a network
 * round-trip. Asking the API first would mean either a spinner on every cold
 * start or a flash of the welcome screen before the redirect - both worse than
 * one locally-cached boolean, and this is a local-first app.
 *
 * It is a cache, not the truth. `reconcile` is called with the real path count
 * once the list arrives, so a device whose paths were deleted server-side stops
 * skipping the welcome screen on the following launch.
 */
export function createOnboardedStore(storage: Storage) {
  return {
    async load(): Promise<boolean> {
      return (await storage.getItem(storageKey.onboarded)) === 'true';
    },

    async save(value: boolean): Promise<void> {
      if (value) await storage.setItem(storageKey.onboarded, 'true');
      else await storage.removeItem(storageKey.onboarded);
    },

    /** Writes only on a change, so a steady state does no storage work. */
    async reconcile(current: boolean, pathCount: number): Promise<boolean> {
      const truth = pathCount > 0;
      if (truth === current) return current;

      await this.save(truth);

      return truth;
    },
  };
}

export type OnboardedStore = ReturnType<typeof createOnboardedStore>;
