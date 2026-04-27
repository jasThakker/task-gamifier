# Architecture

System design for Task Gamifier. Pairs with `PLAN.md` (product) and `DECISIONS.md` (rationale).

---

## Implementation status

| Subsystem | Status | Notes |
|---|---|---|
| Project scaffolding | ✅ Phase 0 | Next 15.5 + React 19 + TS strict (`noUncheckedIndexedAccess`) + `@/` alias |
| Tailwind + tokens | ✅ Phase 0 | Custom palette (`ink`/`cream`/`mint`/`coral`/`sun`/`sky`), `font-display`/`font-body`, `rounded-chunky`, `shadow-chunky`. shadcn primitives not installed yet — will be pulled in as needed during phase 1+ |
| Drizzle schema + migrations | ✅ Phase 0 | `src/server/db/schema.ts`; first migration `drizzle/0000_tough_night_nurse.sql` applied to Neon |
| DB client + queries | ✅ Phase 0 | `node-postgres` Pool, dev-mode global cache; `getCurrentUser()` stub in `queries.ts` |
| Seed (hardcoded user) | ✅ Phase 0 | `npm run db:seed` — idempotent insert of `USER_ID` |
| LLM provider abstraction | ✅ Phase 0 (stub) | `src/server/llm/provider.ts` — env-driven switch; `breakdown.ts`/`prompts.ts` land in phase 1 |
| Ingest pipelines | ⏳ Phase 1 (text + youtube) / Phase 4 (pdf) | |
| Server actions | ⏳ Phase 1 onward | |
| App shell | ✅ Phase 0 (placeholder) | `src/app/layout.tsx` + `page.tsx` — landing copy only; real dashboard comes in phase 2 |
| Animations / Lottie / Zustand | ⏳ Phase 3 | Not yet installed |

---

## High-level shape

```
                  ┌───────────────────────────────────────┐
                  │            Browser (React)            │
                  │  Server Components + Client Islands   │
                  └───────────────────┬───────────────────┘
                                      │  RSC + Server Actions
                  ┌───────────────────▼───────────────────┐
                  │         Next.js (App Router)          │
                  │  • app/ pages & layouts (RSC)         │
                  │  • server actions (mutations)         │
                  │  • thin API routes (uploads only)     │
                  └─────┬───────────────┬─────────────────┘
                        │               │
            ┌───────────▼───┐     ┌─────▼─────────┐    ┌──────────────┐
            │  src/server/  │     │  src/server/  │    │ src/server/  │
            │  ingest/      │     │  llm/         │    │ db/ (Drizzle)│
            │ yt-dlp / pdf  │     │  AI SDK       │    │              │
            └───────┬───────┘     └─────┬─────────┘    └──────┬───────┘
                    │                   │                     │
                    │              ┌────▼─────┐         ┌─────▼─────┐
                    │              │ Anthropic│         │ Postgres  │
                    └──────────────▶ OpenAI   │         │  (Neon)   │
                                   │ Gemini   │         └───────────┘
                                   └──────────┘
```

Single Next.js process. Three logical subsystems (ingest, llm, db) live under `src/server/` and are pure modules — easy to test, swap, or extract.

---

## Layers

| Layer | Lives in | Responsibility |
|---|---|---|
| Presentation | `src/app/`, `src/components/` | RSC + client islands; Tailwind/shadcn; Framer Motion animations |
| Server actions | `src/server/actions/` | All mutations (`createResource`, `markSessionComplete`, etc.) — invoked directly from forms/buttons |
| LLM | `src/server/llm/` | Provider abstraction, prompt templates, breakdown pipeline |
| Ingest | `src/server/ingest/` | Convert input to normalized text + locator metadata |
| Data | `src/server/db/` | Drizzle schema, typed queries, seed |
| Domain helpers | `src/lib/` | XP, streak, constants — pure functions |

---

## Data model (Drizzle)

Live source of truth: `src/server/db/schema.ts`. Shape as implemented:

