# Features

MoSCoW prioritization. The MVP is **Must + Should**. Everything else is post-MVP.

---

## Must have (MVP — Phases 0–3 in `PLAN.md`)

These are required for the app to be demo-able and personally useful. ~24 hours of build.

| # | Feature | Phase | Notes |
|---|---|---|---|
| ~~M1~~ ✅ | Submit a **plain text** learning resource | 1 | Paste any text, pick skill level, get sessions |
| ~~M2~~ ✅ | Submit a **YouTube single video** resource | 1 | URL → transcript via yt-dlp → sessions with timestamp ranges. Requires `yt-dlp` installed locally |
| ~~M3~~ ✅ | LLM **breakdown into sessions** | 1 | `generateObject` with separate Zod schemas per source type; `claude-sonnet-4-6` default |
| ~~M4~~ ✅ | **Skill-level conditioning** (3-level enum) | 1 | beginner / intermediate / advanced changes the system prompt |
| ~~M5~~ ✅ | **Session list view per resource** | 1 | Ordered, shows progress bar, lets user click into one |
| ~~M6~~ ✅ | **Session detail flashcard** | 1 | Focus goal, objectives, key concepts, outcome statement |
| ~~M7~~ ✅ | **Embedded YouTube player** cued to assigned timestamps | 1 | iframe with start/end params |
| ~~M8~~ ✅ | **Mark session complete** (self-report) | 1 | Form action → DB update → redirect; optional reflection notes (S6 pulled in early) |
| ~~M9~~ ✅ | **XP awarded on completion** | 2 | `xpForSession(estimatedMinutes) = estimatedMinutes × 10`. Inserted into `xp_events`, user totals updated in same transaction. |
| ~~M10~~ ✅ | **Decorative level** (numbers go up) | 2 | `level = max(1, floor(sqrt(xp / 100)))`. `progressToNextLevel()` drives XP bar in header + dashboard. |
| ~~M11~~ ✅ | **Daily streak** with strict reset | 2 | `computeStreakUpdate()` in `src/lib/streak.ts`. Gap > 1 day resets to 1. Updated in same transaction as XP. |
| ~~M12~~ ✅ | **Dashboard** with streak, XP, "next up" sessions | 2 | `getDashboardData()` query. Real stat cards + next incomplete session per active resource. Header on every page shows streak/level/XP bar. |
| ~~M13~~ ✅ | **Playful animations** (Framer Motion celebrations) | 3 | `CelebrationOverlay` (AnimatePresence + spring), `SessionFlashcard` 3D flip, `ResourceList` stagger. Zustand `useGameStore` fires events cross-component. |
| ~~M14~~ ✅ | **Custom playful styling** (colors, typography) | 3 | Dark mode via `next-themes`; `.dark` CSS vars; resource + session cards unified with `card-playful`/`shadow-chunky` tokens; `ThemeToggle` in header. |
| ~~M15~~ ✅ | **Lottie celebrations** | 3 | `public/lotties/celebration.json` 6-dot burst plays on every session complete via `lottie-react`. |

---

## Should have (Phases 4–7)

Nice to ship in v1; cuttable if time runs out. ~18 hours.

| # | Feature | Phase | Notes |
|---|---|---|---|
| S1 | **PDF upload + breakdown** | 4 | pdf-parse, page-aware sessions, inline render |
| S2 | **YouTube playlist** support | 5 | Per-video sub-sessions; skip if time tight |
| S3 | **Mobile-responsive layouts** | 6 | Phone usable; not phone-first |
| S4 | **First-run onboarding** | 6 | "Try a sample resource" button to seed an example |
| S5 | **Polished empty states** | 7 | Illustrations + helpful CTAs for empty dashboard / resource list |
| ~~S6~~ ✅ | **Reflection notes** prompt on session complete | 7 | Optional textarea after marking complete — pulled into Phase 1 (trivial to add alongside mark-complete) |
| S7 | **README with screenshots** | 7 | For potential open-sourcing |
| S8 | **Public deploy** (Railway or Fly) | 7 | Stretch — the project succeeds without this |

---

## Could have (post-MVP, future phases)

Worth building if the project keeps going. Not committed.

| # | Feature | Notes |
|---|---|---|
| C1 | **Mascot character** (Duo-style) with reactions to milestones | Requires custom illustration; ~6h of design + animation |
| C2 | **Sound effects** | Cheap to add; deferred for focus |
| C3 | **Achievements / badges** | "First resource", "5-day streak", "10 sessions in a week" |
| C4 | **Daily goal** + push-style notifications via Web Push | Real engagement loop |
| C5 | **Regenerate breakdown** button | If LLM chunking is bad; one-click redo |
| C6 | **Adaptive re-breakdown** if user struggles | Tracks completion time vs estimate; reduces chunk size next time |
| C7 | **Resource search / tagging** | Once user has many resources |
| C8 | **Export progress** (markdown / CSV) | For people who like data |
| C9 | **Theming** (dark mode, palette picker) | Pure visual |
| C10 | **Streak freezes** (Duolingo-lenient) | If strict streak feels punishing in practice |

---

## Won't have (v1 — explicit non-goals)

These are intentionally out of scope. If a user (or future Claude session) suggests them, push back and reference this section.

| Feature | Why excluded |
|---|---|
| **Authentication / multi-user** | Single-user is enough for personal use. Schema has `user_id` columns ready for NextAuth later. Adding it now bloats every flow with no benefit. |
| **Comprehension quiz gating** | User picked "medium" LLM ambition + self-report completion. Quiz gating requires a whole second LLM pipeline + question UI + grading. Defer. |
| **Spaced repetition (SRS) engine** | "Anki-flavored" was confirmed as **aesthetic only**. Real SM-2/FSRS would be a 15+ hour subsystem. |
| **Real-time multiplayer / leaderboards / friends** | Single-user app. Out of theme. |
| **Online course URL ingestion** (Coursera, Udemy, etc.) | Legally fuzzy and scraping is brittle. Dropped during planning. |
| **Mobile app (native)** | Web-only. Responsive design is enough. |
| **Offline mode / PWA** | Not worth the complexity for v1. |
| **Background job queue** (BullMQ etc.) | Synchronous server action + processing UI is enough. Add only if LLM latency makes UX unacceptable. |
| **Docker / containerization** for dev | Plain `npm run dev` + remote Neon DB. No need. |
| **Custom auth, password reset, email verification** | Subset of "no auth in v1". |
| **Comments / sharing / social features** | Not the product. |
| **Per-skill XP / per-resource leveling** | One global XP/level for simplicity. Numbers go up. |
| **Streak freezes / weekly goals** | Strict streak. Could be added in C10 if it feels too harsh. |
| **A/B testing infrastructure, analytics dashboards** | Personal app. Add Vercel Analytics or Plausible if/when deployed. |
| **i18n** | English only. |

---

## How to use this doc

- **Before building anything**, check that it's in Must or Should — and is in the current phase.
- **If a request lands outside MVP**, surface that to the user with a reference to this doc and ask whether to defer or expand scope.
- **When something is built**, mark it shipped (e.g., `~~M1~~ ✅` or move to a "Done" section) so the doc stays current.
