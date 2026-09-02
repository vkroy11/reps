import type { OnboardingSuggestions } from '@reps/core';
import type { AiProvider } from '../providers/ai';

export function createOnboardingService(deps: { ai: AiProvider }) {
  return {
    /**
     * Skill-specific goals and level descriptors for the second and third
     * onboarding questions. Generic option lists would make every hobby feel
     * like the same product.
     */
    async suggestions(skill: string): Promise<OnboardingSuggestions> {
      return deps.ai.suggestOnboarding(skill);
    },
  };
}

export type OnboardingService = ReturnType<typeof createOnboardingService>;
