import { UnauthorizedError } from '../../lib/errors';
import type { GoogleVerifier } from './types';

/**
 * Accepts tokens of the form `fake:<googleId>:<email>`.
 *
 * Exists so the interesting half of sign-in - what happens to a learner's
 * paths, notes and practice history when they claim a device - can be tested
 * exhaustively without network access or a Google client id.
 */
export function createFakeGoogleVerifier(): GoogleVerifier {
  return {
    configured: true,

    async verify(idToken: string) {
      const [prefix, googleId, email] = idToken.split(':');
      if (prefix !== 'fake' || !googleId) {
        throw new UnauthorizedError('Google sign-in token was not accepted');
      }

      return {
        googleId,
        email: email ?? null,
        name: email ? (email.split('@')[0] ?? null) : null,
      };
    },
  };
}
