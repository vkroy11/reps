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
  // No retries by default: most tests are about what one call does, and the
  // real schedule waits forty seconds. The retry tests opt back in.
  return createApiClient({
    baseUrl: 'http://api.test',
    deviceId: DEVICE_ID,
    fetchImpl,
    retry: { attempts: 0 },
  });
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
    const client = clientWith((async () =>
      jsonResponse({ suggestions: { archetype: 'motor' } })) as typeof fetch);

    await expect(client.suggestions('guitar')).rejects.toMatchObject({
      code: 'UnexpectedResponse',
    });
  });

  it('maps the API error taxonomy onto ApiError', async () => {
    const client = clientWith((async () =>
      jsonResponse(
        { error: 'QuotaExhausted', message: 'Daily quota for YouTube is exhausted' },
        { status: 429 },
      )) as typeof fetch);

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

  /**
   * A free instance sleeps after fifteen minutes idle, and the request that
   * wakes it fails while it boots. Before this, the first thing anyone saw
   * after an hour away was a failure and a retry button.
   */
  describe('waking a sleeping host', () => {
    function retrying(fetchImpl: typeof fetch, attempts = 4) {
      return createApiClient({
        baseUrl: 'http://api.test',
        deviceId: DEVICE_ID,
        fetchImpl,
        // Real schedule, compressed: the arithmetic is the same, the waiting
        // is not.
        retry: { attempts, baseMs: 1 },
      });
    }

    it('retries a read that could not connect, then succeeds', async () => {
      let calls = 0;
      const client = retrying((async () => {
        calls += 1;
        if (calls < 3) throw new TypeError('Network request failed');

        return jsonResponse({ paths: [] });
      }) as unknown as typeof fetch);

      await expect(client.listPaths()).resolves.toEqual([]);
      expect(calls).toBe(3);
    });

    /** A sleeping host answers through its router, not its app. */
    it('retries a 503 from the router', async () => {
      let calls = 0;
      const client = retrying((async () => {
        calls += 1;
        if (calls < 2) return new Response('', { status: 503 });

        return jsonResponse({ paths: [] });
      }) as unknown as typeof fetch);

      await expect(client.listPaths()).resolves.toEqual([]);
      expect(calls).toBe(2);
    });

    it('gives up after four retries rather than hanging for ever', async () => {
      let calls = 0;
      const client = retrying((async () => {
        calls += 1;
        throw new TypeError('Network request failed');
      }) as unknown as typeof fetch);

      const error = (await client.listPaths().catch((c: unknown) => c)) as ApiError;

      expect(error.code).toBe('NetworkError');
      // The first attempt plus four retries.
      expect(calls).toBe(5);
    });

    it('does not retry a real error from the app', async () => {
      let calls = 0;
      const client = retrying((async () => {
        calls += 1;

        return new Response(JSON.stringify({ error: 'NotFound' }), { status: 404 });
      }) as unknown as typeof fetch);

      await expect(client.listPaths()).rejects.toBeInstanceOf(ApiError);
      expect(calls).toBe(1);
    });

    /**
     * The load-bearing one. A request that timed out may still have been
     * processed, so sending `reflect` again would credit the practice twice.
     */
    it('never re-sends a mutation', async () => {
      let calls = 0;
      const client = retrying((async () => {
        calls += 1;
        throw new TypeError('Network request failed');
      }) as unknown as typeof fetch);

      await expect(
        client.reflect('tec_1', { confidence: 'solid', practiceMinutes: 20 }),
      ).rejects.toBeInstanceOf(ApiError);
      expect(calls).toBe(1);
    });

    /** Generates nothing and stores nothing, so it opts back in by hand. */
    it('retries onboarding suggestions, which only reads', async () => {
      let calls = 0;
      const client = retrying((async () => {
        calls += 1;
        if (calls < 2) throw new TypeError('Network request failed');

        return jsonResponse({ suggestions });
      }) as unknown as typeof fetch);

      await expect(client.suggestions('guitar')).resolves.toMatchObject({ archetype: 'motor' });
      expect(calls).toBe(2);
    });
  });
});
