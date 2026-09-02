import { storageKey } from '@reps/client';
import { randomUUID } from 'expo-crypto';
import { storage } from './storage';

/**
 * Anonymous identity. The app is fully usable with no account, so a
 * client-generated id is what the API scopes data to; Google sign-in later
 * claims this device's data into a real account.
 *
 * Generated once and persisted - regenerating it would orphan the learner's
 * paths and notes.
 */
let cached: string | null = null;

export async function getDeviceId(): Promise<string> {
  if (cached) return cached;

  const existing = await storage.getItem(storageKey.deviceId);
  if (existing && existing.length >= 8) {
    cached = existing;

    return existing;
  }

  const created = `device-${randomUUID()}`;
  await storage.setItem(storageKey.deviceId, created);
  cached = created;

  return created;
}
