import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { ProviderUnavailableError, RateLimitedError } from '../../lib/errors';
import { generateJson, type JsonModel } from './json-model';

const Schema = z.object({ title: z.string().min(3), count: z.number().int() });

function modelReturning(...responses: string[]): JsonModel {
  const complete = vi.fn();
  responses.forEach((response) => complete.mockResolvedValueOnce(response));

  return { name: 'stub', complete };
}

describe('generateJson', () => {
  it('parses a clean response', async () => {
    const model = modelReturning('{"title":"Chord transitions","count":3}');

    await expect(generateJson(model, Schema, { system: 's', user: 'u' })).resolves.toEqual({
      title: 'Chord transitions',
      count: 3,
    });
    expect(model.complete).toHaveBeenCalledTimes(1);
  });

  it('recovers JSON wrapped in code fences and prose', async () => {
    const model = modelReturning(
      'Sure! Here you go:\n```json\n{"title":"Barre chords","count":1}\n```\nHope that helps.',
    );

    await expect(generateJson(model, Schema, { system: 's', user: 'u' })).resolves.toEqual({
      title: 'Barre chords',
      count: 1,
    });
  });

  it('repairs once when the first response fails validation', async () => {
    const model = modelReturning('{"title":"no","count":"three"}', '{"title":"Strumming","count":3}');

    await expect(generateJson(model, Schema, { system: 's', user: 'u' })).resolves.toEqual({
      title: 'Strumming',
      count: 3,
    });
    expect(model.complete).toHaveBeenCalledTimes(2);
  });

  it('feeds the validation errors back into the repair attempt', async () => {
    const model = modelReturning('{"title":"no"}', '{"title":"Strumming","count":3}');

    await generateJson(model, Schema, { system: 's', user: 'original prompt' });

    const repairPrompt = vi.mocked(model.complete).mock.calls[1]?.[0].user ?? '';
    expect(repairPrompt).toContain('original prompt');
    expect(repairPrompt).toContain('count');
  });

  /** The per-minute limit is transient, so it must not degrade the request. */
  it('waits and retries once when rate limited', async () => {
    const complete = vi
      .fn()
      .mockRejectedValueOnce(new RateLimitedError('groq', 0))
      .mockResolvedValueOnce('{"title":"Strumming","count":3}');
    const model: JsonModel = { name: 'stub', complete };

    await expect(generateJson(model, Schema, { system: 's', user: 'u' })).resolves.toEqual({
      title: 'Strumming',
      count: 3,
    });
    expect(complete).toHaveBeenCalledTimes(2);
  });

  it('does not retry errors that will not clear on their own', async () => {
    const complete = vi.fn().mockRejectedValue(new ProviderUnavailableError('groq', 'HTTP 500'));
    const model: JsonModel = { name: 'stub', complete };

    await expect(generateJson(model, Schema, { system: 's', user: 'u' })).rejects.toMatchObject({
      code: 'ProviderUnavailable',
    });
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it('gives up with a typed error after one failed repair', async () => {
    const model = modelReturning('not json at all', 'still not json');

    await expect(generateJson(model, Schema, { system: 's', user: 'u' })).rejects.toMatchObject({
      code: 'ProviderInvalidOutput',
      status: 502,
    });
    expect(model.complete).toHaveBeenCalledTimes(2);
  });
});
