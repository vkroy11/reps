import {
  NoteSchema,
  NoteWithContextSchema,
  LearningPathSchema,
  LearningPathSummarySchema,
  OnboardingSuggestionsSchema,
  PracticeEntrySchema,
  ReflectResultSchema,
  TechniqueContentSchema,
  TechniqueSchema,
  type GeneratedContentFormat,
  type LearningPath,
  type LearningPathSummary,
  type OnboardingInput,
  type CreateNoteRequest,
  type Note,
  type NoteWithContext,
  type OnboardingSuggestions,
  type PracticeEntry,
  type ReflectRequest,
  type ReflectResult,
  type Technique,
  type TechniqueContent,
} from '@reps/core';
import { z } from 'zod';
import { ApiError, type ApiErrorCode } from './errors';

export interface ApiClientOptions {
  baseUrl: string;
  /** Anonymous identity. The API creates a user row on first contact. */
  deviceId: string;
  /**
   * The current session token, read at request time rather than passed once.
   *
   * A getter, not a value: signing in and out happens while the client is
   * alive, and a captured string would leave every existing caller sending a
   * stale token - or none - until the app rebuilt the client.
   */
  getToken?: () => string | null;
  /** Injectable for tests. */
  fetchImpl?: typeof fetch;
}

/** Path generation runs a multi-stage model pipeline, so it gets a long leash. */
const TIMEOUT_MS = { default: 15_000, generate: 90_000 } as const;

const ErrorBodySchema = z.object({
  error: z.string(),
  message: z.string().optional(),
});

