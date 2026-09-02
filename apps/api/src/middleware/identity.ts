import type { NextFunction, Request, Response } from 'express';
import { UnauthorizedError } from '../lib/errors';
import type { UserRepository } from '../repositories/types';

const DEVICE_ID_HEADER = 'x-device-id';
const MIN_DEVICE_ID_LENGTH = 8;

/**
 * Anonymous identity. The app is usable with no account, so a client-generated
 * device id identifies the learner and gets a user row on first contact.
 * Google sign-in will layer on top of this by claiming a device's data.
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

    const user = await users.findOrCreateByDeviceId(deviceId);
    req.userId = user.id;

    next();
  };
}

/** Keeps handlers honest about the fact that identity is set by middleware. */
export function requireUserId(req: Request): string {
  if (!req.userId) throw new UnauthorizedError();

  return req.userId;
}
