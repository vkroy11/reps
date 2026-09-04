import type {
  Badge,
  Confidence,
  PracticeEntry,
  GeneratedContentFormat,
  LearningPath,
  LearningPathSummary,
  Note,
  NoteWithContext,
  ResourceCandidate,
  Technique,
  TechniqueContent,
} from '@reps/core';

export interface User {
  id: string;
  googleId: string | null;
  email: string | null;
  name: string | null;
  createdAt: string;
}

export interface UserRepository {
  /** Anonymous identity: a device gets a user row on first request. */
  findOrCreateByDeviceId(deviceId: string): Promise<User>;
  findById(userId: string): Promise<User | null>;
  findByGoogleId(googleId: string): Promise<User | null>;
  createWithGoogle(identity: {
    googleId: string;
    email: string | null;
    name: string | null;
  }): Promise<User>;
  /**
   * Points a device at an account and moves everything it owns across.
   *
   * Returns the account user. Must be atomic: a half-applied claim would leave
   * a device pointing at an account while its paths still belong to the
   * anonymous row, which reads to the learner as their work having vanished.
   *
   * Nothing is deleted. If both sides have a path for the same skill, the
   * account ends up with two - a duplicate the learner can remove, which is
   * recoverable, unlike a merge that picked one.
   */
  claimDevice(input: { deviceId: string; accountUserId: string }): Promise<User>;
  /**
   * Attaches a Google identity to an existing user.
   *
   * The path a first-ever sign-in takes. Promoting the anonymous row in place
   * means the common case moves no data at all - and it is why signing in
   * cannot lose the work done before it.
   */
  linkGoogle(input: {
    userId: string;
    googleId: string;
    email: string | null;
    name: string | null;
  }): Promise<User>;
  /** Gives a device a fresh anonymous identity, leaving the account intact. */
  detachDevice(deviceId: string): Promise<User>;
}

/**
 * What `save` accepts.
 *
 * `xp`, `badges` and each technique's `practiceMinutes` are read-side
 * aggregates over PracticeSession and Badge, so they are not writable through
 * the path. Omitting them here is what stops a caller writing
 * `save({ ...path, xp: 999 })` and being quietly ignored - the type refuses it
 * instead. Spreading a full path in is still fine: TypeScript does not apply
 * excess-property checks to spreads.
 */
export type LearningPathWrite = Omit<LearningPath, 'xp' | 'badges' | 'techniques'> & {
  techniques: Omit<Technique, 'practiceMinutes'>[];
};

/**
 * A path is treated as one aggregate and saved whole. With at most a handful of
 * techniques per path this keeps ordering, insertion and tail regeneration
 * atomic, and keeps the repository surface small.
 */
export interface PathRepository {
  save(path: LearningPathWrite): Promise<LearningPath>;
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

export interface NoteRepository {
  create(note: Note): Promise<Note>;
  findById(noteId: string): Promise<Note | null>;
  /** Ordered by timestamp so they line up with the resource they annotate. */
  listByTechnique(userId: string, techniqueId: string): Promise<Note[]>;
  /** The notebook view: every note with the technique and skill it belongs to. */
  listByUser(userId: string): Promise<NoteWithContext[]>;
  update(noteId: string, body: string): Promise<Note>;
  remove(noteId: string): Promise<void>;
}

/** One reflection's worth of practice, as stored. */
export interface PracticeSessionRecord {
  id: string;
  userId: string;
  pathId: string;
  techniqueId: string;
  minutes: number;
  xp: number;
  confidence: Confidence;
  createdAt: string;
}

/**
 * The game layer's store: practice sessions and the badges they earn.
 *
 * Separate from PathRepository because these are append-only event rows rather
 * than part of the path aggregate. Nothing here ever rewrites history, which is
 * what makes XP totals - and the streak in the next phase - reconstructable
 * rather than guessed at.
 */
export interface ProgressRepository {
  /** Appends a session. Returns it so the caller can report what was credited. */
  recordSession(session: PracticeSessionRecord): Promise<PracticeSessionRecord>;
  /** True when this technique has never been reflected on before. */
  isFirstReflection(techniqueId: string): Promise<boolean>;
  /**
   * Awards a gate's badge, or returns null if that gate already granted one.
   * Idempotent by `(pathId, stage)`, so a retried reflect cannot double-award.
   */
  awardBadge(badge: Badge): Promise<Badge | null>;
  /** The read-side aggregates one path needs. */
  pathTotals(pathId: string): Promise<{
    xp: number;
    badges: Badge[];
    minutesByTechnique: Record<string, number>;
  }>;
  /** Totals for many paths at once, so the path list does not fan out. */
  totalsForPaths(pathIds: string[]): Promise<Record<string, { xp: number; badges: Badge[] }>>;
  /**
   * Recent sessions, newest first, for the streak and the week strip.
   *
   * Returns timestamps rather than a computed streak: bucketing days is a
   * local-calendar question and the server does not know the caller's
   * timezone. See packages/core/src/streak.ts.
   */
  recentSessions(userId: string, limit: number): Promise<PracticeEntry[]>;
}

/** Tracks spend against a provider's daily allowance, per calendar day. */
export interface QuotaRepository {
  consumedToday(resource: string): Promise<number>;
  consume(resource: string, units: number): Promise<void>;
}

export interface Repositories {
  users: UserRepository;
  paths: PathRepository;
  notes: NoteRepository;
  progress: ProgressRepository;
  techniqueContent: TechniqueContentRepository;
  resourceCache: ResourceCacheRepository;
  quota: QuotaRepository;
}
