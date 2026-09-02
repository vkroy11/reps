# Reps

Turn any hobby into a short, finishable practice path.

You tell Reps what you want to be able to *do* — play five songs, stop hanging pieces — and it builds a path of 5–8 techniques, finds the right resource for each one, and tracks practice until you can actually do the thing. One React Native codebase runs on iOS, Android and the web.

> **Status:** API, shared domain and Postgres persistence complete and tested. Screens and the design system are next.

## Stack

| Layer | Choice |
|---|---|
| App | Expo SDK 57, Expo Router (iOS / Android / web from one codebase) |
| API | Express 5 + TypeScript, layered routes → services → repositories |
| Shared | Zod schemas in `packages/core`, consumed by both sides |
| Data | Postgres (Neon) via Prisma |
| AI | Provider abstraction over Groq / Gemini |
| Tests | Vitest + Supertest (API), Jest + Testing Library (app) |

## Layout

```
apps/
  mobile/     Expo Router app - iOS, Android, web
  api/        Express API
packages/
  core/       Domain types + Zod schemas shared by app and API
  ui/         Design tokens + platform-adaptive primitives
  client/     Typed API client + Storage port
```

`packages/*` ship raw TypeScript — no build step. Metro compiles them for the app; the API bundles them at build time.

## Setup

Requires Node 20+.

```bash
npm install
cp .env.example .env      # fill in keys as features need them
```

### Database

Postgres 17. Either works:

```bash
docker compose up -d                      # or...
brew install postgresql@17 && brew services start postgresql@17
```

If you installed it with Homebrew, create the role and database once:

```bash
psql -d postgres -c "CREATE ROLE reps LOGIN PASSWORD 'reps' CREATEDB;" \
                 -c "CREATE DATABASE reps OWNER reps;"
```

Then apply the schema:

```bash
npm run db:migrate -w @reps/api -- --name init
```

**Storage is chosen by `DATABASE_URL`.** Set it and the API uses Postgres via
Prisma; leave it blank and it falls back to in-memory repositories behind the
same interfaces. The fallback keeps tests hermetic and lets someone run the API
with no database installed — it just forgets everything on restart.

## Scripts

Run from the repo root.

| Command | Does |
|---|---|
| `npm run dev:api` | API with watch mode on http://localhost:4000 |
| `npm run dev:mobile` | Expo dev server (press `i`, `a`, or `w`) |
| `npm run dev:web` | Expo dev server, web only |
| `npm run build:web` | Static web export to `apps/mobile/dist` |
| `npm run build:api` | Bundle the API to `apps/api/dist` |
| `npm run typecheck` | `tsc --noEmit` across every workspace |
| `npm run lint` | ESLint across the repo |
| `npm run test` | Test suites in every workspace |
| `npm run db:migrate -w @reps/api` | Create and apply a migration |
| `npm run db:deploy -w @reps/api` | Apply existing migrations (production) |
| `npm run db:studio -w @reps/api` | Browse the data |

Health check: `curl http://localhost:4000/api/health`

**The API runs with no keys.** With no `GROQ_API_KEY` / `YOUTUBE_API_KEY` it falls back to fake providers that satisfy the same schemas, so the whole pipeline is exercisable on a fresh clone. Set the keys for real plans.

## API

Every route except `/api/health` needs an `x-device-id` header — identity is anonymous by design, so there is no signup.

| Route | Does |
|---|---|
| `POST /api/onboarding/suggestions` | Skill-specific goals and level descriptors for onboarding |
| `POST /api/paths` | Runs the pipeline and returns a 5–8 technique path |
| `GET /api/paths` | The learner's paths, with progress counts |
| `GET /api/paths/:id` | One path with techniques and resources |
| `GET /api/techniques/:id` | A technique, curating its resources on first open |
| `GET /api/techniques/:id/content` | Generated drill / flashcards / micro-lesson, cached after first call |
| `POST /api/techniques/:id/reflect` | Records confidence; completes and advances on `solid` |
| `POST /api/techniques/:id/too-hard` | Inserts an easier prerequisite in front of it |
| `POST /api/techniques/:id/skip` | Removes it and regenerates only the tail |

Errors use a typed taxonomy mapped to status codes in one place: `ValidationError` 400, `Unauthorized` 401, `NotFound` 404, `Conflict` 409, `QuotaExhausted` 429, `ProviderInvalidOutput` 502, `ProviderUnavailable` 503.

## To document before submission

- [ ] Architecture overview and the decisions behind it
- [ ] AI provider research — free-tier limits and why this one
- [ ] YouTube quota strategy
- [ ] Design inspiration credits with links
- [ ] Screenshots / demo links (web + APK)
- [ ] Measured bundle size
