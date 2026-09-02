import { OnboardingInputSchema } from '@reps/core';
import { Router } from 'express';
import { requireUserId } from '../middleware/identity';
import type { Services } from '../services';

export function createPathsRouter(services: Services): Router {
  const router = Router();

  router.post('/', async (req, res) => {
    const input = OnboardingInputSchema.parse(req.body);
    const path = await services.paths.create(requireUserId(req), input);

    res.status(201).json({ path });
  });

  router.get('/', async (req, res) => {
    const paths = await services.paths.list(requireUserId(req));

    res.json({ paths });
  });

  router.get('/:id', async (req, res) => {
    const path = await services.paths.getOwned(requireUserId(req), req.params.id);

    res.json({ path });
  });

  return router;
}
