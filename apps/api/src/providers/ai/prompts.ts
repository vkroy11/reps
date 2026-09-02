import { MAX_TECHNIQUES, MIN_TECHNIQUES } from '@reps/core';
import type {
  GenerateBridgeInput,
  GenerateContentInput,
  PathContext,
  RankResourcesInput,
  RegenerateTailInput,
} from './types';

/**
 * House rules for every call. The two that matter most: JSON only, and the
 * model may never emit a URL - it emits search intent and the resource layer
 * resolves it against a real API.
 */
export const SYSTEM_PROMPT = [
  'You are the planning engine for Reps, an app that gets someone to a specific hobby goal',
  'using the fewest techniques possible.',
  '',
  'Rules:',
  '- Reply with JSON only. No prose, no code fences.',
  '- Never invent URLs, video IDs, channel names, or titles of specific content.',
  '  You may only emit search queries; something else resolves them.',
  '- Prefer the smallest set of techniques that reaches the stated goal. Omit anything',
  '  the goal does not require, however standard it is in the hobby.',
  '- Techniques are things the learner DOES, not topics they read about.',
  '- Write in the second person, plainly, with no hype or motivational filler.',
].join('\n');

function describeContext(context: PathContext): string {
  return [
    `Skill: ${context.skill}`,
    `Goal: ${context.goal}`,
    `Current level: ${context.level}`,
    `Time available: ${context.dailyMinutes} minutes a day, ${context.daysPerWeek} days a week`,
    `Preferred formats: ${context.preferredFormats.join(', ') || 'no preference'}`,
    `Resource language: ${context.language}`,
  ].join('\n');
}

/** Repeated in several prompts because it is the rule most worth enforcing. */
const MODALITY_RULES = [
  'Choose modality from what the skill demands, not from the stated preference:',
  '- watch_and_do: physical or timing skills. Cannot be learned by reading.',
  '- drill: decisions under pressure, repeated on concrete cases.',
  '- flashcards: many discrete items that must be recalled.',
  '- produce_and_critique: making work and judging it honestly.',
].join('\n');

const TECHNIQUE_FIELD_RULES = [
  'For each technique:',
  '- title: 2-5 words naming the skill itself',
  '- whyItMatters: one sentence tied to the goal above',
  '- modality: watch_and_do | drill | flashcards | produce_and_critique',
  '- practicePrompt: the exact rep to perform, with counts, tempo, or duration',
  '- estimatedMinutes: must fit inside the daily time budget',
  '- searchQueries: 1-3 queries that would find a good tutorial for this technique',
  '  at this level. Plain search phrasing, no site names.',
].join('\n');

export function onboardingSuggestionsPrompt(skill: string): string {
  return [
    `Skill: ${skill}`,
    '',
    'Classify the skill archetype:',
    'motor (physical repetition), strategic (decisions under pressure),',
    'recall (memorising many items), craft (producing work).',
    '',
    'Then write onboarding options specific to this skill.',
    '',
    'goals: 3-4 concrete things someone might want to be able to DO.',
    'Each must be a finishable outcome, not "get better". Think "play 5 songs',
    'at a campfire", not "learn music theory".',
    '',
    'levels: 3-4 descriptions of where someone might be starting, written in the',
    'first person and specific to this skill. Never "Beginner/Intermediate/Advanced" -',
    'those tell us nothing. Order them from least to most experienced.',
    '',
    'JSON shape:',
    '{"archetype":"motor","goals":[{"label":"...","description":"..."}],',
    ' "levels":[{"label":"...","description":"..."}]}',
  ].join('\n');
}

export function generatePathPrompt(context: PathContext): string {
  return [
    describeContext(context),
    '',
    `Produce ${MIN_TECHNIQUES}-${MAX_TECHNIQUES} techniques, ordered so each one depends only`,
    'on techniques before it. The last technique should be the goal itself.',
    '',
    'Also classify the skill archetype: motor, strategic, recall, or craft.',
    '',
    MODALITY_RULES,
    '',
    TECHNIQUE_FIELD_RULES,
    '',
    'JSON shape:',
    '{"archetype":"motor","techniques":[{"title":"...","whyItMatters":"...",',
    ' "modality":"watch_and_do","practicePrompt":"...","estimatedMinutes":15,',
    ' "searchQueries":["..."]}]}',
  ].join('\n');
}

