import {
  capstoneOf,
  clearedStages,
  creditedMinutes,
  xpForSession,
  type LearningPath,
  type ReflectRequest,
  type Technique,
  type XpAward,
} from '@reps/core';
import { ConflictError, NotFoundError } from '../lib/errors';
import { newId } from '../lib/ids';
import type { AiProvider } from '../providers/ai';
import type { Repositories } from '../repositories/types';
import {
  ensureActiveTechnique,
  renumber,
  toPathContext,
  toTechnique,
  type TechniqueDraft,
} from './context';
import type { ResourceCurator } from './resource-curator.service';

/** Two "struggling" reports is the point where the app offers help unprompted. */
const STRUGGLE_THRESHOLD = 2;

export interface ReflectResult {
  path: LearningPath;
  /** Set when the learner has struggled enough that an easier step is worth offering. */
  intervention: 'offer_bridge' | null;
  /** What this reflection earned, so the celebration can state it exactly. */
  awarded: XpAward;
}

function completedTitles(path: LearningPath): string[] {
  return path.techniques
    .filter((technique) => technique.status === 'completed')
    .map((technique) => technique.title);
}

export function createTechniqueService(deps: {
  ai: AiProvider;
  curator: ResourceCurator;
  repositories: Repositories;
}) {
  async function locate(
    userId: string,
    techniqueId: string,
  ): Promise<{ path: LearningPath; technique: Technique }> {
    const path = await deps.repositories.paths.findByTechniqueId(techniqueId);
    if (!path || path.userId !== userId) throw new NotFoundError('Technique', techniqueId);

    const technique = path.techniques.find((candidate) => candidate.id === techniqueId);
    if (!technique) throw new NotFoundError('Technique', techniqueId);

    return { path, technique };
  }

  /**
   * Grants the badge for a gate, if this completion closed one.
   *
   * The gate is identified from the *completed count* rather than from the
   * technique's own position, because a bridge insert shifts every index after
   * it - keying off position would award stage 2 twice and never award stage 3.
   * The repository is idempotent on `(pathId, stage)` regardless.
   */
  async function awardGate(userId: string, path: LearningPath, completedNow: Technique) {
    const completedCount = path.techniques.filter(
      (candidate) => candidate.status === 'completed',
    ).length;
    const stagesCleared = clearedStages(completedCount, path.techniques.length);
    if (stagesCleared === 0) return null;

    // The stage the learner just finished, and the technique that capstones it.
    const stage = stagesCleared;
    const capstone = capstoneOf(path.techniques, stage);

    return deps.repositories.progress.awardBadge({
      id: newId('bdg'),
      userId,
      pathId: path.id,
      stage,
      label: capstone?.title ?? completedNow.title,
      earnedAt: new Date().toISOString(),
    });
  }

  return {
    locate,

    /**
     * Records how the practice felt. Completion is driven by this rather than by
     * how much of a video was watched - watching is not learning.
     */
    async reflect(
      userId: string,
      techniqueId: string,
      input: ReflectRequest,
    ): Promise<ReflectResult> {
      const { path, technique } = await locate(userId, techniqueId);

      if (technique.status !== 'active') {
        throw new ConflictError(
          `Technique '${techniqueId}' is ${technique.status}; only an active technique can be reflected on`,
        );
      }

      const struggleCount =
        input.confidence === 'struggling' ? technique.struggleCount + 1 : technique.struggleCount;
      const completed = input.confidence === 'solid';

      // Recorded before the path is saved, and for every confidence - practice
      // that felt bad is still practice, and only paying for "solid" would be
      // paying people to say it. See xpForSession in packages/core.
      const minutes = creditedMinutes(input.practiceMinutes ?? 0);
      const firstReflection = await deps.repositories.progress.isFirstReflection(techniqueId);
      const xp = xpForSession({ minutes, firstReflection });

      await deps.repositories.progress.recordSession({
        id: newId('ses'),
        userId,
        pathId: path.id,
        techniqueId,
        minutes,
        xp,
        confidence: input.confidence,
        createdAt: new Date().toISOString(),
      });

      const techniques = ensureActiveTechnique(
        path.techniques.map((candidate) =>
          candidate.id === techniqueId
            ? {
                ...candidate,
                confidence: input.confidence,
                struggleCount,
                status: completed ? ('completed' as const) : candidate.status,
              }
            : candidate,
        ),
      );

      const saved = await deps.repositories.paths.save({ ...path, techniques });
      const badge = completed ? await awardGate(userId, saved, technique) : null;

      return {
        // Re-read only when a badge landed, so the response carries it.
        path: badge ? ((await deps.repositories.paths.findById(saved.id)) ?? saved) : saved,
        intervention: !completed && struggleCount >= STRUGGLE_THRESHOLD ? 'offer_bridge' : null,
        awarded: { xp, minutes, badge },
      };
    },

    /**
     * "This is too hard" does not remove the technique - it is in the path
     * because the goal needs it. An easier prerequisite is inserted in front of
     * it instead, and the hard one goes back to locked.
     */
    async markTooHard(userId: string, techniqueId: string): Promise<LearningPath> {
      const { path, technique } = await locate(userId, techniqueId);

      if (technique.status === 'completed') {
        throw new ConflictError(`Technique '${techniqueId}' is already completed`);
      }

      const bridge = await deps.ai.generateBridge({
        context: toPathContext(path),
        hardTechnique: { title: technique.title, whyItMatters: technique.whyItMatters },
        completedTitles: completedTitles(path),
      });

      const bridgeTechnique = toTechnique(bridge, {
        pathId: path.id,
        order: technique.order,
        status: 'active',
        archetype: path.archetype,
        bridgeForTechniqueId: technique.id,
      });
      bridgeTechnique.resources = await deps.curator.curate(path, bridgeTechnique);

      const index = path.techniques.findIndex((candidate) => candidate.id === techniqueId);
      // Draft-typed: the bridge has no practice minutes yet, and this array is
      // on its way to save() rather than back to a caller.
      const techniques: TechniqueDraft[] = [...path.techniques];
      techniques[index] = { ...technique, status: 'locked' };
      techniques.splice(index, 0, bridgeTechnique);

      return deps.repositories.paths.save({ ...path, techniques: renumber(techniques) });
    },

    /**
     * "Not for me" removes the technique and regenerates only what came after
     * it. Completed work is never touched, and the rejected title is passed to
     * the model so the replacement is a different route, not a rename.
     */
    async skip(userId: string, techniqueId: string): Promise<LearningPath> {
      const { path, technique } = await locate(userId, techniqueId);

      if (technique.status === 'completed') {
        throw new ConflictError(`Technique '${techniqueId}' is already completed`);
      }

      const index = path.techniques.findIndex((candidate) => candidate.id === techniqueId);
      const before = path.techniques.slice(0, index);
      const after = path.techniques.slice(index + 1);
      const preserved = after.filter((candidate) => candidate.status === 'completed');
      const discarded = after.filter((candidate) => candidate.status !== 'completed');

      const replacements = await deps.ai.regenerateTail({
        context: toPathContext(path),
        archetype: path.archetype,
        completedTitles: completedTitles(path),
        rejectedTitle: technique.title,
        count: Math.max(1, discarded.length),
      });

      const techniques = ensureActiveTechnique(
        renumber([
          ...before,
          { ...technique, status: 'skipped' as const },
          ...preserved,
          ...replacements.map((generated) =>
            toTechnique(generated, {
              pathId: path.id,
              order: 0,
              status: 'locked',
              archetype: path.archetype,
            }),
          ),
        ]),
      );

      return deps.repositories.paths.save({ ...path, techniques });
    },

    /** Lazy curation: resources are fetched the first time a technique is opened. */
    async ensureResources(userId: string, techniqueId: string): Promise<Technique> {
      const { path, technique } = await locate(userId, techniqueId);

      if (technique.resources.length > 0) return technique;

      const resources = await deps.curator.curate(path, technique);
      if (resources.length === 0) return technique;

      const saved = await deps.repositories.paths.save({
        ...path,
        techniques: path.techniques.map((candidate) =>
          candidate.id === techniqueId ? { ...candidate, resources } : candidate,
        ),
      });

      const updated = saved.techniques.find((candidate) => candidate.id === techniqueId);
      if (!updated) throw new NotFoundError('Technique', techniqueId);

      return updated;
    },
  };
}

export type TechniqueService = ReturnType<typeof createTechniqueService>;
