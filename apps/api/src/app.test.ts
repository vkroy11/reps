import type { OnboardingInput } from '@reps/core';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from './app';
import { createContainer } from './container';
import { createFakeGoogleVerifier } from './providers/auth/fake.provider';
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
      google: createFakeGoogleVerifier(),
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

  /**
   * Found by a live smoke test: body-parser's SyntaxError fell through to the
   * catch-all and blamed the server for a malformed client request.
   */
  it('blames the client, not itself, for unparseable JSON', async () => {
    const response = await request(app)
      .post('/api/notes')
      .set('x-device-id', DEVICE_ID)
      .set('content-type', 'application/json')
      .send('{"techniqueId": ');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('MalformedRequestBody');
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

    /** Two hobbies at once: the home screen focuses on paths[0]. */
    it('lists paths with the most recently practised first', async () => {
      const guitar = await request(app).post('/api/paths').set('x-device-id', DEVICE_ID).send(INPUT);
      const chess = await request(app)
        .post('/api/paths')
        .set('x-device-id', DEVICE_ID)
        .send({ ...INPUT, skill: 'chess', goal: 'stop losing pieces' });

      const listed = await request(app).get('/api/paths').set('x-device-id', DEVICE_ID);
      expect(listed.body.paths.map((path: { id: string }) => path.id)).toEqual([
        chess.body.path.id,
        guitar.body.path.id,
      ]);

      // Reflecting on a guitar technique brings guitar back into focus.
      await request(app)
        .post(`/api/techniques/${guitar.body.path.techniques[0].id}/reflect`)
        .set('x-device-id', DEVICE_ID)
        .send({ confidence: 'getting_there' });

      const reordered = await request(app).get('/api/paths').set('x-device-id', DEVICE_ID);
      expect(reordered.body.paths[0].id).toBe(guitar.body.path.id);
      expect(reordered.body.paths).toHaveLength(2);
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

  describe('notes', () => {
    async function pathWithTechnique() {
      const created = await request(app).post('/api/paths').set('x-device-id', DEVICE_ID).send(INPUT);

      return created.body.path;
    }

    it('writes and lists a note against a technique', async () => {
      const path = await pathWithTechnique();
      const technique = path.techniques[0];

      const created = await request(app)
        .post('/api/notes')
        .set('x-device-id', DEVICE_ID)
        .send({
          techniqueId: technique.id,
          resourceId: technique.resources[0].id,
          timestampSec: 222,
          body: 'keep the ring finger anchored',
        });

      expect(created.status).toBe(201);
      expect(created.body.note).toMatchObject({ timestampSec: 222 });

      const listed = await request(app)
        .get(`/api/notes?techniqueId=${technique.id}`)
        .set('x-device-id', DEVICE_ID);

      expect(listed.status).toBe(200);
      expect(listed.body.notes).toHaveLength(1);
    });

    it('returns the notebook with the technique and skill attached', async () => {
      const path = await pathWithTechnique();
      await request(app)
        .post('/api/notes')
        .set('x-device-id', DEVICE_ID)
        .send({ techniqueId: path.techniques[0].id, body: 'a thought' });

      const listed = await request(app).get('/api/notes').set('x-device-id', DEVICE_ID);

      expect(listed.body.notes[0]).toMatchObject({
        body: 'a thought',
        techniqueTitle: path.techniques[0].title,
        skill: 'guitar',
      });
    });

    it('edits and deletes a note', async () => {
      const path = await pathWithTechnique();
      const created = await request(app)
        .post('/api/notes')
        .set('x-device-id', DEVICE_ID)
        .send({ techniqueId: path.techniques[0].id, body: 'first' });

      const patched = await request(app)
        .patch(`/api/notes/${created.body.note.id}`)
        .set('x-device-id', DEVICE_ID)
        .send({ body: 'second' });
      expect(patched.body.note.body).toBe('second');

      const deleted = await request(app)
        .delete(`/api/notes/${created.body.note.id}`)
        .set('x-device-id', DEVICE_ID);
      expect(deleted.status).toBe(204);

      const listed = await request(app).get('/api/notes').set('x-device-id', DEVICE_ID);
      expect(listed.body.notes).toHaveLength(0);
    });

    it('rejects an empty note body', async () => {
      const path = await pathWithTechnique();

      const response = await request(app)
        .post('/api/notes')
        .set('x-device-id', DEVICE_ID)
        .send({ techniqueId: path.techniques[0].id, body: '   ' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('ValidationError');
    });

    it('hides another device\'s notes', async () => {
      const path = await pathWithTechnique();
      await request(app)
        .post('/api/notes')
        .set('x-device-id', DEVICE_ID)
        .send({ techniqueId: path.techniques[0].id, body: 'private' });

      const listed = await request(app).get('/api/notes').set('x-device-id', 'device-other-user-77');

      expect(listed.body.notes).toHaveLength(0);
    });
  });

  describe('xp and badges', () => {
    async function newPath() {
      const created = await request(app).post('/api/paths').set('x-device-id', DEVICE_ID).send(INPUT);

      return created.body.path;
    }

    function reflect(techniqueId: string, body: Record<string, unknown>) {
      return request(app)
        .post(`/api/techniques/${techniqueId}/reflect`)
        .set('x-device-id', DEVICE_ID)
        .send(body);
    }

    it('pays for practice minutes plus a first-reflection bonus', async () => {
      const path = await newPath();

      const response = await reflect(path.techniques[0].id, {
        confidence: 'solid',
        practiceMinutes: 20,
      });

      // 20 minutes at 2/min, plus 10 for reporting at all.
      expect(response.body.awarded).toMatchObject({ xp: 50, minutes: 20 });
      expect(response.body.path.xp).toBe(50);
    });

    /**
     * The property the whole game layer rests on. If "solid" paid better than
     * "struggling", the app would be paying learners to overstate how it went -
     * and confidence is the only signal the adaptation engine reads.
     */
    it('pays the same whatever the confidence', async () => {
      const struggled = await reflect((await newPath()).techniques[0].id, {
        confidence: 'struggling',
        practiceMinutes: 15,
      });
      const solid = await reflect((await newPath()).techniques[0].id, {
        confidence: 'solid',
        practiceMinutes: 15,
      });

      expect(struggled.body.awarded.xp).toBe(solid.body.awarded.xp);
    });

    it('caps an implausible practice claim', async () => {
      const path = await newPath();

      const response = await reflect(path.techniques[0].id, {
        confidence: 'solid',
        practiceMinutes: 600,
      });

      expect(response.body.awarded.minutes).toBe(60);
    });

    it('credits the minutes to the technique, for the mastery ring', async () => {
      const path = await newPath();
      await reflect(path.techniques[0].id, { confidence: 'getting_there', practiceMinutes: 8 });

      const fetched = await request(app)
        .get(`/api/paths/${path.id}`)
        .set('x-device-id', DEVICE_ID);

      expect(fetched.body.path.techniques[0].practiceMinutes).toBe(8);
    });

    it('drops the bonus on a second session against the same technique', async () => {
      const path = await newPath();
      await reflect(path.techniques[0].id, { confidence: 'getting_there', practiceMinutes: 10 });
      const second = await reflect(path.techniques[0].id, {
        confidence: 'solid',
        practiceMinutes: 10,
      });

      expect(second.body.awarded.xp).toBe(20);
    });

    it('awards no badge before a gate is reached', async () => {
      const path = await newPath();
      const response = await reflect(path.techniques[0].id, { confidence: 'solid' });

      expect(response.body.awarded.badge).toBeNull();
    });

    it('awards a stage badge named after its capstone on the third completion', async () => {
      const path = await newPath();

      await reflect(path.techniques[0].id, { confidence: 'solid' });
      await reflect(path.techniques[1].id, { confidence: 'solid' });
      const third = await reflect(path.techniques[2].id, { confidence: 'solid' });

      expect(third.body.awarded.badge).toMatchObject({
        stage: 1,
        label: path.techniques[2].title,
      });
      expect(third.body.path.badges).toHaveLength(1);
    });

    it('carries badges on the path list, so Today needs no second request', async () => {
      const path = await newPath();
      await reflect(path.techniques[0].id, { confidence: 'solid', practiceMinutes: 5 });
      await reflect(path.techniques[1].id, { confidence: 'solid' });
      await reflect(path.techniques[2].id, { confidence: 'solid' });

      const listed = await request(app).get('/api/paths').set('x-device-id', DEVICE_ID);

      expect(listed.body.paths[0].badges).toHaveLength(1);
      expect(listed.body.paths[0].xp).toBeGreaterThan(0);
    });

    /** A path with fewer than three techniques would otherwise gate on nothing. */
    it('does not award a stage the path has no gate for', async () => {
      const path = await newPath();

      for (const technique of path.techniques) {
        await reflect(technique.id, { confidence: 'solid' });
      }

      const fetched = await request(app)
        .get(`/api/paths/${path.id}`)
        .set('x-device-id', DEVICE_ID);
      const expected = Math.floor(path.techniques.length / 3);

      expect(fetched.body.path.badges).toHaveLength(expected);
    });

    it('records a session even when nothing was completed', async () => {
      const path = await newPath();
      const response = await reflect(path.techniques[0].id, {
        confidence: 'struggling',
        practiceMinutes: 12,
      });

      expect(response.body.awarded.xp).toBe(34);
      expect(response.body.path.techniques[0].status).toBe('active');
    });
  });

  describe('practice history', () => {
    it('is empty for a learner who has never practised', async () => {
      const response = await request(app).get('/api/progress/history').set('x-device-id', DEVICE_ID);

      expect(response.status).toBe(200);
      expect(response.body.entries).toEqual([]);
    });

    /**
     * Timestamps, not a computed streak. Bucketing days is a local-calendar
     * question and the server has no idea what timezone the caller is in - see
     * packages/core/src/streak.ts.
     */
    it('returns raw timestamps rather than a streak', async () => {
      const created = await request(app).post('/api/paths').set('x-device-id', DEVICE_ID).send(INPUT);
      await request(app)
        .post(`/api/techniques/${created.body.path.techniques[0].id}/reflect`)
        .set('x-device-id', DEVICE_ID)
        .send({ confidence: 'solid', practiceMinutes: 20 });

      const response = await request(app).get('/api/progress/history').set('x-device-id', DEVICE_ID);

      expect(response.body.entries).toHaveLength(1);
      expect(response.body.entries[0]).toMatchObject({ minutes: 20, xp: 50 });
      expect(typeof response.body.entries[0].at).toBe('string');
      expect(response.body).not.toHaveProperty('streak');
    });

    it('covers every path, because a streak is about the learner not a path', async () => {
      const guitar = await request(app).post('/api/paths').set('x-device-id', DEVICE_ID).send(INPUT);
      const chess = await request(app)
        .post('/api/paths')
        .set('x-device-id', DEVICE_ID)
        .send({ ...INPUT, skill: 'chess', goal: 'stop losing pieces' });

      for (const path of [guitar, chess]) {
        await request(app)
          .post(`/api/techniques/${path.body.path.techniques[0].id}/reflect`)
          .set('x-device-id', DEVICE_ID)
          .send({ confidence: 'getting_there', practiceMinutes: 10 });
      }

      const response = await request(app).get('/api/progress/history').set('x-device-id', DEVICE_ID);

      expect(response.body.entries).toHaveLength(2);
      expect(new Set(response.body.entries.map((e: { pathId: string }) => e.pathId)).size).toBe(2);
    });

    it('hides another learner\'s practice', async () => {
      const created = await request(app).post('/api/paths').set('x-device-id', DEVICE_ID).send(INPUT);
      await request(app)
        .post(`/api/techniques/${created.body.path.techniques[0].id}/reflect`)
        .set('x-device-id', DEVICE_ID)
        .send({ confidence: 'solid', practiceMinutes: 20 });

      const response = await request(app)
        .get('/api/progress/history')
        .set('x-device-id', 'device-someone-else-99');

      expect(response.body.entries).toEqual([]);
    });
  });

  describe('optional sign-in', () => {
    const ALICE = 'fake:google-alice:alice@example.com';
    const BOB = 'fake:google-bob:bob@example.com';

    function device(id: string) {
      return { 'x-device-id': id };
    }

    async function createPath(deviceId: string, overrides: Partial<OnboardingInput> = {}) {
      const created = await request(app)
        .post('/api/paths')
        .set(device(deviceId))
        .send({ ...INPUT, ...overrides });

      return created.body.path;
    }

    async function signIn(deviceId: string, idToken: string) {
      return request(app).post('/api/auth/google').set(device(deviceId)).send({ idToken });
    }

    it('says whether sign-in is even possible, without requiring identity', async () => {
      const response = await request(app).get('/api/auth/status');

      expect(response.status).toBe(200);
      expect(response.body.available).toBe(true);
    });

    it('rejects a token it cannot verify', async () => {
      const response = await signIn('device-anonymous-1', 'not-a-real-token');

      expect(response.status).toBe(401);
    });

    /** The whole point of "optional": using the app first must cost nothing. */
    it('keeps the work done before signing in', async () => {
      const path = await createPath('device-anonymous-1');
      await request(app)
        .post('/api/notes')
        .set(device('device-anonymous-1'))
        .send({ techniqueId: path.techniques[0].id, body: 'thumb behind the neck' });

      const signedIn = await signIn('device-anonymous-1', ALICE);
      expect(signedIn.status).toBe(200);
      expect(signedIn.body.claimed).toBe(false);

      const listed = await request(app)
        .get('/api/paths')
        .set('authorization', `Bearer ${signedIn.body.token}`)
        .set(device('device-anonymous-1'));

      expect(listed.body.paths).toHaveLength(1);
      expect(listed.body.paths[0].id).toBe(path.id);
    });

    it('is the same learner whether the token is sent or not', async () => {
      const path = await createPath('device-anonymous-1');
      const { body } = await signIn('device-anonymous-1', ALICE);

      const withToken = await request(app)
        .get('/api/paths')
        .set('authorization', `Bearer ${body.token}`)
        .set(device('device-anonymous-1'));
      const withoutToken = await request(app).get('/api/paths').set(device('device-anonymous-1'));

      expect(withToken.body.paths[0].id).toBe(path.id);
      expect(withoutToken.body.paths[0].id).toBe(path.id);
    });

    describe('signing in on a second device', () => {
      it('merges both sides rather than picking one', async () => {
        const guitar = await createPath('device-one-aaaa');
        await signIn('device-one-aaaa', ALICE);

        const chess = await createPath('device-two-bbbb', {
          skill: 'chess',
          goal: 'stop losing pieces',
        });
        const claimed = await signIn('device-two-bbbb', ALICE);

        expect(claimed.body.claimed).toBe(true);

        const listed = await request(app)
          .get('/api/paths')
          .set('authorization', `Bearer ${claimed.body.token}`)
          .set(device('device-two-bbbb'));
        const ids = listed.body.paths.map((path: { id: string }) => path.id);

        expect(ids).toHaveLength(2);
        expect(ids).toContain(guitar.id);
        expect(ids).toContain(chess.id);
      });

      it('carries notes and practice history across too', async () => {
        await signIn('device-one-aaaa', ALICE);

        const path = await createPath('device-two-bbbb');
        await request(app)
          .post('/api/notes')
          .set(device('device-two-bbbb'))
          .send({ techniqueId: path.techniques[0].id, body: 'from the second device' });
        await request(app)
          .post(`/api/techniques/${path.techniques[0].id}/reflect`)
          .set(device('device-two-bbbb'))
          .send({ confidence: 'solid', practiceMinutes: 20 });

        const { body } = await signIn('device-two-bbbb', ALICE);
        const auth = { authorization: `Bearer ${body.token}` };

        const notes = await request(app).get('/api/notes').set(auth).set(device('device-two-bbbb'));
        const history = await request(app)
          .get('/api/progress/history')
          .set(auth)
          .set(device('device-two-bbbb'));

        expect(notes.body.notes).toHaveLength(1);
        expect(history.body.entries).toHaveLength(1);
        expect(history.body.entries[0].xp).toBe(50);
      });

      it('leaves the first device signed in and intact', async () => {
        const guitar = await createPath('device-one-aaaa');
        const first = await signIn('device-one-aaaa', ALICE);
        await createPath('device-two-bbbb', { skill: 'chess', goal: 'stop losing pieces' });
        await signIn('device-two-bbbb', ALICE);

        const stillThere = await request(app)
          .get('/api/paths')
          .set('authorization', `Bearer ${first.body.token}`)
          .set(device('device-one-aaaa'));

        expect(stillThere.body.paths.map((p: { id: string }) => p.id)).toContain(guitar.id);
      });
    });

    it('keeps two accounts apart', async () => {
      const alicePath = await createPath('device-one-aaaa');
      const aliceIn = await signIn('device-one-aaaa', ALICE);

      await createPath('device-two-bbbb', { skill: 'chess', goal: 'stop losing pieces' });
      const bobIn = await signIn('device-two-bbbb', BOB);

      const bobsPaths = await request(app)
        .get('/api/paths')
        .set('authorization', `Bearer ${bobIn.body.token}`)
        .set(device('device-two-bbbb'));

      expect(bobsPaths.body.paths.map((p: { id: string }) => p.id)).not.toContain(alicePath.id);
      expect(aliceIn.body.user.googleId).not.toBe(bobIn.body.user.googleId);
    });

    describe('signing out', () => {
      it('leaves this device with a clean slate', async () => {
        await createPath('device-one-aaaa');
        const { body } = await signIn('device-one-aaaa', ALICE);

        await request(app)
          .post('/api/auth/sign-out')
          .set('authorization', `Bearer ${body.token}`)
          .set(device('device-one-aaaa'));

        const after = await request(app).get('/api/paths').set(device('device-one-aaaa'));

        expect(after.body.paths).toEqual([]);
      });

      /** Signing out must not be a way to lose an account's work. */
      it('does not touch the account, so signing back in restores everything', async () => {
        const path = await createPath('device-one-aaaa');
        const first = await signIn('device-one-aaaa', ALICE);

        await request(app)
          .post('/api/auth/sign-out')
          .set('authorization', `Bearer ${first.body.token}`)
          .set(device('device-one-aaaa'));

        const again = await signIn('device-one-aaaa', ALICE);
        const listed = await request(app)
          .get('/api/paths')
          .set('authorization', `Bearer ${again.body.token}`)
          .set(device('device-one-aaaa'));

        expect(listed.body.paths.map((p: { id: string }) => p.id)).toContain(path.id);
      });
    });

    describe('a token that is not good', () => {
      /**
       * Rejected rather than falling back to the device identity. A silent
       * fallback would start writing to a fresh anonymous user, and the
       * learner would watch their paths vanish with no error to explain it.
       */
      it('is refused rather than downgraded to anonymous', async () => {
        await createPath('device-one-aaaa');

        const response = await request(app)
          .get('/api/paths')
          .set('authorization', 'Bearer not.a.jwt')
          .set(device('device-one-aaaa'));

        expect(response.status).toBe(401);
      });

      it('still requires a device id even with a valid token', async () => {
        await createPath('device-one-aaaa');
        const { body } = await signIn('device-one-aaaa', ALICE);

        const response = await request(app)
          .get('/api/paths')
          .set('authorization', `Bearer ${body.token}`);

        expect(response.status).toBe(401);
      });
    });

    it('reports who is signed in', async () => {
      const { body } = await signIn('device-one-aaaa', ALICE);

      const me = await request(app)
        .get('/api/auth/me')
        .set('authorization', `Bearer ${body.token}`)
        .set(device('device-one-aaaa'));

      expect(me.body.user).toMatchObject({ googleId: 'google-alice', email: 'alice@example.com' });
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
