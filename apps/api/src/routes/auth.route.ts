import { Router } from 'express';
import { z } from 'zod';
import { requireDeviceId, requireUserId } from '../middleware/identity';
import type { Services } from '../services';

const SignInSchema = z.object({ idToken: z.string().min(16) });

export function createAuthRouter(services: Services): Router {
  const router = Router();

  /**
   * Whether sign-in can work at all on this server.
   *
   * Unauthenticated on purpose: the app asks before drawing the button, so it
   * can explain the absence instead of offering something that fails.
   */
  router.get('/status', (_req, res) => {
    res.json({ available: services.auth.available });
  });

  router.post('/google', async (req, res) => {
    const { idToken } = SignInSchema.parse(req.body);
    const result = await services.auth.signInWithGoogle({
      idToken,
      deviceId: requireDeviceId(req),
    });

    res.json(result);
  });

  router.get('/me', async (req, res) => {
    res.json({ user: await services.auth.me(requireUserId(req)) });
  });

  /** Unlinks this device. The account keeps everything. */
  router.post('/sign-out', async (req, res) => {
    res.json({ user: await services.auth.signOut(requireDeviceId(req)) });
  });

  return router;
}
