# Architecture

System design for Task Gamifier. Pairs with `PLAN.md` (product) and `DECISIONS.md` (rationale).

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

```ts
// src/server/db/schema.ts (sketch — final shape lives in code)

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  xp: integer("xp").notNull().default(0),
  level: integer("level").notNull().default(1),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  lastActiveDate: date("last_active_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const resources = pgTable("resources", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  sourceType: pgEnum("source_type", [
    "text", "youtube_video", "youtube_playlist", "pdf",
  ])("source_type").notNull(),
  sourceUrlOrPath: text("source_url_or_path"),
  rawContent: text("raw_content"),       // extracted normalized text
  skillLevel: pgEnum("skill_level", [
    "beginner", "intermediate", "advanced",
  ])("skill_level").notNull(),
  status: pgEnum("status", [
    "processing", "ready", "completed", "failed",
  ])("status").notNull().default("processing"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  resourceId: uuid("resource_id").notNull().references(() => resources.id, { onDelete: "cascade" }),
  orderIndex: integer("order_index").notNull(),
  title: text("title").notNull(),
  focusGoal: text("focus_goal").notNull(),
  learningObjectives: jsonb("learning_objectives").$type<string[]>().notNull(),
  keyConcepts: jsonb("key_concepts").$type<string[]>().notNull(),
  outcomeStatement: text("outcome_statement").notNull(),
  estimatedMinutes: integer("estimated_minutes").notNull(),
  sourceLocator: jsonb("source_locator").$type<SourceLocator>().notNull(),
  completedAt: timestamp("completed_at"),
  reflectionNotes: text("reflection_notes"),
  xpValue: integer("xp_value").notNull(),
});

export const xpEvents = pgTable("xp_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  sessionId: uuid("session_id").references(() => sessions.id),
  delta: integer("delta").notNull(),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

type SourceLocator =
  | { kind: "youtube"; startSeconds: number; endSeconds: number }
  | { kind: "pdf"; pages: number[] }
  | { kind: "text"; range: [number, number] };
```

Relationships:
- `users 1—N resources 1—N sessions`
- `users 1—N xpEvents`, `sessions 1—N xpEvents` (one event per completion)
- All FK cascades on resource → sessions delete

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

Provider selection (`src/server/llm/provider.ts`):
```ts
const provider = process.env.LLM_PROVIDER ?? "anthropic";
const model = match(provider)
  .with("anthropic", () => anthropic("claude-sonnet-4-6"))
  .with("openai", () => openai("gpt-4o"))
  .with("google", () => google("gemini-1.5-pro"))
  .exhaustive();
```

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

## Future-facing notes

- Adding **NextAuth**: drop `USER_ID` constant, add session-aware `getCurrentUserId()`, replace constant lookups. Schema is unchanged.
- Adding **deployment**: needs a host that supports `child_process` for yt-dlp (Railway, Fly, Render). Postgres connection string already remote (Neon), no migration needed.
- Adding **mascot reactions**: hook into Zustand level-up / streak events; render a `<Mascot>` overlay component.
- Adding **SRS**: would require a `reviews` table + scheduling logic; see `DECISIONS.md` for why we deferred.
