# Spec 004 — Match Logic

> **In one sentence:** Once every participant has answered the quiz, deterministically score real
> TMDb movies/shows against everyone's combined answers and show the group a top-3 shortlist of its
> best-fit recommendations, replacing the current placeholder.

|                |                                                              |
| -------------- | ------------------------------------------------------------ |
| **Status**     | ✅ Done                                                       |
| **Issue**      | #TBD — "Match Logic" [NEEDS CLARIFICATION: assign issue #]   |
| **Branch**     | `004-match-logic` (from `feature/mvp-core-loop`)              |
| **Feature**    | Match Logic                                                   |
| **Depends on** | [002-quiz-flow](002-quiz-flow.md) (quiz responses to score), [003-streaming-integration](003-streaming-integration.md) (`discoverMovies` candidate pool) |

**Short on time?** Read _User story_ and _Acceptance criteria_ — that's the whole point of the change and
how you'll know it's done. Everything after those is detail for whoever implements and reviews it.

---

## User story

_Who wants this, and what they get out of it._

As **a group of participants who have all finished the quiz** I want **the platform to instantly show
us a short list of movies that fit everyone's combined answers, with where to watch each**, so that
**we can start watching instead of arguing or scrolling**.

---

## Background

_How things work today and what's wrong with that — grounded in real code (`file:line` links added
during `/implement`)._

- **Today:** [`src/app/session/[code]/match/page.tsx`](../src/app/session/[code]/match/page.tsx) is a
  static placeholder — it correctly guards on session status (redirects back to the quiz if not
  everyone's done, shows "session ended" if expired) but always renders "Finding your match…", never
  an actual recommendation. Spec 002 stores each participant's answers in `quiz_responses`, readable
  server-side via a service-role client
  ([`src/lib/quiz/quiz-data.ts`](../src/lib/quiz/quiz-data.ts)), but there is no read helper yet for
  the *answers themselves* — only `getSubmittedParticipantIds` (`quiz-data.ts:7-15`), which reads
  completion status, not content. Spec 003's `discoverMovies`
  ([`src/lib/tmdb/movies.ts:35-63`](../src/lib/tmdb/movies.ts)) returns a real, filterable movie/TV
  candidate pool with `genres`/`releaseYear`/`runtimeMinutes`/`streamingPlatforms` per title
  (`StreamingMovie`, `src/lib/tmdb/mapping.ts:7-16`). The quiz's answer shape (`QuizAnswers`,
  `src/lib/quiz/questions.ts:77-84`) is camelCase; `quiz_responses` columns are snake_case.
- **The problem:** Nothing connects the two — no code reads all of a session's quiz answers, combines
  them, scores `discoverMovies` candidates against that combination, or renders a result. No image
  host is configured for `next/image` yet (`next.config.ts` is empty), needed to show posters.
