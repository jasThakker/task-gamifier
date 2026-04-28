# Task Gamifier

Turn any learning resource into a structured, gamified study plan — powered by an LLM.

Paste a YouTube URL, upload a PDF, or drop in any text. Pick your skill level. Task Gamifier calls an LLM to break it into right-sized study sessions with focus goals, learning objectives, key concepts, and outcome statements. Then earn XP, build streaks, and level up as you work through them.

---

## Features

- **Multiple input types** — YouTube videos (with transcript extraction via yt-dlp), PDFs (page-aware sessions via pdf-parse), plain text
- **Skill-level conditioning** — beginner / intermediate / advanced changes chunk size and framing
- **Session flashcards** — 3D flip cards showing focus goal, objectives, key concepts, and outcome statement
- **Inline content** — YouTube player auto-cued to the assigned timestamp range; PDF pages rendered inline; text excerpt highlighted
- **XP + levels** — complete sessions to earn XP; level up on a `floor(sqrt(xp/100))` curve
- **Daily streak** — strict Duolingo-style streak (one missed day resets to 0)
- **Lottie celebrations** — animated burst + XP badge plays on every session completion
- **Dark mode** — full dark/light theme via `next-themes`
- **First-run onboarding** — try a pre-canned sample resource before adding your own
- **Mobile responsive** — usable on phones

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) + TypeScript strict |
| UI | Tailwind v4 + shadcn/ui (Base UI) — playful custom tokens |
| Animations | Framer Motion + lottie-react |
| Database | Postgres on Neon + Drizzle ORM |
| LLM | Vercel AI SDK — Anthropic / OpenAI / Google (env-switchable) |
| Transcripts | yt-dlp via Node `child_process` |
| PDF parsing | pdf-parse v2 |

---

## Getting started

### Prerequisites

- Node 20+
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) installed and on `PATH` (needed for YouTube ingestion)
- A Postgres database — [Neon](https://neon.tech) works great (free tier)
- An API key for at least one LLM provider (Anthropic recommended)

### 1. Clone and install

```bash
git clone https://github.com/your-username/task-gamifier
cd task-gamifier
npm install
```

### 2. Configure environment

Copy the example and fill in your values:

```bash
cp .env.example .env.local
```

```env
DATABASE_URL=postgresql://...

# LLM provider — "anthropic" | "openai" | "google" (default: anthropic)
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Optional overrides
# OPENAI_API_KEY=sk-...
# GOOGLE_GENERATIVE_AI_API_KEY=...
# LLM_MODEL=claude-sonnet-4-6   # override per-provider default
```

### 3. Set up the database

```bash
npm run db:migrate   # apply migrations
npm run db:seed      # create the single hardcoded user row
```

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The dashboard shows an onboarding panel on first load — hit **"Try a sample resource"** to see the full flow without an API call.

---

## Common commands

```bash
npm run dev          # start dev server
npm run build        # production build
npm run lint         # eslint
npm run typecheck    # tsc --noEmit

npm run db:generate  # generate new migration from schema changes
npm run db:migrate   # apply pending migrations
npm run db:studio    # Drizzle Studio (browse/edit DB in browser)
npm run db:seed      # seed the hardcoded user row (idempotent)
```

---

## How it works

1. **Ingest** — extract raw content from the source (yt-dlp for YouTube, pdf-parse for PDFs, passthrough for text)
2. **Breakdown** — single `generateObject` call with a strict Zod schema; the LLM returns N sessions with locator metadata (timestamp ranges for YouTube, page numbers for PDF)
3. **Store** — sessions inserted into Postgres in a transaction; resource status flips to `ready`
4. **Play** — user opens sessions, flips the flashcard, watches/reads the assigned content chunk, marks complete
5. **Reward** — XP awarded, streak updated, Lottie celebration fires

---

## Deployment

The app requires `child_process` access for yt-dlp, so **Vercel serverless won't work for YouTube ingestion**. Use a persistent-process host:

- [Railway](https://railway.app) — add a Nixpacks build, set env vars, done
- [Fly.io](https://fly.io) — write a minimal `Dockerfile` based on `node:20-alpine` + install `yt-dlp`
- [Render](https://render.com) — similar to Railway

The Postgres database is already remote (Neon), so no database migration is needed for deployment.

---

## Architecture

See [`ARCHITECTURE.md`](ARCHITECTURE.md) for the full system design, data model, and component tree.

See [`DECISIONS.md`](DECISIONS.md) for the rationale behind every significant technical choice.
