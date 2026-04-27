# Decisions

ADR-style log of every meaningful tech choice and the reasoning behind it. New decisions get appended; existing ones get updated (with a "Revised" note) rather than rewritten.

Format per entry: **Decision · Context · Alternatives · Reasoning · Tradeoffs**.

---

## D-001 · Next.js 15 (App Router) for the framework

- **Decision**: Use Next.js 15 with the App Router and TypeScript.
- **Context**: User wanted React for recruiter visibility. Project is a full-stack web app.
- **Alternatives considered**:
  - Vite + React SPA + separate Express/Hono backend.
  - Remix.
  - SvelteKit.
- **Reasoning**: Next.js *is* React on a resume — it's the dominant React framework in 2025–2026 production usage. App Router + server actions cut the amount of API plumbing in half vs. SPA + separate API. One repo, one deploy unit, full TypeScript end-to-end.
- **Tradeoffs**: Some "framework magic" around RSC vs. client components is a learning curve. Vite + separate API would have been a more *explicit* full-stack architecture but at 1.5–2× the boilerplate.

---

## D-002 · Postgres on Neon for the database

- **Decision**: Use Neon as the Postgres provider for both dev and (eventual) prod.
- **Context**: Need a relational DB with JSONB support for `learning_objectives`, `key_concepts`, and `source_locator`.
- **Alternatives considered**:
  - Local Postgres (`brew install`).
  - Supabase (Postgres + bundled auth/storage).
  - Postgres on Railway/Fly.
  - SQLite for solo use.
- **Reasoning**: Neon is plain Postgres, free tier, zero local setup, same connection string locally and in deploy. Avoids the "works on my machine, doesn't work in prod" trap. Supabase was the closest contender but bundles features we don't need; we can swap if/when we add auth.
- **Tradeoffs**: Dependency on Neon uptime in dev (mitigated — they're reliable, and we can fall back to local Postgres anytime since it's the same engine).

---

## D-003 · Drizzle ORM (not Prisma)

- **Decision**: Drizzle for schema, queries, and migrations.
- **Context**: Need type-safe DB access in TypeScript.
- **Alternatives considered**: Prisma, Kysely, raw `pg`.
- **Reasoning**: Drizzle has lighter runtime, faster cold starts, no separate generation step every schema change, and produces SQL that's closer to what you'd write by hand. TypeScript inference is excellent. Migrations are plain SQL files we can read.
- **Tradeoffs**: Smaller ecosystem than Prisma; some Prisma-specific extensions (like `prisma-erd-generator`) won't apply.

---

## D-004 · Vercel AI SDK for LLM provider abstraction

- **Decision**: Use `ai` (Vercel AI SDK) with `@ai-sdk/anthropic`, `@ai-sdk/openai`, `@ai-sdk/google` for all LLM calls.
- **Context**: User explicitly required modular LLM choice across Anthropic / OpenAI / Gemini.
- **Alternatives considered**:
  - Roll our own thin wrapper over each provider's SDK.
  - LangChain.
- **Reasoning**: AI SDK gives us `generateObject` (structured outputs validated with Zod) across all providers with one-line provider swap. Solves the modularity requirement out of the box. LangChain is too heavyweight for a single LLM call. Rolling our own would be ~3 hours for a worse abstraction.
- **Tradeoffs**: Adds a dependency. The SDK's name implies Vercel lock-in but it works in any TS project.
- **Rule**: Components and actions never import provider SDKs directly — they go through `src/server/llm/`.

---

## D-005 · yt-dlp via `child_process` (not the npm package)

- **Decision**: Shell out to `yt-dlp` for YouTube transcript extraction.
- **Context**: Need reliable transcript fetching for single videos and playlists.
- **Alternatives considered**:
  - `youtube-transcript` npm package.
  - `youtubei.js` (pure JS).
  - Third-party API (Supadata, Tactiq).
- **Reasoning**: `yt-dlp` is the most reliable, handles auto-captions, playlists, and weird edge cases. The npm options break frequently when YouTube changes its API. User confirmed Vercel is not required, so we can run a real Node server with yt-dlp installed.
- **Tradeoffs**: Requires `yt-dlp` to be installed in the host environment. Rules out Vercel serverless deploy. Adds a `child_process` dependency.

---