```ts
// enums
sourceTypeEnum     = "text" | "youtube_video" | "youtube_playlist" | "pdf"
skillLevelEnum     = "beginner" | "intermediate" | "advanced"
resourceStatusEnum = "processing" | "ready" | "completed" | "failed"
                     // (named resource_status, not status, to avoid pg keyword collision)

users {
  id uuid pk default random
  name text
  xp int default 0
  level int default 1
  currentStreak int default 0
  longestStreak int default 0
  lastActiveDate date  nullable
  createdAt timestamptz default now
}

resources {
  id uuid pk default random
  userId uuid → users.id  ON DELETE CASCADE
  title text
  sourceType sourceTypeEnum
  sourceUrlOrPath text  nullable
  rawContent text  nullable           // extracted normalized text
  skillLevel skillLevelEnum
  status resourceStatusEnum default "processing"
  errorMessage text  nullable         // populated when status = "failed"
  createdAt timestamptz default now
}

sessions {
  id uuid pk default random
  resourceId uuid → resources.id  ON DELETE CASCADE
  orderIndex int
  title text
  focusGoal text
  learningObjectives jsonb<string[]>
  keyConcepts jsonb<string[]>
  outcomeStatement text
  estimatedMinutes int
  sourceLocator jsonb<SourceLocator>
  completedAt timestamptz  nullable
  reflectionNotes text  nullable
  xpValue int
}

xpEvents {
  id uuid pk default random
  userId uuid → users.id  ON DELETE CASCADE
  sessionId uuid → sessions.id  ON DELETE SET NULL  nullable
  delta int
  reason text
  createdAt timestamptz default now
}

type SourceLocator =
  | { kind: "youtube"; videoId?: string; startSeconds: number; endSeconds: number }
  | { kind: "pdf"; pages: number[] }
  | { kind: "text"; range: [number, number] };
```

Notes vs. the original sketch:
- Added `resources.errorMessage` so failed ingests/breakdowns can surface a reason (referenced in Error handling boundaries below).
- `xpEvents.sessionId` is `ON DELETE SET NULL` so XP history survives a resource delete (cascade only flows resource → sessions).
- All `createdAt`/`completedAt` columns are `timestamptz`.
- Inferred row/insert types are exported alongside each table (`User`, `NewUser`, …) for use in queries and actions.

Relationships:
- `users 1—N resources 1—N sessions`
- `users 1—N xpEvents`, `sessions 1—N xpEvents` (one event per completion)
- Cascade flows down from `users` → `resources` → `sessions`. `xpEvents.sessionId` SET NULL preserves XP history.

---

## Server action API surface

All mutations are server actions. Reads are server-component data fetches (no API).

```ts
// src/server/actions/resources.ts
createResource(input: CreateResourceInput): Promise<{ id: string }>
deleteResource(resourceId: string): Promise<void>
regenerateBreakdown(resourceId: string): Promise<void>     // post-MVP

// src/server/actions/sessions.ts
markSessionComplete(sessionId: string, reflection?: string): Promise<{
  xpAwarded: number;
  newLevel?: number;
  streakUpdated: boolean;
}>

// src/server/actions/dashboard.ts (mostly reads via RSC, but)
recomputeStreak(): Promise<void>      // called on app load if last_active_date < today
```

Reads (server components fetch directly via Drizzle):
- `getDashboardData()` — user stats + active resources + next-up sessions
- `getResource(id)` — resource + ordered sessions
- `getSession(id)` — session + parent resource

---

## LLM pipeline

```
ingest.run(input) ──▶ NormalizedContent
                        │
                        ▼
   buildPrompt(skillLevel, content) ──▶ { system, user }
                        │
                        ▼
   generateObject({ model, schema: SessionsResponse }) ──▶ validated sessions[]
                        │
                        ▼
   db.transaction { insert resource (status=ready) + sessions }
```

`NormalizedContent` shape:
```ts
type NormalizedContent =
  | { kind: "text"; text: string }
  | { kind: "youtube"; transcript: TimestampedSegment[]; durationSeconds: number; title: string }
  | { kind: "youtube_playlist"; videos: Array<{ id, title, transcript, durationSeconds }> }
  | { kind: "pdf"; text: string; pageBoundaries: number[]; title: string };
```

Provider selection (`src/server/llm/provider.ts`, implemented in Phase 0):
```ts
// LLM_PROVIDER selects the SDK; LLM_MODEL optionally overrides the per-provider default.
const DEFAULTS = {
  anthropic: "claude-sonnet-4-5",  // bump to claude-sonnet-4-6 once verified live
  openai:    "gpt-4o",
  google:    "gemini-1.5-pro",
};

export function getModel(): LanguageModel {
  const provider = (process.env.LLM_PROVIDER ?? "anthropic") as LlmProvider;
  const id = process.env.LLM_MODEL ?? DEFAULTS[provider];
  switch (provider) {
    case "anthropic": return anthropic(id);
    case "openai":    return openai(id);
    case "google":    return google(id);
  }
}
```

`breakdown.ts` (the actual `generateObject` call) and `prompts.ts` (the per-skill-level system prompt templates) are deferred to phase 1.

---

## Ingest pipelines