export function createApiClient({
  baseUrl,
  deviceId,
  getToken,
  fetchImpl = fetch,
}: ApiClientOptions) {
  /**
   * The device id goes on every request, signed in or not: it is what a claim
   * and a sign-out act on. The bearer token, when there is one, decides which
   * learner the request speaks for.
   */
  function headers(json: boolean): Record<string, string> {
    const token = getToken?.() ?? null;

    return {
      ...(json ? { 'content-type': 'application/json' } : {}),
      'x-device-id': deviceId,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    };
  }

  async function request<Schema extends z.ZodType>(
    path: string,
    options: { method?: string; body?: unknown; schema: Schema; timeoutMs?: number },
  ): Promise<z.infer<Schema>> {
    let response: Response;

    try {
      response = await fetchImpl(`${baseUrl}${path}`, {
        method: options.method ?? 'GET',
        headers: headers(true),
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: AbortSignal.timeout(options.timeoutMs ?? TIMEOUT_MS.default),
      });
    } catch (error) {
      // Offline, wrong LAN address, DNS, or the timeout above.
      throw new ApiError('NetworkError', (error as Error).message);
    }

    if (!response.ok) throw await toApiError(response);

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new ApiError('UnexpectedResponse', 'Response was not JSON', response.status);
    }

    const parsed = options.schema.safeParse(payload);
    if (!parsed.success) {
      // The API changed shape, or we are talking to something else entirely.
      throw new ApiError(
        'UnexpectedResponse',
        `Response did not match the expected shape: ${parsed.error.issues
          .map((issue) => issue.path.join('.'))
          .join(', ')}`,
        response.status,
      );
    }

    return parsed.data;
  }

  /** For endpoints that answer 204: there is nothing to parse, only to check. */
  async function requestNoContent(path: string, method: string): Promise<void> {
    let response: Response;

    try {
      response = await fetchImpl(`${baseUrl}${path}`, {
        method,
        headers: headers(false),
        signal: AbortSignal.timeout(TIMEOUT_MS.default),
      });
    } catch (error) {
      throw new ApiError('NetworkError', (error as Error).message);
    }

    if (!response.ok) throw await toApiError(response);
  }

  return {
    /** Skill-specific goals and level descriptors for onboarding questions 2 and 3. */
    async suggestions(skill: string): Promise<OnboardingSuggestions> {
      const { suggestions } = await request('/api/onboarding/suggestions', {
        method: 'POST',
        body: { skill },
        schema: z.object({ suggestions: OnboardingSuggestionsSchema }),
        timeoutMs: 30_000,
      });

      return suggestions;
    },

    async createPath(input: OnboardingInput): Promise<LearningPath> {
      const { path } = await request('/api/paths', {
        method: 'POST',
        body: input,
        schema: z.object({ path: LearningPathSchema }),
        timeoutMs: TIMEOUT_MS.generate,
      });

      return path;
    },

    /** Ordered most recently practised first: index 0 is what Today shows. */
    async listPaths(): Promise<LearningPathSummary[]> {
      const { paths } = await request('/api/paths', {
        schema: z.object({ paths: z.array(LearningPathSummarySchema) }),
      });

      return paths;
    },

    async getPath(pathId: string): Promise<LearningPath> {
      const { path } = await request(`/api/paths/${pathId}`, {
        schema: z.object({ path: LearningPathSchema }),
      });

      return path;
    },

    /**
     * One technique. The API curates its resources on first open, so this call
     * can be slower than a plain read the first time a technique is visited.
     */
    async getTechnique(techniqueId: string): Promise<Technique> {
      const { technique } = await request(`/api/techniques/${techniqueId}`, {
        schema: z.object({ technique: TechniqueSchema }),
        timeoutMs: 30_000,
      });

      return technique;
    },

    /**
     * The generated drill, card deck or micro-lesson for a technique. Format
     * defaults to whatever the technique's modality calls for; the API stores
     * the result, so a second visit is instant.
     */
    async getTechniqueContent(
      techniqueId: string,
      format?: GeneratedContentFormat,
      options: { fresh?: boolean } = {},
    ): Promise<TechniqueContent> {
      const params = new URLSearchParams();
      if (format) params.set('format', format);
      if (options.fresh) params.set('fresh', '1');
      const query = params.size > 0 ? `?${params.toString()}` : '';
      const { content } = await request(`/api/techniques/${techniqueId}/content${query}`, {
        schema: z.object({ content: TechniqueContentSchema }),
        timeoutMs: 45_000,
      });

      return content;
    },

    /** Notes on one technique, ordered by position in the resource. */
    async listNotes(techniqueId: string): Promise<Note[]> {
      const { notes } = await request(`/api/notes?techniqueId=${techniqueId}`, {
        schema: z.object({ notes: z.array(NoteSchema) }),
      });

      return notes;
    },

    /** The notebook: every note with the technique and skill it came from. */
    async listAllNotes(): Promise<NoteWithContext[]> {
      const { notes } = await request('/api/notes', {
        schema: z.object({ notes: z.array(NoteWithContextSchema) }),
      });

      return notes;
    },

    /**
     * Records how the practice went.
     *
     * Returns the whole path, not just the technique: a reflection can complete
     * one technique and activate the next, and a partial response would leave
     * the caller to guess at the rest.
     */
    async reflect(techniqueId: string, input: ReflectRequest): Promise<ReflectResult> {
      return request(`/api/techniques/${encodeURIComponent(techniqueId)}/reflect`, {
        method: 'POST',
        body: input,
        schema: ReflectResultSchema,
      });
    },

    /** "This is too hard" - inserts an easier prerequisite in front of it. */
    async markTooHard(techniqueId: string): Promise<LearningPath> {
      const { path } = await request(
        `/api/techniques/${encodeURIComponent(techniqueId)}/too-hard`,
        { method: 'POST', schema: z.object({ path: LearningPathSchema }) },
      );

      return path;
    },

    /** "Not for me" - removes it and regenerates only what came after. */
    async skipTechnique(techniqueId: string): Promise<LearningPath> {
      const { path } = await request(`/api/techniques/${encodeURIComponent(techniqueId)}/skip`, {
        method: 'POST',
        schema: z.object({ path: LearningPathSchema }),
      });

      return path;
    },

    /**
     * Raw practice history. The streak is computed from it locally, because
     * only this device knows what "today" means here.
     */
    async practiceHistory(): Promise<PracticeEntry[]> {
      const { entries } = await request('/api/progress/history', {
        schema: z.object({ entries: z.array(PracticeEntrySchema) }),
      });

      return entries;
    },

    async createNote(input: CreateNoteRequest): Promise<Note> {
      const { note } = await request('/api/notes', {
        method: 'POST',
        body: input,
        schema: z.object({ note: NoteSchema }),
      });

      return note;
    },

    async updateNote(noteId: string, body: string): Promise<Note> {
      const { note } = await request(`/api/notes/${noteId}`, {
        method: 'PATCH',
        body: { body },
        schema: z.object({ note: NoteSchema }),
      });

      return note;
    },

    async deleteNote(noteId: string): Promise<void> {
      // 204, so there is no body to validate.
      await requestNoContent(`/api/notes/${noteId}`, 'DELETE');
    },

    /** Whether this server can do sign-in at all. */
    async authAvailable(): Promise<boolean> {
      const { available } = await request('/api/auth/status', {
        schema: z.object({ available: z.boolean() }),
      });

      return available;
    },

    /**
     * Exchanges a Google ID token for a session, claiming this device.
     *
     * `claimed` tells the caller whether anonymous work was merged in, so the
     * UI can say "your chess path came with you" rather than staying silent
     * about something the learner was probably worried about.
     */
    async signInWithGoogle(idToken: string): Promise<{
      token: string;
      expiresAt: string;
      userId: string;
      email: string | null;
      name: string | null;
      claimed: boolean;
    }> {
      const result = await request('/api/auth/google', {
        method: 'POST',
        body: { idToken },
        schema: z.object({
          token: z.string(),
          expiresAt: z.string(),
          claimed: z.boolean(),
          user: z.object({
            id: z.string(),
            email: z.string().nullable(),
            name: z.string().nullable(),
          }),
        }),
      });

      return {
        token: result.token,
        expiresAt: result.expiresAt,
        userId: result.user.id,
        email: result.user.email,
        name: result.user.name,
        claimed: result.claimed,
      };
    },

    /** Unlinks this device. The account keeps everything. */
    async signOut(): Promise<void> {
      await request('/api/auth/sign-out', {
        method: 'POST',
        schema: z.object({ user: z.object({ id: z.string() }) }),
      });
    },

    async health(): Promise<boolean> {
      try {
        await request('/api/health', {
          schema: z.object({ status: z.string() }),
          timeoutMs: 4000,
        });

        return true;
      } catch {
        return false;
      }
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;

async function toApiError(response: Response): Promise<ApiError> {
  const retryAfter = Number(response.headers.get('retry-after'));
  let code: ApiErrorCode = 'InternalServerError';
  let message = `HTTP ${response.status}`;

  try {
    const parsed = ErrorBodySchema.safeParse(await response.json());
    if (parsed.success) {
      code = parsed.data.error as ApiErrorCode;
      message = parsed.data.message ?? message;
    }
  } catch {
    // Keep the generic message; a non-JSON error body is still an error.
  }

  return new ApiError(
    code,
    message,
    response.status,
    Number.isFinite(retryAfter) ? retryAfter : undefined,
  );
}
