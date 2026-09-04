import type { NextFunction, Request, Response } from 'express';
import { UnauthorizedError } from '../lib/errors';
import { verifySession } from '../lib/session';
import type { UserRepository } from '../repositories/types';

const DEVICE_ID_HEADER = 'x-device-id';
const MIN_DEVICE_ID_LENGTH = 8;

/**
 * Identity, from either a session token or a device id.
 *
 * The device id is always required, even when signed in - it is what a claim
 * and a sign-out act on, and it is how the same physical device is recognised
 * across both states. The bearer token, when present, decides *which learner*
 * the request speaks for.
 *
 * A token that fails verification is rejected rather than quietly falling back
 * to the device identity. Falling back would be worse than either outcome:
 * an expired session would silently start writing to a fresh anonymous user,
 * and the learner would watch their paths disappear with no error to explain
 * it.
 */
export function createIdentityMiddleware(users: UserRepository) {
  return async function identity(req: Request, _res: Response, next: NextFunction) {
    const deviceId = req.header(DEVICE_ID_HEADER)?.trim();

    if (!deviceId || deviceId.length < MIN_DEVICE_ID_LENGTH) {
      next(
        new UnauthorizedError(
          `A '${DEVICE_ID_HEADER}' header of at least ${MIN_DEVICE_ID_LENGTH} characters is required`,
        ),
      );

      return;
    }

    req.deviceId = deviceId;

    const bearer = req.header('authorization')?.match(/^Bearer (.+)$/i)?.[1]?.trim();

    try {
      if (bearer) {
        const userId = await verifySession(bearer);
        const user = await users.findById(userId);
        // The account was deleted while a token was still in the wild.
        if (!user) throw new UnauthorizedError('This session no longer exists');

        req.userId = user.id;
      } else {
        const user = await users.findOrCreateByDeviceId(deviceId);
        req.userId = user.id;
      }
    } catch (error) {
      next(error);

      return;
    }

    next();
  };
}

/** The calling device. Set for every authenticated request, signed in or not. */
export function requireDeviceId(req: Request): string {
  if (!req.deviceId) throw new UnauthorizedError();

  return req.deviceId;
}

/** Keeps handlers honest about the fact that identity is set by middleware. */
export function requireUserId(req: Request): string {
  if (!req.userId) throw new UnauthorizedError();

  return req.userId;
}