| Source | Module | Method | Locator output |
|---|---|---|---|
| Plain text | `ingest/text.ts` | passthrough | `{ kind: "text", range: [start, end] }` |
| YouTube video | `ingest/youtube.ts` | `child_process` → `yt-dlp --write-auto-sub --sub-lang en --skip-download --output ...` | `{ kind: "youtube", startSeconds, endSeconds }` |
| YouTube playlist | `ingest/youtube.ts` | `yt-dlp -J <playlist>` then per-video transcripts | per-video `youtube` locators |
| PDF | `ingest/pdf.ts` | `pdf-parse` for text + page count; track text→page mapping | `{ kind: "pdf", pages: [...] }` |

YouTube playlist resources expand into per-video sub-groupings of sessions. The `sessions` table doesn't need a separate "video" entity — `source_locator.video_id` lives in the locator JSON for playlist children.

---

## Component relationships (target)

```
app/layout.tsx
  └── <AppShell> (header with XP bar, streak, level)
      ├── app/page.tsx                        — Dashboard
      │   ├── <StreakCard>
      │   ├── <NextUpList>                    — across all active resources
      │   └── <RecentActivity>
      ├── app/resources/page.tsx              — All resources
      │   └── <ResourceGrid>
      ├── app/resources/new/page.tsx          — Create form
      │   └── <CreateResourceForm>            — input-type tabs, skill picker
      ├── app/resources/[id]/page.tsx         — One resource
      │   ├── <ResourceHeader>                — title, progress %
      │   └── <SessionList>
      │       └── <SessionCard> (×N)          — flippable flashcard
      └── app/sessions/[id]/page.tsx          — Session detail
          ├── <SessionFlashcard>              — focus, objectives, concepts, outcome
          ├── <ContentEmbed>                  — YT player / PDF viewer / text excerpt
          └── <CompleteSessionButton>         — triggers server action + animations
```

Client islands (the `"use client"` files): `<CreateResourceForm>`, `<SessionFlashcard>` (flip animation), `<ContentEmbed>`, `<CompleteSessionButton>`, `<XPBar>`. Everything else is RSC.

---

## State management

- **Server state**: fetched in RSCs, mutated via server actions, refreshed via `revalidatePath` / `revalidateTag`.
- **Client state**: local `useState` for form state; **Zustand** for cross-component animation triggers (e.g., level-up event fires a celebration overlay anywhere on the page).
- **No global query client.** No SWR / React Query needed at this scale.

---

## Background work

There isn't any in v1. Resource creation runs synchronously in the server action and shows a "processing..." state in the UI. If the LLM call takes too long for a smooth UX, we'll move to a queued job pattern (BullMQ + a worker) in a later phase. Documented in `DECISIONS.md`.

---

## Error handling boundaries

- **Ingest failures** (yt-dlp failure, PDF parse error) → set `resources.status = "failed"`, store error in a TODO field, show user-friendly message.
- **LLM failures** (rate limit, schema validation fail) → retry once with same provider; on second failure mark `failed`.
- **Don't retry on user-action endpoints** beyond once. The user can manually retry.

---

## Testing strategy (light)

- **Unit**: pure functions in `src/lib/` (xp, streak, level math) — Vitest.
- **Integration**: ingest modules against fixture inputs (a checked-in transcript, a checked-in PDF).
- **E2E**: skipped for v1 unless time permits. Manual smoke testing via the running dev app.
- **LLM**: not mocked. A small `npm run test:llm` script runs the breakdown against a tiny fixture using whichever provider is configured. Cheap.

---

## Local dev plumbing (Phase 0)

- **Env loading**: Next.js auto-loads `.env.local`. Standalone scripts (`drizzle.config.ts`, `src/server/db/migrate.ts`, `src/server/db/seed.ts`) call `dotenv.config({ path: ".env.local" })` at the top — they don't see Next's loader.
- **Postgres pool**: `src/server/db/client.ts` keeps a single `Pool` on `globalThis` in non-prod so HMR doesn't leak connections. Production gets a fresh pool per process.
- **SSL**: `ssl: { rejectUnauthorized: false }` for Neon. The current `pg` deprecation warning about `sslmode=require` semantics is benign; can switch to `uselibpqcompat=true&sslmode=require` later if it gets noisy.
- **npm scripts**: `dev`, `build`, `start`, `lint`, `typecheck`, `db:generate`, `db:migrate`, `db:studio`, `db:seed` — all listed in `CLAUDE.md`.

---

## Future-facing notes

- Adding **NextAuth**: drop `USER_ID` constant, add session-aware `getCurrentUserId()`, replace constant lookups. Schema is unchanged.
- Adding **deployment**: needs a host that supports `child_process` for yt-dlp (Railway, Fly, Render). Postgres connection string already remote (Neon), no migration needed.
- Adding **mascot reactions**: hook into Zustand level-up / streak events; render a `<Mascot>` overlay component.
- Adding **SRS**: would require a `reviews` table + scheduling logic; see `DECISIONS.md` for why we deferred.
