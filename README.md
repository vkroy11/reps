# Reps

Turn any hobby into a short, finishable practice path.

You tell Reps what you want to be able to *do* — play five songs, stop hanging pieces — and it builds a path of 5–8 techniques, finds the right resource for each one, and tracks practice until you can actually do the thing. One React Native codebase runs on iOS, Android and the web.

> **Status:** scaffold. Domain logic, screens and the design system are in progress.

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

Health check: `curl http://localhost:4000/api/health`

## To document before submission

- [ ] Architecture overview and the decisions behind it
- [ ] AI provider research — free-tier limits and why this one
- [ ] YouTube quota strategy
- [ ] Design inspiration credits with links
- [ ] Screenshots / demo links (web + APK)
- [ ] Measured bundle size
