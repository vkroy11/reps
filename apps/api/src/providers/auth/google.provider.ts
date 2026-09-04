import { createRemoteJWKSet, jwtVerify } from 'jose';
import { UnauthorizedError } from '../../lib/errors';
import type { GoogleIdentity, GoogleVerifier } from './types';

/** Google's published signing keys. jose caches and rotates these itself. */
const GOOGLE_JWKS_URL = new URL('https://www.googleapis.com/oauth2/v3/certs');
const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];

/**
 * Verifies a Google ID token against Google's own keys.
 *
 * Signature, issuer *and* audience are all checked. Audience is the one people
 * skip and it is the one that matters: a correctly signed Google token minted
 * for somebody else's app would otherwise be accepted here, letting them sign
 * in as any of our users. `aud` must be one of our own client ids.
 */
export function createGoogleVerifier(clientIds: string[]): GoogleVerifier {
  // Built once. A per-request JWKS would refetch Google's keys every sign-in.
  const jwks = createRemoteJWKSet(GOOGLE_JWKS_URL);

  return {
    configured: clientIds.length > 0,

    async verify(idToken: string): Promise<GoogleIdentity> {
      if (clientIds.length === 0) {
        throw new UnauthorizedError('Google sign-in is not configured on this server');
      }

      try {
        const { payload } = await jwtVerify(idToken, jwks, {
          issuer: GOOGLE_ISSUERS,
          audience: clientIds,
        });

        const googleId = typeof payload.sub === 'string' ? payload.sub : null;
        if (!googleId) throw new UnauthorizedError('Google token carried no subject');

        /*
          An unverified email is not used as an identity hint anywhere, but it
          is still stored - so it is recorded as null rather than as something
          that looks confirmed.
        */
        const verified = payload.email_verified === true;

        return {
          googleId,
          email: verified && typeof payload.email === 'string' ? payload.email : null,
          name: typeof payload.name === 'string' ? payload.name : null,
        };
      } catch (error) {
        if (error instanceof UnauthorizedError) throw error;

        // Deliberately unspecific to the caller: which check failed is useful
        // to an attacker and useless to a legitimate client.
        throw new UnauthorizedError('Google sign-in token was not accepted');
      }
    },
  };
}
