import { Router } from 'express';
import { requireUserId } from '../middleware/identity';
import type { Services } from '../services';

export function createProgressRouter(services: Services): Router {
  const router = Router();

  /** Practice history. The client turns this into a streak and a week strip. */
  router.get('/history', async (req, res) => {
    res.json({ entries: await services.progress.history(requireUserId(req)) });
  });

  return router;
}