export function regenerateTailPrompt(input: RegenerateTailInput): string {
  return [
    describeContext(input.context),
    `Skill archetype: ${input.archetype}`,
    '',
    `Already mastered: ${input.completedTitles.join(', ') || 'nothing yet'}`,
    `The learner rejected this technique and does not want it back: "${input.rejectedTitle}"`,
    '',
    `Produce exactly ${input.count} replacement technique(s) that still reach the goal`,
    'without the rejected technique or a renamed version of it. Take a genuinely',
    'different route.',
    '',
    TECHNIQUE_FIELD_RULES,
    '',
    'JSON shape: {"techniques":[{...}]}',
  ].join('\n');
}

export function generateBridgePrompt(input: GenerateBridgeInput): string {
  return [
    describeContext(input.context),
    '',
    `Already mastered: ${input.completedTitles.join(', ') || 'nothing yet'}`,
    `This technique is too hard right now: "${input.hardTechnique.title}"`,
    `(${input.hardTechnique.whyItMatters})`,
    '',
    'Produce exactly ONE easier technique to do first: the smallest missing',
    'prerequisite that makes the hard one reachable. It must be noticeably easier,',
    'not the same thing reworded, and it must lead directly into the hard one.',
    '',
    TECHNIQUE_FIELD_RULES,
    '',
    'JSON shape: {"techniques":[{...}]}',
  ].join('\n');
}

export function rankResourcesPrompt(input: RankResourcesInput): string {
  const candidates = input.candidates.map((candidate) =>
    [
      `id: ${candidate.id}`,
      `title: ${candidate.title}`,
      `source: ${candidate.source}`,
      candidate.durationSec === null
        ? 'duration: unknown'
        : `duration: ${Math.round(candidate.durationSec / 60)} min`,
      // Truncated hard: descriptions are the bulk of this prompt's token cost.
      candidate.description ? `description: ${candidate.description.slice(0, 150)}` : null,
    ]
      .filter(Boolean)
      .join('\n'),
  );

  return [
    describeContext(input.context),
    '',
    `Technique: ${input.technique.title}`,
    `Why it matters: ${input.technique.whyItMatters}`,
    `Practice modality: ${input.technique.modality}`,
    '',
    'Candidates:',
    '',
    candidates.join('\n---\n'),
    '',
    'Pick the best 1-2 candidates for THIS technique at THIS level. Prefer short,',
    'demonstration-heavy resources that fit the daily time budget. Reject channel',
    'trailers, hour-long lectures, clickbait, and anything that teaches the wrong',
    'level. Use only the ids listed above.',
    '',
    'For each pick, give a one-line reason addressed to the learner explaining why',
    'this one and not the others.',
    '',
    'JSON shape: {"selections":[{"candidateId":"...","reason":"..."}]}',
  ].join('\n');
}

export function generateContentPrompt(input: GenerateContentInput): string {
  const shared = [
    describeContext(input.context),
    '',
    `Technique: ${input.technique.title}`,
    `Why it matters: ${input.technique.whyItMatters}`,
    `The rep: ${input.technique.practicePrompt}`,
    '',
  ];

  if (input.format === 'flashcards') {
    return [
      ...shared,
      'Write 5-12 flashcards for this technique. Front is a short prompt, back is a',
      'concise answer. Cards must cover things worth recalling from memory, not',
      'trivia and not definitions of words.',
      '',
      'JSON shape: {"format":"flashcards","cards":[{"front":"...","back":"..."}]}',
    ].join('\n');
  }

  if (input.format === 'drill') {
    return [
      ...shared,
      `Write a practice drill that fits in ${input.context.dailyMinutes} minutes.`,
      '2-6 steps, each one an instruction the learner performs. Include tempo,',
      'counts, or repetitions where they apply. successCriteria must be something',
      'the learner can observe about their own performance, not a feeling.',
      '',
      'JSON shape: {"format":"drill","steps":["..."],"durationMinutes":10,',
      ' "successCriteria":"..."}',
    ].join('\n');
  }

  return [
    ...shared,
    'Write a micro-lesson: at most 300 words of markdown explaining just enough to',
    'do the rep above. No history, no theory the rep does not need. Then 2-5 key',
    'points worth remembering.',
    '',
    'JSON shape: {"format":"ai_lesson","title":"...","body":"markdown",',
    ' "keyPoints":["..."]}',
  ].join('\n');
}
