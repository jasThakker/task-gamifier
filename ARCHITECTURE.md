# Architecture

System design for Task Gamifier. Pairs with `PLAN.md` (product) and `DECISIONS.md` (rationale).

---

## Implementation status

| Subsystem | Status | Notes |
|---|---|---|
| Project scaffolding | ✅ Phase 0 | Next 15.5 + React 19 + TS strict (`noUncheckedIndexedAccess`) + `@/` alias |
| Tailwind + tokens | ✅ Phase 0→1 | Upgraded to **Tailwind v4** mid-Phase 1 (required by shadcn v4). Custom palette tokens now in `@theme inline` in `globals.css`. `rounded-chunky`/`shadow-chunky` defined there too. `tailwind.config.ts` is now minimal (no theme extensions). See D-021. |
| shadcn / Base UI | ✅ Phase 1 | shadcn v4 "base-nova" style installed. Uses **Base UI** (not Radix). `asChild` replaced by `render` prop or `buttonVariants()` applied directly to `<Link>`. Primitives: button, input, textarea, card, badge, tabs, select. |
| Drizzle schema + migrations | ✅ Phase 0 | `src/server/db/schema.ts`; first migration `drizzle/0000_tough_night_nurse.sql` applied to Neon |
| DB client + queries | ✅ Phase 1 | `getCurrentUser()`, `getAllResources()`, `getResourceWithSessions()`, `getSession()` in `queries.ts` |
| Seed (hardcoded user) | ✅ Phase 0 | `npm run db:seed` — idempotent insert of `USER_ID` |
| LLM provider abstraction | ✅ Phase 1 | `provider.ts` (env-driven, default `claude-sonnet-4-6`), `prompts.ts` (skill-level system prompts), `breakdown.ts` (`generateObject` with separate Zod schemas per source type) |
| Ingest pipelines | ✅ Phase 1 (text + youtube) / ⏳ Phase 4 (pdf) | `ingest/text.ts` (passthrough), `ingest/youtube.ts` (yt-dlp shell + VTT parser, 30s segment merging). `NormalizedContent` + `TimestampedSegment` types in `ingest/types.ts` |
| Server actions | ✅ Phase 1 | `actions/resources.ts` (`createResource`), `actions/sessions.ts` (`markSessionComplete`) |
| XP + level math | ✅ Phase 2 | `src/lib/xp.ts` — `xpForSession`, `levelFromXp` (`max(1, floor(sqrt(xp/100)))`), `progressToNextLevel` |
| Streak logic | ✅ Phase 2 | `src/lib/streak.ts` — `computeStreakUpdate`: gap=1 → increment, gap>1 → reset to 1 |
| Gamification components | ✅ Phase 2 | `src/components/gamification/` — `XpBar`, `StreakBadge`, `LevelBadge` |
| Dashboard (real data) | ✅ Phase 2 | `getDashboardData()` in `queries.ts`; `app/page.tsx` shows stat cards + next-up sessions |
| App shell / header | ✅ Phase 2 | `layout.tsx` header with streak, level badge, XP bar on every page |
| `markSessionComplete` (XP+streak) | ✅ Phase 2 | Single DB transaction: update session, insert `xp_events`, update `users` (xp, level, streak) |
| Animations / Lottie / Zustand | ✅ Phase 3 | Framer Motion for card flip (3D `rotateY`) + resource list stagger + celebration overlay. `lottie-react` + `public/lotties/celebration.json` for XP burst. Zustand (`src/lib/store.ts`) for cross-component `pendingEvent` → `CelebrationOverlay`. |
| Dark mode | ✅ Phase 3 | `next-themes` `ThemeProvider` in `src/components/providers.tsx`. `.dark` CSS vars in `globals.css`. `ThemeToggle` button in header. SSR-safe (no hydration flash). |
| Playful styling pass | ✅ Phase 3 | Resource cards and session cards unified with `card-playful` + `shadow-chunky`. `SessionFlashcard` front/back faces. Consistent typography + color tokens throughout. |

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
// useActionState signature — returns error state or redirects on success
createResource(_prevState: CreateResourceState, formData: FormData): Promise<CreateResourceState>
// post-MVP:
deleteResource(resourceId: string): Promise<void>
regenerateBreakdown(resourceId: string): Promise<void>

// src/server/actions/sessions.ts
// direct form action — redirects to resource page on success; XP logic added in Phase 2
markSessionComplete(formData: FormData): Promise<void>

// src/server/actions/dashboard.ts — Phase 2
recomputeStreak(): Promise<void>
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

`NormalizedContent` shape (live in `src/server/ingest/types.ts`):
```ts
type NormalizedContent =
  | { kind: "text"; text: string; title: string }
  | { kind: "youtube"; videoId: string; title: string; durationSeconds: number; transcript: TimestampedSegment[] }
  | { kind: "pdf"; text: string; pageBoundaries: number[]; title: string };  // Phase 4
  // youtube_playlist deferred to Phase 5
```

Provider selection (`src/server/llm/provider.ts`):
```ts
// LLM_PROVIDER selects the SDK; LLM_MODEL optionally overrides the per-provider default.
const DEFAULTS = {
  anthropic: "claude-sonnet-4-6",
  openai:    "gpt-4o",
  google:    "gemini-1.5-pro",
};
```

`prompts.ts` — three system prompts keyed to skill level (beginner/intermediate/advanced); sets chunk-size expectations, jargon handling, and locator instructions.

`breakdown.ts` — two Zod schemas (`YouTubeSessionSchema` with `startSeconds`/`endSeconds`, `TextSessionSchema` without); calls `generateObject`; maps output to `NewSession[]`. Text session ranges are assigned proportionally post-LLM (not LLM-derived).

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
app/layout.tsx (wraps <Providers> → ThemeProvider + CelebrationOverlay)
  └── <AppShell> (header: streak, level badge, XP bar, ThemeToggle)
      ├── app/page.tsx                        — Dashboard
      │   ├── <StreakCard>
      │   ├── <NextUpList>                    — across all active resources
      │   └── <RecentActivity>
      ├── app/resources/page.tsx              — All resources (RSC shell)
      │   └── <ResourceList>                  — client island; Framer Motion stagger
      │       └── <SessionCard> (×N)          — card-playful, numbered circle, XP display
      ├── app/resources/new/page.tsx          — Create form
      │   └── <CreateResourceForm>            — input-type tabs, skill picker
      ├── app/resources/[id]/page.tsx         — One resource
      │   ├── <ResourceHeader>                — title, progress %
      │   └── <SessionCard> (×N)              — same component as resource list
      └── app/sessions/[id]/page.tsx          — Session detail
          ├── <CelebrationTrigger>            — reads ?xp=&leveled= params, fires Zustand event
          ├── <SessionFlashcard>              — 3D card flip (front: focus+outcome / back: objectives+concepts)
          ├── <YouTubeEmbed> / <TextExcerpt>  — content inline
          └── mark-complete form             — server action → redirect with ?xp= params
```

Global overlay: `<CelebrationOverlay>` mounted in `layout.tsx` via `<Providers>`; subscribes to Zustand `pendingEvent`, plays Lottie burst + XP badge / level-up card.

Client islands: `<CreateResourceForm>`, `<SessionFlashcard>` (flip), `<ResourceList>` (stagger), `<CelebrationTrigger>`, `<CelebrationOverlay>`, `<ThemeToggle>`, `<XpBar>`. Everything else is RSC.

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
