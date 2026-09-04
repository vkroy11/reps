import { Router } from 'express';
import { createIdentityMiddleware } from '../middleware/identity';
import type { Repositories } from '../repositories/types';
import type { Services } from '../services';
import { createAuthRouter } from './auth.route';
import { healthRouter } from './health.route';
import { createNotesRouter } from './notes.route';
import { createOnboardingRouter } from './onboarding.route';
import { createPathsRouter } from './paths.route';
import { createProgressRouter } from './progress.route';
import { createTechniquesRouter } from './techniques.route';

export function createApiRouter(deps: {
  services: Services;
  repositories: Repositories;
}): Router {
  const router = Router();

  // Health is deliberately outside identity so uptime checks need no headers.
  router.use('/health', healthRouter);
  // Unauthenticated: the app asks whether sign-in exists before offering it.
  router.get('/auth/status', (_req, res) => {
    res.json({ available: deps.services.auth.available });
  });

  router.use(createIdentityMiddleware(deps.repositories.users));
  router.use('/onboarding', createOnboardingRouter(deps.services));
  router.use('/paths', createPathsRouter(deps.services));
  router.use('/techniques', createTechniquesRouter(deps.services));
  router.use('/notes', createNotesRouter(deps.services));
  router.use('/progress', createProgressRouter(deps.services));
  router.use('/auth', createAuthRouter(deps.services));

  return router;
}
