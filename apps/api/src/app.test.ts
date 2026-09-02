import type { OnboardingInput } from '@reps/core';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from './app';
import { createContainer } from './container';
import { createFakeAiProvider } from './providers/ai/fake.provider';
import { createFakeResourceProvider } from './providers/resources/fake.provider';
import { createMemoryRepositories } from './repositories/memory';

const DEVICE_ID = 'device-abcdef123456';

const INPUT: OnboardingInput = {
  skill: 'guitar',
  goal: 'play 5 songs at a campfire',
  level: 'I know a few chords but changes are slow',
  dailyMinutes: 20,
  daysPerWeek: 5,
  preferredFormats: ['video'],
  language: 'en',
};

// Storage is passed explicitly so these stay hermetic even when a real
// DATABASE_URL is configured for local development.
function testApp() {
  return createApp(
    createContainer({
      ai: createFakeAiProvider(),
      resources: createFakeResourceProvider(),
      repositories: createMemoryRepositories(),
    }),
  );
}

describe('API', () => {
  let app: ReturnType<typeof testApp>;

  beforeEach(() => {
    app = testApp();
  });

  it('reports healthy without any identity', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });

  it('returns a 404 payload for unknown routes', async () => {
    const response = await request(app).get('/api/nope').set('x-device-id', DEVICE_ID);

    expect(response.status).toBe(404);
  });

  describe('identity', () => {
    it('rejects requests with no device id', async () => {
      const response = await request(app).get('/api/paths');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });

    it('rejects an implausibly short device id', async () => {
      const response = await request(app).get('/api/paths').set('x-device-id', 'abc');

      expect(response.status).toBe(401);
    });
  });

  describe('onboarding', () => {
    it('returns skill-specific goals and levels', async () => {
      const response = await request(app)
        .post('/api/onboarding/suggestions')
        .set('x-device-id', DEVICE_ID)
        .send({ skill: 'guitar' });

      expect(response.status).toBe(200);
      expect(response.body.suggestions.goals.length).toBeGreaterThanOrEqual(3);
      expect(response.body.suggestions.levels.length).toBeGreaterThanOrEqual(3);
    });

    it('validates the request body', async () => {
      const response = await request(app)
        .post('/api/onboarding/suggestions')
        .set('x-device-id', DEVICE_ID)
        .send({ skill: '' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('ValidationError');
    });
  });

  describe('the main flow', () => {
    it('creates a path, opens a technique, and records a reflection', async () => {
      const created = await request(app)
        .post('/api/paths')
        .set('x-device-id', DEVICE_ID)
        .send(INPUT);

      expect(created.status).toBe(201);

      const path = created.body.path;
      expect(path.techniques.length).toBeGreaterThanOrEqual(5);
      expect(path.techniques.length).toBeLessThanOrEqual(8);
      expect(path.techniques[0].status).toBe('active');
      expect(path.techniques[0].resources.length).toBeGreaterThan(0);

      const listed = await request(app).get('/api/paths').set('x-device-id', DEVICE_ID);
      expect(listed.status).toBe(200);
      expect(listed.body.paths).toHaveLength(1);
      expect(listed.body.paths[0].techniqueCount).toBe(path.techniques.length);

      const fetched = await request(app)
        .get(`/api/paths/${path.id}`)
        .set('x-device-id', DEVICE_ID);
      expect(fetched.status).toBe(200);
      expect(fetched.body.path.id).toBe(path.id);

      const laterTechniqueId = path.techniques[3].id;
      const opened = await request(app)
        .get(`/api/techniques/${laterTechniqueId}`)
        .set('x-device-id', DEVICE_ID);
      expect(opened.status).toBe(200);
      expect(opened.body.technique.resources.length).toBeGreaterThan(0);

      const content = await request(app)
        .get(`/api/techniques/${path.techniques[0].id}/content`)
        .set('x-device-id', DEVICE_ID);
      expect(content.status).toBe(200);
      expect(content.body.content.format).toBe('drill');

      const reflected = await request(app)
        .post(`/api/techniques/${path.techniques[0].id}/reflect`)
        .set('x-device-id', DEVICE_ID)
        .send({ confidence: 'solid', practiceMinutes: 12 });

      expect(reflected.status).toBe(200);
      expect(reflected.body.path.techniques[0].status).toBe('completed');
      expect(reflected.body.path.techniques[1].status).toBe('active');
      expect(reflected.body.intervention).toBeNull();
    });

    it('rejects an invalid onboarding payload', async () => {
      const response = await request(app)
        .post('/api/paths')
        .set('x-device-id', DEVICE_ID)
        .send({ ...INPUT, dailyMinutes: 0 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('ValidationError');
    });

    it('hides another device\'s path', async () => {
      const created = await request(app)
        .post('/api/paths')
        .set('x-device-id', DEVICE_ID)
        .send(INPUT);

      const response = await request(app)
        .get(`/api/paths/${created.body.path.id}`)
        .set('x-device-id', 'device-someone-else-99');

      expect(response.status).toBe(404);
    });
  });

  describe('adaptation', () => {
    it('inserts an easier step when a technique is too hard', async () => {
      const created = await request(app)
        .post('/api/paths')
        .set('x-device-id', DEVICE_ID)
        .send(INPUT);
      const path = created.body.path;

      const response = await request(app)
        .post(`/api/techniques/${path.techniques[0].id}/too-hard`)
        .set('x-device-id', DEVICE_ID);

      expect(response.status).toBe(200);
      expect(response.body.path.techniques).toHaveLength(path.techniques.length + 1);
      expect(response.body.path.techniques[0].bridgeForTechniqueId).toBe(path.techniques[0].id);
    });

    it('replaces the tail when a technique is not for the learner', async () => {
      const created = await request(app)
        .post('/api/paths')
        .set('x-device-id', DEVICE_ID)
        .send(INPUT);
      const path = created.body.path;

      const response = await request(app)
        .post(`/api/techniques/${path.techniques[1].id}/skip`)
        .set('x-device-id', DEVICE_ID);

      expect(response.status).toBe(200);
      expect(response.body.path.techniques[1].status).toBe('skipped');
      expect(response.body.path.techniques[0].id).toBe(path.techniques[0].id);
    });

    it('maps a conflicting action to 409', async () => {
      const created = await request(app)
        .post('/api/paths')
        .set('x-device-id', DEVICE_ID)
        .send(INPUT);
      const path = created.body.path;

      const response = await request(app)
        .post(`/api/techniques/${path.techniques[2].id}/reflect`)
        .set('x-device-id', DEVICE_ID)
        .send({ confidence: 'solid' });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('Conflict');
    });

    it('maps an unknown technique to 404', async () => {
      const response = await request(app)
        .post('/api/techniques/tec_missing/skip')
        .set('x-device-id', DEVICE_ID);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('NotFound');
    });
  });
});