- **Already in place:** the `matching` session status only exists once every participant has
  submitted (spec 002's `allParticipantsSubmitted`), which already satisfies the constitution's "a
  match session cannot be shown a recommendation until all invited participants have answered" —
  this spec doesn't need to re-check that itself, only read what's already guaranteed true by the
  time this page renders. The `isSessionExpired(lastActivityAt, now)` pattern in
  [`src/lib/session/rules.ts:41-43`](../src/lib/session/rules.ts) — a explicit `now`/"current time"
  parameter instead of reading the clock internally — is the precedent this spec follows for its own
  release-preference ("new" vs "old") scoring, to stay a pure, testable function.

---

## Design decision

_The approach we picked, and what we deliberately leave alone._

A single pure, deterministic scoring function takes all of a session's `QuizAnswers` plus a candidate
list of `StreamingMovie`s and returns them ranked best-to-worst — "deterministic given a set of quiz
responses" (constitution) is satisfied by construction: no randomness, no stored state, recomputed
fresh from `quiz_responses` + a live `discoverMovies` call every time the match page loads. No new
database table for the result itself.

Avoided genres are a hard exclusion: a candidate containing any genre any participant marked
"avoid" is dropped before scoring, not merely down-ranked — matches the quiz's own framing of "avoid"
as a stronger signal than "prefer." Preferred-genre overlap is scored per participant and summed, so a
movie several people would enjoy outranks one only one person would ("maximum agreement, not
compromise," per `docs/architecture/SYSTEM_OVERVIEW.md`).

Mood is scored the same way, via a fixed mood→genre association table (mood isn't a TMDb field, so
this is what makes it usable at all): `funny`→Comedy; `exciting`→Action, Adventure, Thriller;
`emotional`→Drama, Romance; `scary`→Horror, Thriller; `feel_good`→Comedy, Family, Animation;
`thought_provoking`→Documentary, Mystery, Drama. A candidate whose genres overlap a participant's
mood-mapped genres scores the same overlap bonus as a directly preferred genre.

Media type (movie vs. TV) is decided once per session before candidates are even fetched: whichever
`mediaType` the majority of participants chose, ties broken toward `movie`. Release preference
(new/old/no preference), by contrast, is scored per participant like genres/mood — no hard filter,
no forced group consensus. The match page shows a top-3 shortlist, not a single pick, so the group has
a fallback if the #1 result doesn't land. If the candidate pool is empty after exclusion filtering (or
`discoverMovies` itself returns nothing), the page shows a plain "no match found" message — no
automatic constraint-loosening or retry.

**Not touched:** `discoverMovies` itself (spec 003) and the quiz UI (spec 002) — this spec only reads
their outputs. No notification/sharing of the result (separate, Notifications spec).

---

## Acceptance criteria

_What "done" means. Every line is something a reviewer can check._

- [x] Once a session's status is `matching`, `/session/[code]/match` computes and displays a real
      top-3 shortlist instead of the placeholder text.
- [x] Given the same set of quiz responses, the recommendation is always identical — no randomness,
      no dependency on wall-clock time or call order.
- [x] A candidate containing any genre any participant marked as "avoid" is excluded entirely.
- [x] A movie multiple participants' preferred genres overlap with ranks higher than one only one
      participant's preferred genres overlap with.
- [x] Mood contributes to scoring via a fixed mood→genre mapping (funny→Comedy; exciting→Action/
      Adventure/Thriller; emotional→Drama/Romance; scary→Horror/Thriller; feel_good→Comedy/Family/
      Animation; thought_provoking→Documentary/Mystery/Drama), scored the same way as a preferred
      genre.
- [x] The session's media type (movie vs. TV) is decided once, before fetching candidates: whichever
      `mediaType` the majority of participants chose, ties broken toward `movie`.
- [x] Release preference (new/old/no preference) is scored per participant like genres/mood — no hard
      filter, no requirement that participants agree.
- [x] The group's runtime constraint is the *most restrictive* of all participants' runtime buckets
      (a candidate must fit everyone's stated tolerance, not just some).
- [x] The recommendation always shows streaming platform availability (constitution: "Streaming
      platform information is always visible on the recommendation").
- [x] If the candidate pool is empty after exclusion filtering, or `discoverMovies` returns nothing,
      the match page shows a plain "no match found" message — no automatic constraint-loosening or
      retry.
- [x] Typecheck passes; lint adds no new issues; tests green (note known pre-existing failures).

### Verification

_How each criterion above is proven._

- **New tests** — `src/lib/match/scoring.test.ts` (15 tests): media-type majority/tie resolution,
  most-restrictive-runtime resolution, preferred/avoided genre unions, avoided-genre exclusion,
  genre-overlap ranking, mood→genre scoring, release-preference scoring against a fixed `currentYear`,
  determinism (identical inputs → identical output twice), and `topMatches`'s 3-item cap/fewer-than-3/
  empty-input behavior.
- A real `TMDB_API_KEY` became available this session — verified the actual TMDb wire format live:
  `GET /discover/movie` with real genre ids returned 20 real candidates; `GET
  /movie/{id}?append_to_response=watch/providers` returned exactly the shape
  `mapDetailsToStreamingMovie` expects (title, runtime, genres, release_date, poster_path, US
  `flatrate` providers) — see Implementation notes. Reading quiz responses and rendering the match
  page depend on a full session/quiz walkthrough via button-triggered server actions, which — as in
  specs 002/003 — wasn't replayed via curl; verified by code review instead.
- `pnpm typecheck` — clean. `pnpm lint` — no issues. `pnpm test` — 6 files, 47 tests, all green
  (15 new). `pnpm build` — production build succeeds.

---

## Exact changes (file:line)

_The plan, for whoever implements it. Every change grounded in current code; expanded by `/implement`._

1. **`src/lib/quiz/quiz-data.ts`** — add `QuizResponseRow` type and `getQuizResponses(sessionId)`,
   mirroring `getSubmittedParticipantIds`'s shape but selecting the full answer columns.
2. **`src/lib/match/scoring.ts`** (new) — pure, no `server-only`, mirrors `src/lib/quiz/rules.ts`'s
   testability: `resolveMediaType` (majority vote, tie→movie), `resolveMaxRuntimeMinutes` (min across
   participants' buckets, `undefined` only if all chose `no_limit`), `resolvePreferredGenrePool`
   (union, for the `discoverMovies` fetch filter), `resolveAvoidedGenres` (union, for exclusion),
   `rankCandidates(candidates, answers, currentYear)` (exclude-then-score-then-sort), `topMatches`
   (ranked, sliced to `TOP_MATCHES_LIMIT = 3`). `currentYear` is an explicit parameter (not read from
   the clock internally), following `isSessionExpired`'s `now`-parameter pattern, so the function
   stays pure/testable.
3. **`src/lib/match/scoring.test.ts`** (new) — pure tests: avoided-genre exclusion, preferred/mood
   genre-overlap scoring, release-preference scoring with a fixed `currentYear`, most-restrictive
   runtime resolution, media-type majority/tie resolution, determinism (same inputs twice → identical
   output), empty-input handling.
4. **`next.config.ts`** — add `images.remotePatterns` for `image.tmdb.org` so `next/image` can render
   `StreamingMovie.posterUrl`.
5. **`src/app/session/[code]/match/page.tsx`** — replace the placeholder: same guards as today
   (identity/status checks, "ended" branch unchanged), then map `getQuizResponses` rows to
   `QuizAnswers`, call `discoverMovies` with the resolved genre pool/media type/runtime cap, rank with
   `topMatches`, and render up to 3 result cards (poster via `next/image`, genres, runtime, streaming
   platforms) or a "no match found" message if empty.

**No change needed:** `discoverMovies` (`src/lib/tmdb/movies.ts`) and the quiz UI (spec 002) — this
spec only reads their existing outputs.

---

## Data model

_Any database change. Most specs have none — say so plainly._

**No schema changes.** The recommendation is recomputed statelessly on every page load from existing
`quiz_responses` rows plus a live `discoverMovies` call — nothing new to persist, consistent with the
constitution's determinism requirement (same inputs, same output, no stored result to go stale).

---

## Security

_Two lines at most: what this opens up and who may reach it — or "nothing security-relevant, because …".
Required by the constitution; silence is not an answer._

No new access surface: the match page already only renders for a participant whose identity cookie
matches the session (existing guard in `match/page.tsx`). Reading full quiz answers happens
server-side via the service-role client, same as the existing submit path — never exposed to `anon`.

---

## Edge cases

_Unusual inputs or states, and what should happen._

- Every candidate gets excluded by the avoided-genres rule, or `discoverMovies` returns zero
  candidates → plain "no match found" message; no automatic constraint-loosening or retry.
- Only two participants, both with identical answers → straightforward — the highest-overlap movie
  for both is well-defined, no special-casing needed.
- A participant's `runtimeBucket` is `no_limit` while another's is `under_90` → the group constraint
  is `under_90` (most restrictive wins).
- Participants' `mediaType` answers tie (e.g. 2 vs. 2) → resolved toward `movie`.
- Fewer than 3 candidates survive filtering → show however many there are (1 or 2), not padded to 3.

---

## Out of scope

_Deliberately excluded, so nobody wonders whether it was forgotten._

- Any change to how quiz responses are collected or stored (spec 002) or how TMDb data is fetched
  (spec 003) — this spec only consumes both.
- Sharing/notifying users that a recommendation is ready — separate spec (Notifications).
- Learned/ML-based weighting — a single deterministic scoring function only, per the MVP requirement.
- Re-running the match if a participant wants to change their answer — quiz responses are immutable
  once submitted (constitution); out of scope here.

---

## Implementation notes

- **A real `TMDB_API_KEY` was added to `.env.local` during this session** (spec 003 shipped without
  one). Used it to verify the live TMDb wire format directly: a `/discover/movie` call with real genre
  ids returned 20 candidates, and a `/movie/{id}?append_to_response=watch/providers` call returned
  exactly the response shape `mapDetailsToStreamingMovie` (spec 003) expects — confirming this spec's
  scoring pipeline is built on a contract that actually matches production TMDb responses, not just an
  assumed shape.
- **`currentYear` is threaded as an explicit parameter through `rankCandidates`/`topMatches`**, not
  read from the clock inside the scoring module — mirrors `isSessionExpired(lastActivityAt, now)`
  (spec 001). This is what keeps the "new vs. old" release-preference scoring a pure, deterministic
  function: tests pin a fixed year, and the real caller (`match/page.tsx`) passes
  `new Date().getFullYear()` once, at the boundary.
- **Type-only imports avoid the `server-only` guard.** `scoring.ts` imports `MediaType`/`StreamingMovie`
  from `src/lib/tmdb/movies.ts` via `import type`, which TypeScript fully erases at compile time — no
  runtime import of `movies.ts` (and its `import "server-only"`) happens, so `scoring.ts` stays plain,
  testable, and doesn't need the `mapping.ts`-style file split that spec 003 needed for its own pure
  logic.
- **Genre pool sent to `discoverMovies` is a broad union, not an intersection.** Fetching candidates
  matching *any* participant's preferred genre casts a wide net; the precise per-participant overlap
  (and mood/release-preference scoring) happens afterward in `rankCandidates`. An intersection-only
  fetch would risk zero candidates whenever participants' preferred genres don't overlap at all, even
  though a good compromise movie might still exist.
- Ran `pnpm typecheck`, `pnpm lint`, `pnpm test` (47 tests green, 15 new), and `pnpm build` (production
  build succeeds). Confirmed no regression on existing routes against the running dev server
  (`/`, `/session/new`, `/session/join`, and the identity-cookie redirect guard on
  `/session/[code]/match`).
