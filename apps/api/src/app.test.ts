import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from './app';

describe('app', () => {
  it('reports healthy', async () => {
    const response = await request(createApp()).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });

  it('returns a 404 payload for unknown routes', async () => {
    const response = await request(createApp()).get('/api/nope');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'NotFound' });
  });
});