## D-006 · No authentication in v1

- **Decision**: Single hardcoded user. Every query filters by a constant `USER_ID`.
- **Context**: User said personal-use first; deploy/multi-user is a stretch goal.
- **Alternatives considered**: NextAuth, Clerk, Supabase Auth, magic links.
- **Reasoning**: Auth is significant scope (login pages, session management, email verification, password resets, OAuth) for zero v1 benefit. Schema *is* multi-user-ready (`user_id` columns), so adding it later is replacing one constant with `getCurrentUserId()`.
- **Tradeoffs**: App can't be public-facing without auth. Acceptable per scope.

---

## D-007 · "Medium" LLM ambition (no quiz-gated completion)

- **Decision**: LLM produces per-session focus, 3–5 learning objectives, key concepts, outcome statement. No auto-generated comprehension questions.
- **Context**: User chose "medium" out of three offered ambition levels.
- **Alternatives considered**:
  - **Lightweight**: just time chunks + 1-sentence focus.
  - **Heavy**: above + auto-generated comprehension quiz, completion gated on quiz pass, optional adaptive re-breakdown.
- **Reasoning**: Medium is the right balance — produces meaningfully useful sessions without a second LLM pipeline (question generation + grading). User chose self-report completion separately, which is consistent.
- **Tradeoffs**: No real learning signal — completion is honor-system. Acceptable for personal use.

---

## D-008 · Self-report session completion (not timer/quiz/watch-tracking)

- **Decision**: User clicks "Mark complete" to finish a session.
- **Context**: User said self-report is fine for now.
- **Alternatives considered**: Timer-gated, embedded-player end detection, quiz-gated.
- **Reasoning**: Simplest, fastest to ship, no infra cost. User is the user — honor system is fine.
- **Tradeoffs**: Easy to lie to oneself. Can be tightened later.

---

## D-009 · XP and levels are decorative ("just numbers go up")

- **Decision**: XP awarded per session (scaled by `estimated_minutes`); level computed from XP. Nothing is unlocked by leveling up.
- **Context**: User explicitly said "just numbers go up".
- **Alternatives considered**: Level unlocks (themes, harder breakdowns, mascot evolutions, achievements).
- **Reasoning**: Decorative gamification preserves the "fun" feeling without a content-design tax. Unlocks are a great post-MVP feature (FEATURES.md C-series).
- **Tradeoffs**: No long-term progression hook. Mitigated by streaks.

---

## D-010 · Strict streak (one missed day = 0)

- **Decision**: Streak resets to 0 on a missed day. No streak freezes, no grace period.
- **Context**: User picked "just numbers go up" — implies the simplest streak rule.
- **Alternatives considered**: Streak freezes (Duolingo-lenient), weekly goals, "vacation mode".
- **Reasoning**: Simplicity. Strict streaks are higher-stakes and motivating. Can soften later if it feels punishing in real use (FEATURES.md C10).
- **Tradeoffs**: Punishing if user has a bad week. Tracked as a candidate for revision.

---

## D-011 · "Anki-style" is aesthetic only — no SRS engine

- **Decision**: Sessions render as flippable flashcards. No spaced repetition algorithm, no review queue, no scheduled reviews.
- **Context**: User chose option (i) Aesthetic only out of three SRS-depth options.
- **Alternatives considered**:
  - Light SRS (LLM-generated review prompts, simple interval scheduling).
  - Full SRS (SM-2 or FSRS, daily review queue, contributes to streak).
- **Reasoning**: Full SRS is a 15+ hour subsystem (review scheduling, ease-factor logic, daily queue UI). User wanted the visual feel without the algorithmic depth. Light SRS could be revisited post-MVP.
- **Tradeoffs**: No retention support. Just the breakdown feature.

---

## D-012 · "Online course URL" input dropped from v1

- **Decision**: We support text, YouTube video, YouTube playlist, PDF. No Coursera/Udemy URL ingestion.
- **Context**: Originally listed as a possible input type.
- **Reasoning**: Course platforms gate content behind login walls and have anti-scraping measures. Legally and technically fuzzy. The remaining four input types cover ~95% of real use cases.
- **Tradeoffs**: Can't directly ingest a Coursera course. User can copy-paste the syllabus as text.

---

## D-013 · No Docker for development

