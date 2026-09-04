import { randomBytes } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { env, isProduction } from '../config/env';
import { UnauthorizedError } from './errors';

const ISSUER = 'reps';
const AUDIENCE = 'reps-app';

/**
 * The signing key for our own session tokens.
 *
 * In production the secret is required and boot fails without it. Locally a
 * random key is generated per process, which means sessions do not survive a
 * restart - an acceptable trade for never shipping a default secret, which is
 * the failure that actually matters.
 */
function secret(): Uint8Array {
  if (env.SESSION_SECRET) return new TextEncoder().encode(env.SESSION_SECRET);

  if (isProduction) {
    throw new Error('SESSION_SECRET must be set in production');
  }

  return devSecret;
}

const devSecret = new Uint8Array(randomBytes(32));

export async function signSession(userId: string): Promise<{ token: string; expiresAt: string }> {
  const expires = new Date(Date.now() + env.SESSION_DAYS * 24 * 60 * 60 * 1000);

  const token = await new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(Math.floor(expires.getTime() / 1000))
    .sign(secret());

  return { token, expiresAt: expires.toISOString() };
}

/** The user id a session token speaks for, or throws. */
export async function verifySession(token: string): Promise<string> {
  try {
    const { payload } = await jwtVerify(token, secret(), {
      issuer: ISSUER,
      audience: AUDIENCE,
    });

    if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
      throw new UnauthorizedError('Session token carried no subject');
    }

    return payload.sub;
  } catch (error) {
    if (error instanceof UnauthorizedError) throw error;

    throw new UnauthorizedError('Session token was not accepted');
  }
}
