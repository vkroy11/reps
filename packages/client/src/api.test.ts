import { describe, expect, it, vi } from 'vitest';
import { createApiClient } from './api';
import { ApiError } from './errors';

const DEVICE_ID = 'device-test-123456';

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  });
}

function clientWith(fetchImpl: typeof fetch) {
  return createApiClient({ baseUrl: 'http://api.test', deviceId: DEVICE_ID, fetchImpl });
}

const suggestions = {
  archetype: 'motor',
  goals: [
    { label: 'Play 5 songs', description: 'A finishable outcome.' },
    { label: 'Play fingerstyle', description: 'Cleanly, at tempo.' },
    { label: 'Jam with friends', description: 'Keep up in a group.' },
  ],
  levels: [
    { label: 'Never held one', description: 'Starting from nothing.' },
    { label: 'A few chords', description: 'Changes are slow.' },
    { label: 'Can play songs', description: 'Want cleaner technique.' },
  ],
};

describe('createApiClient', () => {
  it('sends the device id as identity', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ suggestions }));

    await clientWith(fetchImpl as unknown as typeof fetch).suggestions('guitar');

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('http://api.test/api/onboarding/suggestions');
    expect((init.headers as Record<string, string>)['x-device-id']).toBe(DEVICE_ID);
    expect(init.body).toBe(JSON.stringify({ skill: 'guitar' }));
  });

  it('returns validated suggestions', async () => {
    const client = clientWith((async () => jsonResponse({ suggestions })) as typeof fetch);

    await expect(client.suggestions('guitar')).resolves.toMatchObject({ archetype: 'motor' });
  });

  /** A shape change in the API must surface here, not three screens later. */
  it('rejects a response that does not match the contract', async () => {
    const client = clientWith(
      (async () => jsonResponse({ suggestions: { archetype: 'motor' } })) as typeof fetch,
    );

    await expect(client.suggestions('guitar')).rejects.toMatchObject({
      code: 'UnexpectedResponse',
    });
  });

  it('maps the API error taxonomy onto ApiError', async () => {
    const client = clientWith(
      (async () =>
        jsonResponse(
          { error: 'QuotaExhausted', message: 'Daily quota for YouTube is exhausted' },
          { status: 429 },
        )) as typeof fetch,
    );

    const error = await client.suggestions('guitar').catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: 'QuotaExhausted', status: 429 });
    // The path is still buildable without videos, so the UI offers a fallback.
    expect((error as ApiError).isDegradable).toBe(true);
  });

  it('surfaces Retry-After so the UI can back off honestly', async () => {
    const client = clientWith(
      (async () =>
        new Response(JSON.stringify({ error: 'RateLimited', message: 'groq is rate limited' }), {
          status: 429,
          headers: { 'content-type': 'application/json', 'retry-after': '7' },
        })) as typeof fetch,
    );

    const error = (await client.suggestions('guitar').catch((c: unknown) => c)) as ApiError;

    expect(error.code).toBe('RateLimited');
    expect(error.retryAfterSeconds).toBe(7);
    expect(error.isRetryable).toBe(true);
  });

  it('reports an unreachable API as a network error, not a crash', async () => {
    const client = clientWith((() => {
      throw new TypeError('Network request failed');
    }) as unknown as typeof fetch);

    const error = (await client.listPaths().catch((c: unknown) => c)) as ApiError;

    expect(error.code).toBe('NetworkError');
    expect(error.isRetryable).toBe(true);
  });

  it('treats a non-JSON body as an unexpected response', async () => {
    const client = clientWith(
      (async () => new Response('<html>gateway</html>', { status: 200 })) as typeof fetch,
    );

    await expect(client.listPaths()).rejects.toMatchObject({ code: 'UnexpectedResponse' });
  });

  it('health() answers false instead of throwing', async () => {
    const client = clientWith((() => {
      throw new Error('offline');
    }) as unknown as typeof fetch);

    await expect(client.health()).resolves.toBe(false);
  });
});
