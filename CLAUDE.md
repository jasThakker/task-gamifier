# CLAUDE.md

Operating manual for Claude Code in this repo. Read this on every fresh session.

## What this project is

Task Gamifier — a Next.js web app that takes a learning resource (text, YouTube video, YouTube playlist, PDF) plus a skill level, and uses an LLM to break it into right-sized study sessions with focus goals, learning objectives, and outcome statements. Progress is tracked through a Duolingo-flavored gamified dashboard. Personal-use first; possibly deployed and open-sourced later.

For the full plan see `PLAN.md`. For scope/MoSCoW see `FEATURES.md`. For technical details see `ARCHITECTURE.md`. For the "why" behind every choice see `DECISIONS.md`.

## Tech stack

- **Next.js 15** (App Router) + **TypeScript** strict
- **Tailwind** + **shadcn/ui** (heavily customized — playful, cute aesthetic)
- **Framer Motion** + **Lottie** for animations
- **Postgres on Neon** + **Drizzle ORM**
- **Vercel AI SDK** (`ai`, `@ai-sdk/anthropic`, `@ai-sdk/openai`, `@ai-sdk/google`) — LLM provider abstraction
- **yt-dlp** via Node `child_process` for YouTube transcripts
- **pdf-parse** for PDFs
- Node + npm. No Docker.

## Common commands

```bash
npm run dev              # start dev server
npm run build            # production build
npm run start            # serve production build
npm run lint             # eslint
npm run typecheck        # tsc --noEmit

npm run db:generate      # drizzle-kit generate (new migration from schema)
npm run db:migrate       # apply migrations
npm run db:studio        # drizzle-kit studio (browse DB)
npm run db:seed          # seed the single hardcoded user
```

## Coding conventions

- **TypeScript strict** everywhere; no `any` without a comment explaining why.
- **Server actions** over API routes wherever possible. API routes only for webhooks or when the client genuinely needs a fetch.
- **All LLM calls** go through `src/server/llm/` — never import `@ai-sdk/anthropic` etc. directly from a component or action.
- **All LLM outputs** are validated with **Zod** schemas via `generateObject`. No free-form `generateText` for structured tasks.
- **Drizzle queries** only — no raw SQL except migrations.
- **Client components only when needed** (interactive state, browser APIs). Default to server components.
- **Tailwind for all styling**. No `.css` files except `globals.css`.
- **No comments** unless explaining a non-obvious WHY (a constraint, an invariant, a workaround). Don't narrate WHAT the code does.
- **Naming**: kebab-case for files, camelCase for variables, PascalCase for components and types.
- **Imports**: absolute via `@/` alias.

## Rules Claude must always follow

1. **No auth in v1.** Every DB query filters by the hardcoded `USER_ID` constant. Do not add NextAuth, Clerk, sessions, or login pages. Schema columns are ready; we'll bolt it on later.
2. **Stay in the current phase.** Phases are defined in `PLAN.md`. Don't build phase 4 features while phase 1 is incomplete unless the user explicitly asks.
3. **Don't import provider SDKs directly.** All LLM access goes through `src/server/llm/`. The provider is selected by `LLM_PROVIDER` env var.
4. **Never delete or rewrite `PLAN.md`, `FEATURES.md`, `DECISIONS.md`, `ARCHITECTURE.md`** without permission. If a decision changes, *update* the relevant doc and add a new ADR entry to `DECISIONS.md`.
5. **Never commit secrets.** `.env.local` is gitignored; double-check before any `git add`.
6. **Run `npm run typecheck` and `npm run lint`** before declaring any non-trivial task done.
7. **Streak logic is strict.** One missed day = streak resets to 0. Do not silently add streak freezes.
8. **No mocking the LLM in tests** that exercise the breakdown pipeline end-to-end. Use small fixture inputs against the real model with a cheap provider/model.
9. **Confirm before destructive DB operations** — `db:push --force`, dropping tables, truncating data.
10. **No new dependencies** without a one-line justification. We have a stack; stick to it.

## File structure (target)

```
src/
  app/                  Next.js App Router pages + layouts
  components/           Reusable React components
    ui/                 shadcn primitives (generated)
    gamification/       XpBar, LevelBadge, StreakBadge, CelebrationOverlay, CelebrationTrigger
    providers.tsx       ThemeProvider (next-themes) + CelebrationOverlay mount point
    session-flashcard.tsx   3D flip card (Framer Motion)
    session-card.tsx    Card shown in resource/session lists
    resource-list.tsx   Client island with Framer Motion stagger
    theme-toggle.tsx    🌙/☀️ toggle button
    create-resource-form.tsx
    dashboard-content.tsx
    youtube-embed.tsx
    text-excerpt.tsx
  server/
    actions/            Server actions (mutations)
    db/
      schema.ts         Drizzle schema (source of truth)
      queries.ts        Reusable typed queries
      seed.ts
    llm/
      provider.ts       Resolves provider from LLM_PROVIDER env var
      breakdown.ts      The session-breakdown call
      prompts.ts        Prompt templates per skill level
    ingest/
      youtube.ts        yt-dlp wrapper
      pdf.ts            pdf-parse wrapper (Phase 4)
      text.ts           text passthrough
  lib/
    xp.ts               XP / level math
    streak.ts           Streak update logic
    store.ts            Zustand store — cross-component game events (XP burst, level-up)
    constants.ts        USER_ID, level curve, etc.
drizzle/                migrations
public/
  lotties/              Lottie JSON animation files (celebration.json)
```

## When you're unsure

- Check `DECISIONS.md` for context on why something is the way it is.
- Check `FEATURES.md` to confirm something is in scope before building it.
- If a request would change a documented decision, surface that explicitly and update the doc.
