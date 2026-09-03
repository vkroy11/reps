import { CreateNoteRequestSchema, UpdateNoteRequestSchema } from '@reps/core';
import { Router } from 'express';
import { z } from 'zod';
import { requireUserId } from '../middleware/identity';
import type { Services } from '../services';

const ListQuerySchema = z.object({ techniqueId: z.string().min(1).optional() });

export function createNotesRouter(services: Services): Router {
  const router = Router();

  /** Without techniqueId this is the notebook; with it, one technique's notes. */
  router.get('/', async (req, res) => {
    const { techniqueId } = ListQuerySchema.parse(req.query);
    const userId = requireUserId(req);

    if (techniqueId) {
      res.json({ notes: await services.notes.listForTechnique(userId, techniqueId) });

      return;
    }

    res.json({ notes: await services.notes.listAll(userId) });
  });

  router.post('/', async (req, res) => {
    const input = CreateNoteRequestSchema.parse(req.body);
    const note = await services.notes.create(requireUserId(req), input);

    res.status(201).json({ note });
  });

  router.patch('/:id', async (req, res) => {
    const { body } = UpdateNoteRequestSchema.parse(req.body);
    const note = await services.notes.update(requireUserId(req), req.params.id, body);

    res.json({ note });
  });

  router.delete('/:id', async (req, res) => {
    await services.notes.remove(requireUserId(req), req.params.id);

    res.status(204).send();
  });

  return router;
}
