import { describe, expect, it } from 'vitest';
import { createOnboardedStore } from './onboarded';
import { createMemoryStorage, storageKey } from './storage';

describe('the onboarded flag', () => {
  it('is false on a device that has never finished the questionnaire', async () => {
    const store = createOnboardedStore(createMemoryStorage());

    expect(await store.load()).toBe(false);
  });

  it('survives a restart once a path has been built', async () => {
    const storage = createMemoryStorage();
    await createOnboardedStore(storage).save(true);

    // A second store over the same storage stands in for a cold start.
    expect(await createOnboardedStore(storage).load()).toBe(true);
  });

  it('removes the key rather than writing false', async () => {
    const storage = createMemoryStorage();
    const store = createOnboardedStore(storage);

    await store.save(true);
    await store.save(false);

    expect(await storage.getItem(storageKey.onboarded)).toBeNull();
  });

  describe('reconciling against the real path count', () => {
    it('turns itself on for a device that has paths but no flag', async () => {
      const storage = createMemoryStorage();
      const store = createOnboardedStore(storage);

      expect(await store.reconcile(false, 2)).toBe(true);
      expect(await store.load()).toBe(true);
    });

    /**
     * The case that matters: paths deleted server-side. Without this the device
     * would keep skipping the welcome screen and land on an empty Today.
     */
    it('turns itself off when the paths are gone', async () => {
      const storage = createMemoryStorage();
      const store = createOnboardedStore(storage);
      await store.save(true);

      expect(await store.reconcile(true, 0)).toBe(false);
      expect(await store.load()).toBe(false);
    });

    it('writes nothing when the flag already agrees', async () => {
      const storage = createMemoryStorage();
      let writes = 0;

      const counted = {
        ...storage,
        setItem: async (key: string, value: string) => {
          writes += 1;
          await storage.setItem(key, value);
        },
        removeItem: async (key: string) => {
          writes += 1;
          await storage.removeItem(key);
        },
      };

      await createOnboardedStore(counted).reconcile(true, 3);
      await createOnboardedStore(counted).reconcile(false, 0);

      expect(writes).toBe(0);
    });
  });
});
