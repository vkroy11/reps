import type {
  GeneratedContentFormat,
  LearningPath,
  LearningPathSummary,
  ResourceCandidate,
  TechniqueContent,
} from '@reps/core';

export interface User {
  id: string;
  deviceId: string;
  createdAt: string;
}

export interface UserRepository {
  /** Anonymous identity: a device gets a user row on first request. */
  findOrCreateByDeviceId(deviceId: string): Promise<User>;
}

/**
 * A path is treated as one aggregate and saved whole. With at most a handful of
 * techniques per path this keeps ordering, insertion and tail regeneration
 * atomic, and keeps the repository surface small.
 */
export interface PathRepository {
  save(path: LearningPath): Promise<LearningPath>;
  findById(id: string): Promise<LearningPath | null>;
  findByTechniqueId(techniqueId: string): Promise<LearningPath | null>;
  listByUser(userId: string): Promise<LearningPathSummary[]>;
}

export interface TechniqueContentRepository {
  find(techniqueId: string, format: GeneratedContentFormat): Promise<TechniqueContent | null>;
  save(
    techniqueId: string,
    format: GeneratedContentFormat,
    content: TechniqueContent,
  ): Promise<void>;
}

export interface ResourceCacheRepository {
  find(key: string): Promise<{ candidates: ResourceCandidate[]; cachedAt: number } | null>;
  save(key: string, candidates: ResourceCandidate[]): Promise<void>;
}

/** Tracks spend against a provider's daily allowance, per calendar day. */
export interface QuotaRepository {
  consumedToday(resource: string): Promise<number>;
  consume(resource: string, units: number): Promise<void>;
}

export interface Repositories {
  users: UserRepository;
  paths: PathRepository;
  techniqueContent: TechniqueContentRepository;
  resourceCache: ResourceCacheRepository;
  quota: QuotaRepository;
}
