import { env } from '../../config/env';
import { createGoogleVerifier } from './google.provider';
import type { GoogleVerifier } from './types';

/**
 * Reads the configured client ids and builds a verifier.
 *
 * With none set the verifier reports itself unconfigured rather than throwing,
 * so the server boots and the app can explain that sign-in is unavailable in
 * this build. Sign-in is optional by design, and an unconfigured deploy should
 * degrade to "no sync", not to "no API".
 */
export function createAuthProvider(): GoogleVerifier {
  const clientIds = (env.GOOGLE_OAUTH_CLIENT_IDS ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter((id) => id.length > 0);

  return createGoogleVerifier(clientIds);
}

export type { GoogleIdentity, GoogleVerifier } from './types';
