import { describe, expect, it } from 'vitest';
import { createSessionStore, type Session } from './session-store';
import { createMemoryStorage, storageKey } from './storage';

function session(overrides: Partial<Session> = {}): Session {
  return {
    token: 'a.b.c',
    expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    userId: 'usr_1',
    email: 'alice@example.com',
    name: 'Alice',
    ...overrides,
  };
}

describe('the session store', () => {
  it('is empty on a device that has never signed in', async () => {
    expect(await createSessionStore(createMemoryStorage()).load()).toBeNull();
  });

  it('survives a restart', async () => {
    const storage = createMemoryStorage();
    await createSessionStore(storage).save(session());

    expect(await createSessionStore(storage).load()).toMatchObject({ userId: 'usr_1' });
  });

  /**
   * Dropped on read rather than sent and rejected. A stale token would come
   * back 401 and the app would look broken instead of simply signed out.
   */
  it('discards an expired session instead of returning it', async () => {
    const storage = createMemoryStorage();
    const store = createSessionStore(storage);
    await store.save(session({ expiresAt: new Date(Date.now() - 1000).toISOString() }));

    expect(await store.load()).toBeNull();
    expect(await storage.getItem(storageKey.session)).toBeNull();
  });

  it('treats a session expiring exactly now as expired', async () => {
    const storage = createMemoryStorage();
    const store = createSessionStore(storage);
    await store.save(session({ expiresAt: new Date(Date.now()).toISOString() }));

    expect(await store.load()).toBeNull();
  });

  it('ignores a corrupt entry rather than throwing', async () => {
    const storage = createMemoryStorage();
    await storage.setItem(storageKey.session, '{"token":42}');

    expect(await createSessionStore(storage).load()).toBeNull();
  });

  it('clears on sign-out', async () => {
    const storage = createMemoryStorage();
    const store = createSessionStore(storage);
    await store.save(session());
    await store.clear();

    expect(await store.load()).toBeNull();
  });

  it('keeps an anonymous account with no email', async () => {
    const storage = createMemoryStorage();
    const store = createSessionStore(storage);
    await store.save(session({ email: null, name: null }));

    expect(await store.load()).toMatchObject({ email: null, name: null });
  });
});
