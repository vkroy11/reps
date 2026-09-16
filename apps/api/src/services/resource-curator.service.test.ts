import { describe, expect, it } from 'vitest';
import { createFakeAiProvider } from '../providers/ai/fake.provider';
import { createFakeResourceProvider } from '../providers/resources/fake.provider';
import { createResourceCurator, type CuratablePath, type CuratableTechnique } from './resource-curator.service';

const PATH: CuratablePath = {
  id: 'path_1',
  skill: 'guitar',
  goal: 'play 5 songs at a campfire',
  level: 'I know a few chords',
  language: 'en',
  dailyMinutes: 20,
  daysPerWeek: 5,
  preferredFormats: ['video'],
};

function technique(modality: CuratableTechnique['modality']): CuratableTechnique {
  return {
    id: 'tec_1',
    title: 'Open chord changes',
    whyItMatters: 'Songs stall here.',
    modality,
    practicePrompt: 'G -> C -> G -> D, 10 clean reps',
    estimatedMinutes: 15,
    searchQueries: ['beginner guitar chord changes'],
  };
}

function curator() {
  return createResourceCurator({
    ai: createFakeAiProvider(),
    resources: createFakeResourceProvider(),
  });
}

describe('resource curator', () => {
  it('puts a video first and an article alongside it for a hands-on technique', async () => {
    const resources = await curator().curate(PATH, technique('watch_and_do'));
    const formats = resources.map((resource) => resource.format);

    expect(formats[0]).toBe('video');
    expect(formats).toContain('article');
  });

  it('does not attach a video when reading is the only preference and the skill can be read', async () => {
    const resources = await curator().curate(
      { ...PATH, skill: 'chess', preferredFormats: ['article'] },
      technique('drill'),
    );

    expect(resources.length).toBeGreaterThan(0);
    expect(resources.every((resource) => resource.format !== 'video')).toBe(true);
  });

  it('writes a short lesson when nothing readable was found', async () => {
    const empty = {
      name: 'empty',
      search: async () => [],
    };
    const resources = await createResourceCurator({
      ai: createFakeAiProvider(),
      resources: empty,
    }).curate({ ...PATH, preferredFormats: ['article'] }, technique('drill'));

    expect(resources).toHaveLength(1);
    expect(resources[0]?.format).toBe('ai_lesson');
    expect(resources[0]?.source).toBe('Reps');
    expect(resources[0]?.body).toBeTruthy();
  });
});
