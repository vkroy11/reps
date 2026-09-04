import { z } from 'zod';
import { createJsonStore, storageKey, type Storage } from './storage';

export const SessionSchema = z.object({
  token: z.string(),
  expiresAt: z.string(),
  userId: z.string(),
  email: z.string().nullable(),
  name: z.string().nullable(),
});
export type Session = z.infer<typeof SessionSchema>;

/**
 * The signed-in session, on this device.
 *
 * Stored through the same Storage port as everything else rather than in
 * SecureStore. That is a deliberate call worth stating: this token grants
 * access to somebody's practice history, which is not a payment credential or
 * a health record. The port is what the whole client is written against, and
 * a second storage mechanism for one value would mean two failure modes on a
 * platform where SecureStore is unavailable - the web, where the app also runs.
 *
 * If the threat model ever changes, this is the one file to change.
 */
export function createSessionStore(storage: Storage) {
  const json = createJsonStore(storage);

  return {
    async load(): Promise<Session | null> {
      const session = await json.read(storageKey.session, (value) => {
        const parsed = SessionSchema.safeParse(value);

        return parsed.success ? parsed.data : null;
      });

      if (!session) return null;

      // Expired tokens are dropped on read rather than sent and rejected: the
      // server would answer 401 and the app would look broken.
      if (Date.parse(session.expiresAt) <= Date.now()) {
        await json.clear(storageKey.session);

        return null;
      }

      return session;
    },

    async save(session: Session): Promise<void> {
      await json.write(storageKey.session, session);
    },

    async clear(): Promise<void> {
      await json.clear(storageKey.session);
    },
  };
}

export type SessionStore = ReturnType<typeof createSessionStore>;
