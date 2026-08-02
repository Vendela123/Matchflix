# Spec 002 — Quiz Flow

> **In one sentence:** Once the host starts the quiz, every participant answers the same six
> preference questions one at a time, then waits on a live "who's finished" screen until the group
> is auto-advanced to matching.

|                |                                                              |
| -------------- | ------------------------------------------------------------ |
| **Status**     | ✅ Done                                                       |
| **Issue**      | #TBD — "Quiz Flow" (no GitHub Project/issue exists yet for Quiz Flow; assign when one is created, same as spec 001) |
| **Branch**     | `002-quiz-flow` (from `feature/mvp-core-loop`)                |
| **Feature**    | Quiz Flow                                                     |
| **Depends on** | [001-session-management](001-session-management.md)          |

**Short on time?** Read _User story_ and _Acceptance criteria_ — that's the whole point of the change and
how you'll know it's done. Everything after those is detail for whoever implements and reviews it.

---

## User story

_Who wants this, and what they get out of it._

As a **participant** I want to **answer a short set of movie-preference questions, one at a time,
right after the host starts the quiz, and see who else has finished while I wait** so that **my
answers can be combined with everyone else's into a group recommendation without me having to guess
when the group is ready**.

---

## Background

_How things work today and what's wrong with that — grounded in real code (`file:line` links added
during `/implement`)._

- **Today:** Spec 001 already gets every participant from the lobby to `/session/[code]/quiz` the
  moment the host starts the quiz (`startQuiz` in
  [`src/lib/session/actions.ts:113-142`](../src/lib/session/actions.ts), session status flips to
  `quiz_in_progress`, all clients redirect via the lobby's realtime subscription in
  [`src/components/session/session-lobby.tsx:53-57`](../src/components/session/session-lobby.tsx)).
  [`src/app/session/[code]/quiz/page.tsx`](../src/app/session/[code]/quiz/page.tsx) currently renders
  a static "Quiz starting…" placeholder with no questions.
- **The problem:** There is no quiz content — no questions, no way to answer them, nowhere to store
  answers, and no path onward once someone finishes. Match Logic (a separate future spec) has nothing
  to compute against.
- **Already in place:** session/participant identity via cookies (`getIdentity` in
  [`src/lib/session/session-data.ts:33-39`](../src/lib/session/session-data.ts)), the realtime
  `postgres_changes` subscription pattern in `session-lobby.tsx:62-99`, the RLS/anon-grant lockdown
  pattern in `supabase/migrations/0002_lock_down_join_code.sql`, and the `quiz_in_progress`
  `SessionStatus` value (`session-data.ts:13`) this spec's screens gate on.

---

## Design decision

_The approach we picked, and what we deliberately leave alone._

Replace the quiz placeholder with a client-side, one-question-at-a-time wizard over a fixed
in-code question list (per `CLAUDE.md`: questions live in code, not the database). Answers are held
in local component state until the final "submit" action, which writes one immutable row per
participant to a new `quiz_responses` table — consistent with the constitution's "quiz responses are
immutable once submitted." After submitting, the participant sees a live waiting screen (same
realtime pattern as the lobby) listing all participants and who has submitted; when the count of
submitted responses equals the participant count, every client auto-advances to a Match Logic
placeholder route, mirroring how 001 stubbed the quiz route ahead of this spec.