- **Decision**: `npm run dev` against remote Neon. No `docker-compose.yml`.
- **Context**: User asked what Docker was for.
- **Reasoning**: Docker is useful when local dev needs multiple services (e.g., a local DB). With Neon, the DB is remote — there's nothing to containerize. Native Node + a `.env` file is enough.
- **Tradeoffs**: Less reproducible dev environment for contributors (acceptable — solo project, contributors can install Node).

---

## D-014 · No Vercel deploy lock-in

- **Decision**: We do not require deployability on Vercel. yt-dlp `child_process` rules out Vercel serverless.
- **Context**: User said clean implementation matters more than Vercel-readiness.
- **Reasoning**: Vercel's serverless functions don't support `child_process` for arbitrary binaries reliably. Switching to a JS-only YouTube transcript library would work on Vercel but at the cost of reliability. Railway / Fly / Render are the realistic deploy targets.
- **Tradeoffs**: One-click Vercel deploy is gone. Open-source onboarding is slightly more involved.

---

## D-015 · Synchronous resource creation (no job queue) for v1

- **Decision**: Resource creation happens inside the server action. UI shows a "processing..." state until the LLM call returns.
- **Context**: Need to ingest content + run LLM breakdown on resource create.
- **Alternatives considered**: BullMQ + Redis + worker, Inngest, Trigger.dev.
- **Reasoning**: For a 30k-token transcript, Sonnet 4.6 returns in 5–15s. Acceptable latency for a "create resource" flow. A queue is real complexity we don't need until we hit a UX wall.
- **Tradeoffs**: Long-running PDFs (giant textbooks) might feel slow. Will switch to a queue if and when this becomes a real pain point. Documented as a future expansion path in `ARCHITECTURE.md`.

---

## D-016 · 3-level skill enum (not a richer profile)

- **Decision**: Skill level is a `beginner | intermediate | advanced` enum on the resource.
- **Context**: User specifies their level when creating a resource.
- **Alternatives considered**: Free-text "describe your background", multi-dimensional profile (prior knowledge, time per day, learning goals), persistent per-topic skill model.
- **Reasoning**: A 3-level enum is the smallest signal that meaningfully changes the prompt. Rich profiles add UI complexity and prompt engineering surface area for marginal benefit.
- **Tradeoffs**: Coarse-grained. A "intermediate Python dev approaching distributed systems for the first time" is just "beginner" in our model. Acceptable.

---

## D-017 · Tailwind + shadcn/ui (not Mantine, MUI, Chakra)

- **Decision**: Tailwind for styling, shadcn/ui for primitives, customized aggressively for playful aesthetic.
- **Alternatives considered**: Mantine, Chakra UI, MUI, raw Tailwind.
- **Reasoning**: shadcn isn't a library — it copies primitive components into your repo, so we can theme them deeply for the cute Duolingo feel without fighting framework defaults. Tailwind is the lingua franca of modern React UI work and pairs naturally with shadcn.
- **Tradeoffs**: Each shadcn component is now your code to maintain. Acceptable; that's the design.
- **Revised by D-021** — shadcn v4 uses Base UI (not Radix) and requires Tailwind v4.

---

## D-018 · Framer Motion + Lottie for animations

- **Decision**: Framer Motion for component transitions; Lottie for celebration animations (level-ups, completion bursts).
- **Context**: "Fun to use" was the user's bar for "impressive".
- **Alternatives considered**: GSAP, react-spring, CSS-only animations.
- **Reasoning**: Framer Motion is the React-idiomatic choice for component-level motion. Lottie handles the "delightful" pre-baked animations (confetti, mascot bounce, XP burst) without us hand-animating SVGs.
- **Tradeoffs**: Two animation systems to learn. Lottie files are an extra asset class to manage.

---

## D-019 · Zustand for client-side cross-component state

- **Decision**: Zustand for the small amount of cross-component state we need (e.g., a level-up event triggers a celebration overlay anywhere on the page).
- **Alternatives considered**: React Context, Redux, Jotai.
- **Reasoning**: Tiny API, no provider boilerplate, just enough power for the use case. Context would force re-render thrash; Redux is overkill.
- **Tradeoffs**: One more concept in the codebase. Worth it for the animation triggers.

---

## D-020 · No Vitest test gauntlet for v1

