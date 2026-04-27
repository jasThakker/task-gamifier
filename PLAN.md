# Task Gamifier — Plan

## Concept

A web app where you submit a learning resource (YouTube video, YouTube playlist, PDF, or plain text) plus your skill level, and an LLM breaks it into right-sized study sessions with per-session focus goals, learning objectives, key concepts, and outcome statements. Progress is tracked through a playful, Duolingo-flavored gamified dashboard with XP, streaks, and levels. Sessions render as flippable flashcards.

Built primarily for personal use. Vercel/public deploy is a stretch goal.

---

## Stack (final)

| Layer | Choice |
|---|---|
| Framework | **Next.js 15** (App Router) + TypeScript |
| UI | **Tailwind** + **shadcn/ui** (heavily customized for cute/playful look) |
| Animations | **Framer Motion** + **Lottie** |
| Database | **Postgres on Neon** |
| ORM | **Drizzle** |
| LLM | **Vercel AI SDK** — modular across Anthropic / OpenAI / Gemini |
| YouTube transcripts | **yt-dlp** via Node `child_process` |
| PDF parsing | **pdf-parse** |
| Auth | **None** in v1; schema has `user_id` columns ready for NextAuth |
| Runtime / package mgr | Node + npm (or pnpm) |
| Hosting | Local dev only for v1. If we deploy: Railway or Fly (yt-dlp needs a real server, not Vercel serverless) |

---

## Data model

```
users
  id, name, xp, level, current_streak, longest_streak,
  last_active_date, created_at
  -- (single hardcoded user in v1; column structure ready for multi-user)

resources
  id, user_id, title,
  source_type        -- 'text' | 'youtube_video' | 'youtube_playlist' | 'pdf'
  source_url_or_path,
  raw_content        -- extracted text / transcript / parsed PDF text
  skill_level        -- 'beginner' | 'intermediate' | 'advanced'
  status             -- 'processing' | 'ready' | 'completed'
  created_at

sessions
  id, resource_id, order_index,
  title,
  focus_goal              -- 1–2 sentences
  learning_objectives     -- jsonb[] (3–5 bullets)
  key_concepts            -- jsonb[]
  outcome_statement       -- "After this session you should be able to..."
  estimated_minutes,
  source_locator          -- jsonb: {start_seconds, end_seconds} or {pages: [...]}
  completed_at,
  reflection_notes,
  xp_value

xp_events
  id, user_id, session_id, delta, reason, created_at
```

---

## Core flows

### 1. Create a resource (the "magic" moment)
1. User picks input type (text / YouTube URL / PDF upload)
2. User picks skill level (beginner / intermediate / advanced)
3. Backend extracts content:
   - text → use as-is
   - youtube → `yt-dlp` → transcript with timestamps
   - playlist → `yt-dlp` → list of videos + transcripts
   - pdf → `pdf-parse` → text + page boundaries
4. Single LLM call (`generateObject` with strict Zod schema) returns N sessions
5. Store + redirect to resource view
6. UI plays a satisfying "your course is ready!" animation

### 2. Do a session
1. User clicks the next session card (flashcard flip animation)
2. Card shows: focus goal + objectives + key concepts + outcome statement
3. Inline content:
   - YouTube → embedded player auto-cued to assigned timestamp range
   - PDF → render assigned pages inline
   - text → show assigned excerpt
4. User goes off and learns
5. Returns, hits "Mark complete" → optional reflection prompt → XP burst, streak update, mascot celebration (post-MVP)

### 3. Daily return
- Dashboard shows: current streak, today's XP, "next up" sessions across all active resources, recent activity
- Primary CTA: "Continue where you left off"

---

## LLM strategy

Single `generateObject` call per resource using a Zod schema:

```ts
const SessionSchema = z.object({
  title: z.string(),
  focus_goal: z.string(),
  learning_objectives: z.array(z.string()).min(3).max(5),
  key_concepts: z.array(z.string()),
  outcome_statement: z.string(),
  estimated_minutes: z.number(),
  source_locator: z.object({
    start_seconds: z.number().optional(),
    end_seconds: z.number().optional(),
    pages: z.array(z.number()).optional(),
    text_range: z.tuple([z.number(), z.number()]).optional(),
  }),
});

const SessionsResponse = z.object({
  sessions: z.array(SessionSchema),
});
```

Skill level is a system prompt switch:
- **beginner** → smaller chunks, more sessions, define-the-jargon framing
- **intermediate** → medium chunks, fewer hand-holds
- **advanced** → larger chunks, focus on synthesis and connections

Provider abstraction is built-in via Vercel AI SDK — swap `model: anthropic("claude-sonnet-4-6")` for `model: openai("gpt-4o")` etc., no other code changes.

Cost expectation: Sonnet 4.6 on a 2-hour video transcript ≈ 30k–50k input tokens ≈ ~$0.15. Large textbook PDFs may need chunking if >150k tokens.

---

## Game mechanics (v1 — decorative only)

- **XP**: awarded per completed session, scaled by `estimated_minutes`. Numbers go up.
- **Level**: simple curve, e.g. `level = floor(sqrt(xp / 100))`. Nothing unlocks; just a badge.
- **Streak**: increments daily on first completed session. **Strict** — one missed day resets to 0. (Streak freezes deferred.)
- **Per-resource progress %**: completed_sessions / total_sessions.

---

## Build order

| Phase | Hours | Deliverable | Status |
|---|---|---|---|
| **0. Setup** | 3 | Next.js + TS + Tailwind + shadcn + Drizzle + Neon + AI SDK plumbing; `.env` config; basic layout shell | ✅ Done (2026-04-27) — shadcn deferred until phase 1+ when a primitive is actually needed |
| **1. Text + YouTube video flow** | 8 | End-to-end: paste URL or text → LLM breakdown → session list → mark complete | ⏳ Next |
| **2. Gamification core** | 5 | XP, level, streak, dashboard, basic transitions | |
| **3. The "fun" pass** | 8 | Framer Motion polish, Lottie celebrations, custom playful styling, color/typography pass | |
| **4. PDF support** | 4 | Upload, parse, page-aware sessions, inline PDF render | |
| **5. YouTube playlist support** | 4 | Multi-video resource, per-video sub-sessions | |
| **6. Mobile responsive + onboarding** | 4 | Phone-friendly layouts, first-run flow | |
| **7. Polish + README + maybe deploy** | 6 | Bug bash, empty states, screenshots, deploy if time allows | |

**Total: ~42h.** Phases 1–3 are the demo-able core. If time runs short, drop playlist before PDF (PDFs are more useful day-to-day).

**Post-MVP / deferred:**
- Mascot character (Duo-style) + reactions
- Sound effects
- Auth + multi-user
- Multi-device sync
- Achievements/badges
- SRS (real spaced repetition)
- Comprehension quiz gating
- Adaptive re-breakdown on user struggle

---

## Project conventions

- TypeScript everywhere; strict mode on
- Server actions over API routes where possible
- Zod schemas for all LLM outputs and form inputs
- Drizzle migrations checked into repo
- One hardcoded user row seeded on first run (id `00000000-0000-0000-0000-000000000001`) — every query filters by this user_id, so multi-user is just "remove the hardcode + add auth"

---

## Open questions / decisions deferred

- Exact LLM provider for v1 (defaulting to Anthropic Sonnet 4.6 once API key is in hand)
- Final mascot design / source (post-MVP)
- Whether to add a "regenerate breakdown" button if the user dislikes the LLM's chunking
- Whether to deploy publicly at the end