Genre options (both preferred and avoid) use TMDb's standard ~19-genre list, hardcoded in code (no
live TMDb call — that's the Streaming Integration spec) so answers already line up with real TMDb
genre ids/names once Match Logic wires in. A genre picked in "preferred" is removed from "avoid" and
vice versa — the two lists are mutually exclusive per participant, avoiding contradictory signal.
Maximum runtime is a single-select of preset buckets (e.g. "Up to 90 min" / "Up to 2 hours" / "Up to
2.5 hours" / "No limit") rather than a slider — one-tap, consistent with the rest of the quiz, and
simplest to build.

**Not touched:** The matching/recommendation algorithm itself (separate spec — this ends at "everyone
has submitted, redirect to matching"). TMDb-backed genre metadata beyond the static name/id list
(live lookups, posters, availability are the Streaming Integration spec).

---

## Acceptance criteria

_What "done" means. Every line is something a reviewer can check._

- [x] When the quiz starts, every participant lands on a quiz screen (not the old placeholder)
      showing exactly one question at a time.
- [x] The six questions, in a fixed order: preferred genres (multi-select, TMDb's standard genre
      list), genres to avoid (multi-select, same list, mutually exclusive with preferred — picking a
      genre in one removes it from the other), mood (single-select), maximum runtime (single-select
      of preset buckets, not a slider), movie or TV show (single-select), release preference — new /
      old / no preference (single-select).
- [x] A progress indicator reads "Question X of 6" and updates as the participant moves through the
      quiz.
- [x] The participant can go back to any previous question and change its answer before final
      submission; going back does not lose already-entered answers on other questions.
- [x] Nothing is persisted to the database until the participant submits the final question; the
      submission writes one immutable response row per participant (no edits after submit, per the
      constitution's data invariants).
- [x] After submitting, the participant sees a "waiting for other players" screen listing every
      participant and whether they've finished, updating live (no page refresh) as others submit.
- [x] Once every participant in the session has submitted, all clients automatically advance past the
      waiting screen to the Match Logic step (a placeholder route at this spec's boundary, matching
      the pattern spec 001 used for the quiz route).
- [x] A participant who reloads the quiz or waiting screen before the group is done returns to the
      correct step (still-answering → quiz at their last question; already-submitted → waiting
      screen) rather than losing their place or re-submitting.
- [x] Typecheck passes; lint adds no new issues; tests green (note known pre-existing failures).

### Verification

_How each criterion above is proven._

- **New tests** — `src/lib/quiz/rules.test.ts`: fixed six-question order, `isQuestionAnswered`
  (required vs. optional questions), `validateQuizAnswers` (valid answers, missing required field,
  out-of-list value, preferred/avoid overlap), and `allParticipantsSubmitted` (11 tests, all green).
- Quiz submission, immutability, and the live waiting screen depend on a live Supabase database
  (no network in automated tests, per the testing invariants) — verified by code review of the
  write-once guard (`submitQuizResponse` in `src/lib/quiz/actions.ts`) and the RLS/grant setup in
  `0003_quiz_responses.sql`. The dev server confirms routing/guards work end-to-end (see
  Implementation notes); the insert-and-flip-status path itself needs the migration applied first.
- `pnpm typecheck` — clean. `pnpm lint` — no issues. `pnpm test` — 3 files, 22 tests, all green
  (11 new + 11 pre-existing from spec 001). `pnpm build` — production build succeeds, `/session/[code]/match`
  registered alongside the existing routes.

---

## Exact changes (file:line)

_The plan, for whoever implements it. Every change grounded in current code; expanded by `/implement`._

1. **`supabase/migrations/0003_quiz_responses.sql`** — new `quiz_responses` table (insert-only,
   one row per `(session_id, participant_id)`), RLS + column-restricted `anon` grant following the
   `0002_lock_down_join_code.sql:1-9` revoke-then-grant pattern (browser gets completion status only,
   not the answers), realtime publication. Extends `sessions.status`'s check constraint
   (`0001_session_management.sql:11-12`) to add a `matching` value.
2. **`src/lib/session/session-data.ts:13`** — `SessionStatus` gains `"matching"`.
3. **`src/lib/quiz/questions.ts`** (new) — fixed question list/options (TMDb standard genre list,
   mood, runtime buckets, media type, release preference) and the `QuizAnswers`/`QuizQuestion` types.
   Questions live in code per `CLAUDE.md`.
4. **`src/lib/quiz/rules.ts`** (new) — pure functions: `isQuestionAnswered`, `validateQuizAnswers`
   (required-field + option-membership + preferred/avoid disjointness checks), `allParticipantsSubmitted`.
5. **`src/lib/quiz/rules.test.ts`** (new) — unit tests for the above (see Verification).
6. **`src/lib/quiz/quiz-data.ts`** (new) — `getSubmittedParticipantIds`, mirroring the read-helper
   pattern in `session-data.ts:41-75`.
7. **`src/lib/quiz/actions.ts`** (new) — `submitQuizResponse` server action: identity/session/status
   guards mirroring `actions.ts:113-131` (`startQuiz`), validates via `validateQuizAnswers`, inserts
   the response (treats a `23505` unique-violation retry as a no-op success, not an error), then
   flips `sessions.status` to `matching` when `allParticipantsSubmitted` is true.
8. **`src/components/quiz/quiz-flow.tsx`** (new) — client component: one-question-at-a-time wizard
   (animated via `tw-animate-css`, already a dependency — `src/app/globals.css:2`) with back
   navigation and a progress indicator, switching to a waiting-room view after submit; subscribes to
   `quiz_responses` INSERT and `sessions` UPDATE via `postgres_changes`, mirroring
   `session-lobby.tsx:59-132`.
9. **`src/app/session/[code]/quiz/page.tsx`** — replace the placeholder: same guards as today
   (lines 15-25), add a `matching` → redirect to `/session/[code]/match` branch and an inline
   "session ended" branch (mirroring `src/app/session/[code]/page.tsx:38-44`), then render
   `QuizFlow` with participants + already-submitted state.
10. **`src/app/session/[code]/match/page.tsx`** (new) — placeholder confirming the quiz→matching
    transition, same guard/redirect shape as the current `quiz/page.tsx`. Real matching is a separate
    spec (Match Logic).
11. **`src/app/session/[code]/page.tsx:76-78`** — add a `status === "matching"` redirect to
    `/session/${joinCode}/match` alongside the existing `quiz_in_progress` redirect.

**No change needed:** `src/components/session/session-lobby.tsx` — its status handling only ever
needs to react to `quiz_in_progress` (participants have already left the lobby by the time a session
reaches `matching`).

---

## Data model

_Any database change. Most specs have none — say so plainly._

New table, `quiz_responses` (`supabase/migrations/0003_quiz_responses.sql`) — one immutable row per
`(session_id, participant_id)` (enforced by a unique constraint, not a DB-level answer-content check
— that validation lives in `validateQuizAnswers`, the single source of truth also used to render the
quiz, per "a fact lives in one file"):
- `id` (uuid PK), `session_id` (FK → `sessions`, cascade delete), `participant_id` (FK →
  `session_participants`, cascade delete), `preferred_genres` (text[]), `avoided_genres` (text[],
  default `{}`), `mood` (text), `runtime_bucket` (text), `media_type` (text), `release_preference`
  (text), `submitted_at` (timestamptz, default now).
- `unique (session_id, participant_id)` — one response per participant; a retried insert hits this
  and is treated as a no-op success server-side.
- RLS enabled; `anon` gets column-restricted `SELECT` on `(id, session_id, participant_id,
  submitted_at)` only — the waiting screen needs to know *who* has finished, not their answers. No
  insert/update/delete grants to `anon`: all writes go through the service-role key, which is what
  makes responses immutable in practice.

Also extends `sessions.status`'s existing check constraint (`0001_session_management.sql`) with a
new value, `matching`: set once every participant has submitted, so all clients (already subscribed
to `sessions` UPDATE events, same as the lobby) redirect to the Match Logic placeholder together.

---

## Security

_Two lines at most: what this opens up and who may reach it — or "nothing security-relevant, because …".
Required by the constitution; silence is not an answer._

Same access model as spec 001: the join code (already required to be in the session) is the only
gate. Writes go through a server action with the service-role key; a participant can only submit
their own response (enforced by their identity cookie, not by anything the client sends), and cannot
overwrite it once submitted. `anon` can read *that* a participant has submitted (needed for the live
waiting screen) but not their actual answers — those columns are never granted to `anon`, same
data-minimization pattern spec 001 used to keep `join_code` unreadable.

---

## Edge cases

_Unusual inputs or states, and what should happen._

- A participant tries to submit twice (double-click, replay) → second submit is rejected; existing
  response is unchanged (immutability).
- A participant disconnects or closes their tab mid-quiz, before submitting → the rest of the group
  waits indefinitely on the waiting screen; no timeout or host-skip mechanism for MVP (mirrors spec
  001's lazy-expiry-only approach to the analogous host-disconnect case). The session's existing 24h
  inactivity expiry is the only eventual backstop.
- A participant reloads the quiz page after already submitting → shown the waiting screen, not the
  quiz again (see acceptance criteria).
- Session expires (24h inactivity, per spec 001) while the quiz is in progress → reuses the same
  "session ended" state/messaging spec 001 built for the lobby; no quiz-specific expiry handling.

---

## Out of scope

_Deliberately excluded, so nobody wonders whether it was forgotten._

- Match/recommendation computation — separate spec (Match Logic); this spec ends at a placeholder
  redirect once everyone has submitted.
- Live genre/streaming metadata from TMDb — separate spec (Streaming Integration); genre options are
  a fixed in-code list for this MVP.
- Editing a submitted response, or any host override to skip a stalled participant.
- Language preference question — mentioned in the original product concept (`specs/README.md`,
  `src/types/core.ts`) but not in this spec's MVP requirement list; left out deliberately.

---

## Implementation notes

- **Migration applied** (`0003_quiz_responses.sql`, by hand via the Supabase dashboard SQL Editor —
  same DDL limitation as spec 001: `.env.local` only has the project URL, anon key, and service-role
  key, none of which authorize schema changes, and no Supabase/DDL-capable CLI is available in this
  environment).
- **Confirmed live via REST probes** (anon key, mirroring spec 001's verification style): `GET
  .../quiz_responses?select=id,session_id,participant_id,submitted_at` → `200` (table exists, the
  intended columns are readable); `GET .../quiz_responses?select=preferred_genres` → `401`, `42501
  permission denied` (answer columns correctly locked down from `anon`); `GET
  .../sessions?select=id,status` → still `200` after the `sessions_status_check` constraint change
  (no regression on the existing table).
- **Verified against the running dev server up to the button-triggered-action boundary.** `/`,
  `/session/new`, `/session/join` (unaffected routes, no regression), and the new
  `/session/[code]/quiz` and `/session/[code]/match` routes were hit directly: unauthenticated
  requests correctly 307-redirect to the base session URL (the identity-cookie guard). `startQuiz` and
  `submitQuizResponse` are both directly-invoked server actions (not `<form action>`), same as spec
  001's `startQuiz` — replaying Next.js's RSC action-call wire format by hand wasn't attempted there
  either; that spec's own verification bar for this class of action was code review of the
  identity/status guards, which this spec matches.
- **`sessions.status` gains a fourth value (`matching`) instead of tracking completion purely
  client-side.** Considered computing "everyone's submitted" independently on each client from two
  separately-subscribed realtime channels (participants + responses), but that duplicates the same
  "one status field is the single source of truth for where clients should be" pattern spec 001
  already established for `quiz_in_progress` — extending it was simpler and more robust than inventing
  a second, client-computed completion signal.
- **In-progress answers are not autosaved to the database**, only to `localStorage` on the
  participant's own device/browser (see `quiz-flow.tsx`), so a mid-quiz reload can restore their
  place without persisting unsubmitted data server-side (consistent with the constitution's
  immutable-once-submitted invariant — there is no "submitted" row until the final question). This
  means progress does not follow a participant across devices/browsers before they submit; only the
  final, submitted response is server-authoritative. Not treated as a gap — nothing in the MVP
  requirements asks for cross-device resume of in-progress answers.
- A newer `eslint-plugin-react-hooks` rule (`react-hooks/set-state-in-effect`) flags the
  localStorage-restore effect in `quiz-flow.tsx` for calling `setState` directly. This is suppressed
  with an inline comment explaining why: restoring must happen post-mount (not in the initial render)
  to avoid a hydration mismatch, since SSR always renders question 1 with no access to `localStorage`.
- Ran `pnpm typecheck`, `pnpm lint`, `pnpm test` (22 tests green, 11 new), and `pnpm build` (production
  build succeeds, `/session/[code]/match` registered). `pnpm dev` continues to serve `/`,
  `/session/new`, `/session/join`, `/session/[code]` without regression.

