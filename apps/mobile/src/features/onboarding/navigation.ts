import { stepAfter, type OnboardingFlowStep } from '@reps/client';
import type { Href } from 'expo-router';

/**
 * The flow's step order lives in `@reps/client`, which knows nothing about
 * routes. This is the one place that maps a step to a URL.
 *
 * The map is written out rather than built by template, because Expo Router's
 * typed routes are literal string unions: `/onboarding/${step}` widens to a
 * string and stops being checked, which is exactly how a typo in a step name
 * would reach production as a blank screen.
 */
const HREF: Record<OnboardingFlowStep, Href> = {
  skill: '/onboarding/skill',
  goal: '/onboarding/goal',
  cheer1: '/onboarding/cheer1',
  level: '/onboarding/level',
  time: '/onboarding/time',
  cheer2: '/onboarding/cheer2',
  formats: '/onboarding/formats',
};

export function hrefFor(step: OnboardingFlowStep): Href {
  return HREF[step];
}

/**
 * Where a step goes when it is answered. Past the last question that is the
 * generating screen, which sits outside the questionnaire's stack because it
 * is not a question and must not be walked back into.
 */
export function nextHref(step: OnboardingFlowStep): Href {
  const next = stepAfter(step);

  return next === 'generating' ? '/generating' : HREF[next];
}
