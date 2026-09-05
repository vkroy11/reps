import { ReflectRequestSchema } from '@reps/core';
import { Router } from 'express';
import { z } from 'zod';
import { requireUserId } from '../middleware/identity';
import type { Services } from '../services';

const ContentQuerySchema = z.object({
  format: z.enum(['ai_lesson', 'flashcards', 'drill']).optional(),
  /**
   * Ask for a new variant instead of the stored one. Set when the learner is
   * repeating a technique they have already practised, so the deck does not
   * come back in the order they memorised it in.
   */
  fresh: z
    .enum(['1', 'true'])
    .optional()
    .transform((value) => value !== undefined),
});

/**
 * The adaptive operations are commands rather than field updates, so they are
 * POSTs to named actions: "this is too hard" and "not for me" mean different
 * things to the path and cannot be expressed as a status assignment.
 */
export function createTechniquesRouter(services: Services): Router {
  const router = Router();

  router.get('/:id', async (req, res) => {
    const technique = await services.techniques.ensureResources(requireUserId(req), req.params.id);

    res.json({ technique });
  });

  router.get('/:id/content', async (req, res) => {
    const { format, fresh } = ContentQuerySchema.parse(req.query);
    const content = await services.content.get(requireUserId(req), req.params.id, format, {
      fresh,
    });

    res.json({ content });
  });

  router.post('/:id/reflect', async (req, res) => {
    const input = ReflectRequestSchema.parse(req.body);
    const result = await services.techniques.reflect(requireUserId(req), req.params.id, input);

    res.json(result);
  });

  router.post('/:id/too-hard', async (req, res) => {
    const path = await services.techniques.markTooHard(requireUserId(req), req.params.id);

    res.json({ path });
  });

  router.post('/:id/skip', async (req, res) => {
    const path = await services.techniques.skip(requireUserId(req), req.params.id);

    res.json({ path });
  });

  return router;
}
