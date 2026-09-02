import { SuggestionsRequestSchema } from '@reps/core';
import { Router } from 'express';
import type { Services } from '../services';

export function createOnboardingRouter(services: Services): Router {
  const router = Router();

  router.post('/suggestions', async (req, res) => {
    const { skill } = SuggestionsRequestSchema.parse(req.body);
    const suggestions = await services.onboarding.suggestions(skill);

    res.json({ suggestions });
  });

  return router;
}