- **Decision**: Light unit tests for `src/lib/` pure functions and ingest modules. No E2E suite.
- **Context**: 40–50 hour budget; user prioritizes practice + cool build.
- **Reasoning**: Manual smoke testing in the running app catches more for a UI-heavy personal project than an E2E suite would. Pure-function tests catch the gnarliest bugs (XP math, streak transitions).
- **Tradeoffs**: Regressions in UI flows are caught only manually. Acceptable for v1.

---

## D-021 · Tailwind v4 + shadcn v4 / Base UI (forced upgrade during Phase 1)

- **Decision**: Upgrade from Tailwind v3 → v4 and accept shadcn v4's use of Base UI instead of Radix UI.
- **Context**: `npx shadcn@latest init` during Phase 1 installed the new "base-nova" style (shadcn v4), which uses `@base-ui/react` primitives and generates CSS with Tailwind v4 syntax (`@theme`, `@custom-variant`). This broke the v3 build immediately.
- **Alternatives considered**:
  - Pin to an older shadcn release that uses Radix + Tailwind v3.
  - Remove shadcn's CSS import and patch the generated components manually.
- **Reasoning**: Tailwind v4 is stable (Feb 2025) and is the clear future direction. Pinning to old shadcn would mean missing security patches and fighting the ecosystem. The upgrade was ~30 minutes of config work (`postcss.config.mjs`, `globals.css` rewrite with `@theme inline` mappings, `tailwind.config.ts` simplification).
- **Practical consequences**:
  - `tailwind.config.ts` is now minimal — theme tokens live in `@theme {}` in `globals.css`.
  - `postcss.config.mjs` uses `@tailwindcss/postcss` instead of `tailwindcss` + `autoprefixer`.
  - shadcn components use Base UI primitives. Key API difference: `asChild` prop is gone; use `render` prop or apply `buttonVariants()` directly to `<Link>` elements.
  - Custom palette tokens (`ink`, `cream`, `mint`, etc.) are defined in `@theme inline` in `globals.css` rather than `tailwind.config.ts`.
- **Tradeoffs**: Base UI is less mature than Radix in terms of community resources and third-party integrations. The component API is slightly different (no `asChild`). Acceptable — we own the component files.

---

## D-022 · Don't store rawContent for YouTube resources

- **Decision**: Set `rawContent = null` for YouTube video resources. Only text resources store `rawContent`.
- **Context**: Phase 1 stored the full joined transcript string in `resources.rawContent` for all source types. Phase 2 audit revealed it is only consumed for text resources (the `TextExcerpt` component slices it by character range from `source_locator`). YouTube sessions use `startSeconds`/`endSeconds` locators to cue the embedded player — `rawContent` is never read back.
- **Alternatives considered**: Keep storing it as a re-breakdown cache (avoids re-fetching from YouTube if the user regenerates).
- **Reasoning**: Unused data on a path that doesn't need it. A 2-hour transcript is ~80KB; pointless to store when the locators are timestamps not character offsets. If re-breakdown is added (FEATURES.md C5), we re-fetch — that's the right trade-off.
- **Tradeoffs**: Re-running breakdown on a YouTube resource would require a fresh yt-dlp call. Acceptable; C5 is post-MVP.

---

## D-023 · yt-dlp `--print` flag skips subtitle file writes

- **Decision**: Split the yt-dlp call in `ingestYouTube` into two separate `execFile` calls — one for metadata (`--print`), one for subtitle download (`--write-auto-sub`).
- **Context**: The original Phase 1 code combined both in a single command. Newer yt-dlp versions treat `--print` as a "print-only" mode that skips all file-writing side effects including `--write-auto-sub`. This caused a silent failure where metadata was fetched correctly but no `.vtt` file was written, producing a misleading "No English captions found" error.
- **Reasoning**: Separating the concerns makes each call's intent unambiguous and robust to yt-dlp version changes.
- **Tradeoffs**: Two network round-trips to YouTube instead of one. In practice yt-dlp is not the bottleneck (the LLM call is), so this is negligible.

---

## How to update this doc

When a decision changes:
1. Add a new entry below with the next D-NNN number.
2. Add a "**Revised by D-NNN**" line to the original entry.
3. Don't delete original entries — they preserve the history.
