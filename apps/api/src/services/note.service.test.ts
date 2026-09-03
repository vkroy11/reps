import type { LearningPath, OnboardingInput } from '@reps/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { createContainer } from '../container';
import { createFakeAiProvider } from '../providers/ai/fake.provider';
import { createFakeResourceProvider } from '../providers/resources/fake.provider';
import { createMemoryRepositories } from '../repositories/memory';
import type { Services } from './index';

const INPUT: OnboardingInput = {
  skill: 'guitar',
  goal: 'play 5 songs at a campfire',
  level: 'I know a few chords',
  dailyMinutes: 20,
  daysPerWeek: 5,
  preferredFormats: ['video'],
  language: 'en',
};

const USER = 'usr_owner';
const OTHER = 'usr_someone_else';

describe('note service', () => {
  let services: Services;
  let path: LearningPath;

  beforeEach(async () => {
    services = createContainer({
      ai: createFakeAiProvider(),
      resources: createFakeResourceProvider(),
      repositories: createMemoryRepositories(),
    }).services;

    path = await services.paths.create(USER, INPUT);
  });

  function first() {
    const technique = path.techniques[0];
    if (!technique) throw new Error('fixture has no techniques');

    return technique;
  }

  it('writes a note against a technique', async () => {
    const note = await services.notes.create(USER, {
      techniqueId: first().id,
      body: '  keep the ring finger anchored  ',
    });

    // Body is trimmed on the way in.
    expect(note.body).toBe('keep the ring finger anchored');
    expect(note.techniqueId).toBe(first().id);
  });

  it('anchors a note to a resource and a timestamp', async () => {
    const resource = first().resources[0];
    if (!resource) throw new Error('fixture technique has no resources');

    const note = await services.notes.create(USER, {
      techniqueId: first().id,
      resourceId: resource.id,
      timestampSec: 222,
      body: 'practise the change, not the chord',
    });

    expect(note.resourceId).toBe(resource.id);
    expect(note.timestampSec).toBe(222);
  });

  /** A timestamp is meaningless without the resource it points into. */
  it('drops a timestamp when no resource is named', async () => {
    const note = await services.notes.create(USER, {
      techniqueId: first().id,
      timestampSec: 90,
      body: 'general thought',
    });

    expect(note.resourceId).toBeNull();
    expect(note.timestampSec).toBeNull();
  });

  it('ignores a resource id that does not belong to the technique', async () => {
    const note = await services.notes.create(USER, {
      techniqueId: first().id,
      resourceId: 'res_from_somewhere_else',
      timestampSec: 30,
      body: 'mismatched resource',
    });

    expect(note.resourceId).toBeNull();
    expect(note.timestampSec).toBeNull();
  });

  it('orders notes by position in the resource, untimed ones last', async () => {
    const resource = first().resources[0];
    if (!resource) throw new Error('fixture technique has no resources');

    await services.notes.create(USER, { techniqueId: first().id, body: 'no timestamp' });
    await services.notes.create(USER, {
      techniqueId: first().id,
      resourceId: resource.id,
      timestampSec: 370,
      body: 'later',
    });
    await services.notes.create(USER, {
      techniqueId: first().id,
      resourceId: resource.id,
      timestampSec: 42,
      body: 'earlier',
    });

    const notes = await services.notes.listForTechnique(USER, first().id);

    expect(notes.map((note) => note.body)).toEqual(['earlier', 'later', 'no timestamp']);
  });

  it('groups the notebook by technique with the skill it came from', async () => {
    await services.notes.create(USER, { techniqueId: first().id, body: 'a thought' });

    const [note] = await services.notes.listAll(USER);

    expect(note).toMatchObject({
      body: 'a thought',
      techniqueTitle: first().title,
      skill: 'guitar',
      pathId: path.id,
    });
  });

  it('edits a note body', async () => {
    const note = await services.notes.create(USER, {
      techniqueId: first().id,
      body: 'first draft',
    });

    const updated = await services.notes.update(USER, note.id, 'second draft');

    expect(updated.body).toBe('second draft');
    expect(updated.id).toBe(note.id);
  });

  it('deletes a note', async () => {
    const note = await services.notes.create(USER, { techniqueId: first().id, body: 'temporary' });

    await services.notes.remove(USER, note.id);

    expect(await services.notes.listForTechnique(USER, first().id)).toHaveLength(0);
  });

  describe('ownership', () => {
    it('refuses to attach a note to someone else’s technique', async () => {
      await expect(
        services.notes.create(OTHER, { techniqueId: first().id, body: 'not mine' }),
      ).rejects.toMatchObject({ code: 'NotFound' });
    });

    it('hides another user’s notes', async () => {
      await services.notes.create(USER, { techniqueId: first().id, body: 'private' });

      await expect(services.notes.listForTechnique(OTHER, first().id)).rejects.toMatchObject({
        code: 'NotFound',
      });
      expect(await services.notes.listAll(OTHER)).toHaveLength(0);
    });

    it('refuses to edit or delete a note it does not own', async () => {
      const note = await services.notes.create(USER, { techniqueId: first().id, body: 'mine' });

      await expect(services.notes.update(OTHER, note.id, 'hijacked')).rejects.toMatchObject({
        code: 'NotFound',
      });
      await expect(services.notes.remove(OTHER, note.id)).rejects.toMatchObject({
        code: 'NotFound',
      });
    });
  });
});
