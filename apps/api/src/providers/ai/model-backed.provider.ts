import {
  GeneratedPathSchema,
  GeneratedTechniqueListSchema,
  OnboardingSuggestionsSchema,
  RankedResourcesSchema,
  TechniqueContentSchema,
  type GeneratedTechnique,
  type OnboardingInput,
} from '@reps/core';
import { ProviderInvalidOutputError } from '../../lib/errors';
import { generateJson, type JsonModel } from './json-model';
import {
  SYSTEM_PROMPT,
  generateBridgePrompt,
  generateContentPrompt,
  generatePathPrompt,
  onboardingSuggestionsPrompt,
  rankResourcesPrompt,
  regenerateTailPrompt,
} from './prompts';
import type {
  AiProvider,
  GenerateBridgeInput,
  GenerateContentInput,
  PathContext,
  RankResourcesInput,
  RegenerateTailInput,
} from './types';

function toContext(input: OnboardingInput): PathContext {
  return {
    skill: input.skill,
    goal: input.goal,
    level: input.level,
    language: input.language,
    dailyMinutes: input.dailyMinutes,
    daysPerWeek: input.daysPerWeek,
    preferredFormats: input.preferredFormats,
  };
}

/**
 * The whole AI surface, implemented once on top of a transport. Adding a
 * provider means implementing JsonModel.complete(), nothing else.
 *
 * Two models rather than one: the planner designs paths, and a lighter helper
 * handles the mechanical work (picking a video, writing one drill). Groq
 * applies rate limits per model, so this also stops a learner opening a
 * technique from competing for tokens with the path that just generated it.
 */
export function createModelBackedAiProvider(models: {
  planner: JsonModel;
  helper?: JsonModel;
}): AiProvider {
  const model = models.planner;
  const helper = models.helper ?? models.planner;

  return {
    name: helper === model ? model.name : `${model.name}+${helper.name}`,

    async suggestOnboarding(skill) {
      return generateJson(model, OnboardingSuggestionsSchema, {
        system: SYSTEM_PROMPT,
        user: onboardingSuggestionsPrompt(skill),
      });
    },

    async generatePath(input) {
      return generateJson(model, GeneratedPathSchema, {
        system: SYSTEM_PROMPT,
        user: generatePathPrompt(toContext(input)),
        maxTokens: 4000,
      });
    },

    async regenerateTail(input: RegenerateTailInput) {
      const { techniques } = await generateJson(model, GeneratedTechniqueListSchema, {
        system: SYSTEM_PROMPT,
        user: regenerateTailPrompt(input),
        maxTokens: 3000,
      });

      return techniques.slice(0, input.count);
    },

    async generateBridge(input: GenerateBridgeInput): Promise<GeneratedTechnique> {
      const { techniques } = await generateJson(model, GeneratedTechniqueListSchema, {
        system: SYSTEM_PROMPT,
        user: generateBridgePrompt(input),
      });

      const [bridge] = techniques;
      if (!bridge) throw new ProviderInvalidOutputError(model.name, 'No bridging technique returned');

      return bridge;
    },

    async rankResources(input: RankResourcesInput) {
      const ranked = await generateJson(helper, RankedResourcesSchema, {
        system: SYSTEM_PROMPT,
        user: rankResourcesPrompt(input),
      });

      // The model may only choose from what the resource layer found.
      const allowedIds = new Set(input.candidates.map((candidate) => candidate.id));
      const selections = ranked.selections.filter((selection) =>
        allowedIds.has(selection.candidateId),
      );

      if (selections.length === 0) {
        throw new ProviderInvalidOutputError(helper.name, 'No selection matched a known candidate');
      }

      return { selections };
    },

    async generateContent(input: GenerateContentInput) {
      const content = await generateJson(helper, TechniqueContentSchema, {
        system: SYSTEM_PROMPT,
        user: generateContentPrompt(input),
        maxTokens: 2000,
      });

      if (content.format !== input.format) {
        throw new ProviderInvalidOutputError(
          helper.name,
          `Asked for ${input.format} but received ${content.format}`,
        );
      }

      return content;
    },
  };
}
