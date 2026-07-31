# CLAUDE.md

This file provides guidance to Claude Code when working with code in the MatchFlix repository.

## What we're building
Movie selection across streaming platforms has become a source of decision fatigue. Groups waste time scrolling catalogs instead of enjoying their evening. MatchFlix solves this by converting individual preferences into group recommendations. Users answer a lightweight quiz about genres, mood, runtime, and language; the platform matches these signals across a movie database and surfaces the best fit for everyone. The product targets casual viewers seeking frictionless group entertainment decisions.

**Where this goes:** MatchFlix becomes the platform groups turn to when making any entertainment decision together—movies, TV shows, games, restaurants, activities—removing friction from decisions that should be effortless.

**The MVP must, above all else:** Two or more users join a shared match session, each answers a short movie preference quiz, and the platform instantly returns a recommendation (or top 3) that aligns with everyone's combined tastes.

Build toward that, not just toward the current ticket. Full picture: `docs/VISION.md`.

## Not our problem
These are deliberate exclusions, not gaps waiting to be filled. Don't build them, don't scaffold for
them, and don't suggest them unless asked directly.

MatchFlix is not marketed as a movie recommendation engine. It is not a personal discovery tool for individual movie preferences. Market positioning centers on the problem it solves: group decision-making. The product does not recommend based on watch history or learned behavior—only on stated preferences from the current quiz.

## Communication style
Be concise but clear. Short responses save tokens — avoid restating what was asked, keep summaries
at the bare minimum, and omit filler. One clear sentence beats a paragraph.

## Clean code
Always write clean code. Avoid duplication — if the same expression appears twice, restructure to
eliminate it. Prefer clarity over cleverness: a reader should understand intent from the code itself.

## Read first (in order)
1. **`.claude/spec-kit/constitution.md`** — the single source of truth for all rules. When any file
   disagrees with it, the constitution wins.
2. The spec for your issue in `/specs` (`specs/NNN-kort.md`).
3. `docs/VISION.md` — what this becomes if it wins.
4. `docs/architecture/SYSTEM_OVERVIEW.md` and `docs/guides/DEVELOPER_GUIDE.md`.

## Before implementing anything
1. Read the relevant spec file in `/specs` before writing code.
2. If no spec exists for the task, say so and ask before proceeding — or run `/createspec`.

The spec lifecycle is automated via slash commands (`/createspec → /clarify → /implement → /analyze`,
plus `/pr-check` before a PR) governed by `.claude/spec-kit/constitution.md`. See `specs/README.md`.

## After implementing anything
Update the corresponding spec in `/specs` — check off acceptance criteria, note any deviations.

## Branching & workflow
We work via GitHub: a **feature** is a GitHub Project, **issues** are linked to it. Branch hierarchy:
`main` ← `develop` ← `feature/<name>` ← `<nr>-kort` (issue branch, no `issue/` prefix). PR direction
is strict and never skipped: `<nr>-kort` → its `feature/<name>` → `develop` → `main`. **Never** PR an
issue branch to `main`/`develop`. Full detail in `docs/architecture/BRANCHING.md`.

## Commands
MatchFlix — Next.js (App Router) · TypeScript · Tailwind + shadcn/ui · Supabase (Postgres) · Vercel · GitHub. Run from the repo root:
- `pnpm dev`        # start the dev server
- `pnpm build`      # production build
- `pnpm typecheck`  # type check
- `pnpm lint`       # linter
- `pnpm test`       # run all tests

## Architecture
Client Layer (Next.js client components): Quiz form, session join flow, recommendation display, real-time session state updates via Supabase subscriptions. Server Layer (Next.js server actions and API routes): Quiz submission, match algorithm, TMDb API calls, session management. Supabase Layer: PostgreSQL database for users, sessions, quiz responses; real-time subscriptions for session state; storage for analytics events. External: TMDb API for movie metadata and availability.

## Key conventions
Session state is managed via Supabase real-time subscriptions; client components subscribe to session changes and render updates immediately. API routes handle TMDb queries; never expose TMDb API key to the client. Quiz response validation happens server-side. Recommendation algorithm is deterministic and stateless; given the same responses, it always returns the same result. Component names follow shadcn/ui conventions; custom components extend or wrap them. Quiz questions are stored in code, not the database, until MVP scope expands. Analytics events are logged to a Supabase table for later analysis.
