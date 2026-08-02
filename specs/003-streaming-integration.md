# Spec 003 — Streaming Integration

> **In one sentence:** A server-side TMDb data layer that gives Match Logic a real movie database —
> metadata, genres, and streaming availability — mapped to the fixed vocabulary the quiz already
> uses, instead of a placeholder list.

|                |                                                              |
| -------------- | ------------------------------------------------------------ |
| **Status**     | ✅ Done                                                       |
| **Issue**      | #TBD — "Streaming Integration" [NEEDS CLARIFICATION: assign issue #] |
| **Branch**     | `003-streaming-integration` (from `feature/mvp-core-loop`)    |
| **Feature**    | Streaming Integration                                         |
| **Depends on** | [002-quiz-flow](002-quiz-flow.md) (reuses its fixed genre/media-type/runtime vocabulary) |

**Short on time?** Read _User story_ and _Acceptance criteria_ — that's the whole point of the change and
how you'll know it's done. Everything after those is detail for whoever implements and reviews it.

---

## User story

_Who wants this, and what they get out of it._

As **Match Logic** (the next spec in the MVP core loop) I want **a server-side function that returns
real movies — with genres, runtime, media type, and streaming availability — matching a set of
filters**, so that **recommendations are computed against actual, watchable movies instead of a
placeholder or hardcoded list**.

---

## Background

_How things work today and what's wrong with that — grounded in real code (`file:line` links added
during `/implement`)._

- **Today:** No TMDb wiring exists at all — `docs/architecture/SYSTEM_OVERVIEW.md` documents the
  intended shape (TMDb API for metadata, an optional local cache) but nothing is implemented. The
  quiz (spec 002) already hardcodes a fixed 19-name genre list, mood list, runtime buckets, and a
  movie/TV choice in [`src/lib/quiz/questions.ts:10-30`](../src/lib/quiz/questions.ts) — this spec's
  genre vocabulary must match that list exactly, since Match Logic will compare a participant's quiz
  answer against a movie's genres. That list is already TMDb's standard *movie* genre names (per the
  comment at `questions.ts:7-9`), which is what makes a direct name→id mapping possible.
- **The problem:** Match Logic (the spec after this one) has nothing to compute recommendations
  against. `src/types/core.ts`'s `Movie` type is an unwired sketch, not backed by any real data
  source.
- **Already in place:** The server-only env-var pattern for secrets
  ([`src/lib/supabase/server.ts:1,6-19`](../src/lib/supabase/server.ts) reads
  `SUPABASE_SERVICE_ROLE_KEY`, never `NEXT_PUBLIC_`-prefixed, guarded by `import "server-only"`) —
  this spec's `TMDB_API_KEY` follows the same pattern; the fixed in-code vocabulary this spec must
  align genre names with (`questions.ts`'s `GENRE_OPTIONS`).

---

## Design decision

_The approach we picked, and what we deliberately leave alone._

A small server-only TMDb client module wraps the handful of TMDb endpoints Match Logic needs
(discover movies/TV by genre, and watch-provider/availability lookup), reading the API key from a
server-only env var. Genre names already hardcoded in the quiz (`src/lib/quiz/questions.ts`) are
TMDb's own standard genre names, so this spec maps them to TMDb's genre ids rather than inventing a
second vocabulary.

MVP scope, kept deliberately simple: calls TMDb live on every request (no cache table); watch
providers are looked up for a single hardcoded region (`US`, TMDb's most complete provider dataset);
a title missing metadata this integration's callers need (genres, runtime, media type) is filtered
out rather than returned with nulls; a TMDb API failure (network error, rate limit, bad response)
returns an empty array rather than throwing; a filter combination that matches nothing also just
returns an empty array — no automatic query relaxation (that logic, if ever needed, belongs to
Match Logic, not this data layer).

**Not touched:** The match/recommendation algorithm itself (separate spec, Match Logic) — this spec
only builds the data-access layer it will call. No UI is added in this spec; there is nothing
user-facing to show until Match Logic exists to consume this data.

---

## Acceptance criteria

_What "done" means. Every line is something a reviewer can check._

- [x] The TMDb API key is read from a server-only environment variable and is never sent to or
      readable by the client (no `NEXT_PUBLIC_` prefix; not imported from any client component).
- [x] A server-side function returns movies/TV shows filtered by genre(s), media type (movie/TV), and
      maximum runtime — the same vocabulary the quiz already collects (`src/lib/quiz/questions.ts`).
- [x] Returned results include, per title: TMDb id, title, genres, runtime, media type, release
      date/year, a poster image, and streaming platform availability.
- [x] The genre names this integration uses match `src/lib/quiz/questions.ts`'s fixed genre list
      exactly — no separate/drifting genre vocabulary.
- [x] Streaming availability is looked up for a single hardcoded region (`US`) for MVP.
- [x] No caching layer for MVP: every call hits the live TMDb API (no new database table).
- [x] TMDb API failures (network error, rate limit, malformed response) return an empty array rather
      than throwing or crashing the caller.
- [x] A title missing metadata this integration's callers need (genres, runtime, media type) is
      filtered out of the results rather than returned with null fields.
- [x] A filter combination that matches nothing returns an empty array (no automatic query
      relaxation — that's left to whatever calls this, if ever needed).
- [x] Typecheck passes; lint adds no new issues; tests green (note known pre-existing failures).

### Verification

_How each criterion above is proven._

- **New tests** — `src/lib/tmdb/genres.test.ts`: genre-name ↔ TMDb-genre-id mapping, including a
  check that every quiz genre resolves to a real TMDb id. `src/lib/tmdb/mapping.test.ts`:
  response-shape mapping (TMDb's raw JSON → this spec's typed `StreamingMovie` shape) and the
  missing-metadata filtering rule — following the existing `*.rules.test.ts` pattern of testing pure
  logic without network calls.
- The actual TMDb HTTP calls depend on the network (ruled out for automated tests by the testing
  invariants) — no `TMDB_API_KEY` is available in this environment, so a live call could not be made
  this session; verified by code review only (see Implementation notes).
- `pnpm typecheck` — clean. `pnpm lint` — no issues. `pnpm test` — 5 files, 32 tests, all green
  (10 new: 4 in `genres.test.ts`, 6 in `mapping.test.ts`). `pnpm build` — production build succeeds.

---

## Exact changes (file:line)

_The plan, for whoever implements it. Every change grounded in current code; expanded by `/implement`._

1. **`.env.example`** — add `TMDB_API_KEY=` alongside the existing Supabase vars.
2. **`src/lib/tmdb/client.ts`** (new) — `tmdbGet<T>(path, params)`: server-only (`import
   "server-only"`, mirroring `src/lib/supabase/server.ts:1`) fetch wrapper. Reads `TMDB_API_KEY`
   (throws loudly if missing — a config error, not a runtime API failure); network/parse failures are
   caught and return `null` (never throw), which is what lets callers implement the "empty array on
   failure" acceptance criterion.
3. **`src/lib/tmdb/genres.ts`** (new) — `TMDB_GENRE_ID_BY_NAME`: a hardcoded name→id map for TMDb's
   19 standard movie genres, keyed by the exact strings in `questions.ts`'s `GENRE_OPTIONS`
   (`questions.ts:10-30`). `genreIdsForNames(names)` looks up ids, silently dropping any name with no
   match (defensive; in practice every quiz genre has one, which the tests assert).
4. **`src/lib/tmdb/genres.test.ts`** (new) — asserts every genre name in
   `QUIZ_QUESTIONS` (`questions.ts`) resolves to a real TMDb id, so the two lists can never silently
   drift apart.
5. **`src/lib/tmdb/mapping.ts`** (new) — `StreamingMovie`/`MediaType` types and
   `mapDetailsToStreamingMovie(details, mediaType)`: pure function mapping a raw TMDb detail response
   to `StreamingMovie`, filtering out titles missing title/runtime/release-year/genres. Kept in its
   own file, separate from `movies.ts`'s `import "server-only"` — that guard throws unconditionally
   under Vite/vitest (it relies on Next's bundler aliasing it to a no-op only in server bundles), so a
   pure function co-located with it would be untestable, same reason `src/lib/quiz/rules.ts` is split
   from `quiz-data.ts`/`actions.ts`.
6. **`src/lib/tmdb/mapping.test.ts`** (new) — pure tests for `mapDetailsToStreamingMovie`: full valid
   response → correct `StreamingMovie`; missing runtime/title/genres/release-date → `null` (filtered,
   not nulled); watch-provider extraction for the `US` region.
7. **`src/lib/tmdb/movies.ts`** (new) — `DiscoverFilters` type; `discoverMovies(filters)`: calls
   `/discover/movie` or `/discover/tv` (genre ids OR-joined, `watch_region=US`, and
   `with_runtime.lte` for movies), then fetches per-title details (`append_to_response=watch/providers`
   combines runtime + streaming platforms into one call per title) via `mapDetailsToStreamingMovie`,
   and applies the runtime cutoff client-side too (TMDb's discover endpoint has no runtime filter for
   TV).

**No change needed:** `src/types/core.ts` — same as spec 001's precedent for `session-data.ts`, this
spec introduces the real, wired `StreamingMovie` shape in `movies.ts` instead of retrofitting the
unused sketch type.

---

## Data model

_Any database change. Most specs have none — say so plainly._

**No schema changes.** MVP calls TMDb live on every request (no cache table) — see Design decision.

---

## Security

_Two lines at most: what this opens up and who may reach it — or "nothing security-relevant, because …".
Required by the constitution; silence is not an answer._

The TMDb API key is a paid/rate-limited third-party credential — it must stay server-side only (same
posture as `SUPABASE_SERVICE_ROLE_KEY`). No user input reaches TMDb unsanitized-fatal (genre/media
type/runtime filters are drawn from the fixed in-code vocabulary, not free text).

---

## Edge cases

_Unusual inputs or states, and what should happen._

- TMDb returns zero results for a given filter combination → an empty array; no automatic filter
  relaxation.
- TMDb is down or rate-limited → an empty array; does not throw or crash the caller.
- A movie is missing metadata this integration's callers need (title, runtime, release date, genres)
  from TMDb → filtered out of the results rather than returned with null fields. A missing poster
  image alone does *not* filter a title out — `posterUrl` is nullable; a movie without artwork can
  still be a valid recommendation candidate.

---

## Out of scope

_Deliberately excluded, so nobody wonders whether it was forgotten._

- The match/recommendation algorithm itself — separate spec (Match Logic), which will be this
  integration's first real caller.
- Any UI — there is nothing user-facing to show until Match Logic exists to consume this data.
- Writing back to TMDb or storing user-generated content against a movie — the constitution is
  explicit that movie metadata is read-only from TMDb; MatchFlix never modifies or extends it.
- Non-MVP TMDb data (cast/crew, reviews, trailers, recommendations-by-TMDb-itself) — only what Match
  Logic's documented scoring inputs need (genres, mood-adjacent tags if any, runtime, streaming
  availability).

---

## Implementation notes

- **No `TMDB_API_KEY` available in this environment.** `.env.local` doesn't have one (only the
  Supabase vars) and no key was provided this session, so `discoverMovies`'s actual TMDb HTTP calls
  could not be exercised live — same class of environment limitation as spec 001's DDL access.
  Verified instead by code review of `src/lib/tmdb/{client,movies}.ts` plus the two pure-function test
  suites, which cover everything that doesn't require the network (genre mapping, response mapping,
  missing-metadata filtering). Add a real key to `.env.local` before Match Logic can call this
  successfully — `.env.example` documents the variable name.
- **`server-only` throws unconditionally under vitest**, not just when accidentally bundled for the
  client — it relies on Next's bundler aliasing it to a no-op specifically in server compilation
  targets, which Vite/vitest doesn't do. Discovered while writing the response-mapping tests: importing
  anything from `movies.ts` (which has `import "server-only"` at module scope) into a test file threw
  immediately. Fixed by splitting the pure mapping logic into `mapping.ts` (no `server-only`, fully
  testable) and keeping only the actual network I/O in `movies.ts` — the same shape as
  `src/lib/quiz/rules.ts` vs. `quiz-data.ts`/`actions.ts`.
- **Movie genre ids are reused for TV discover calls, not a separate TV genre mapping.** TMDb's TV
  genre ids differ from movie genre ids for a few categories (e.g. TV combines "Science Fiction" and
  "Fantasy" into one "Sci-Fi & Fantasy" id that doesn't exist on the movie side). Since
  `questions.ts`'s fixed genre list is explicitly TMDb's *movie* genre list, and building a second,
  imperfect TV-specific mapping wasn't part of what `/clarify` scoped, `mediaType: "tv"` calls reuse
  the same `TMDB_GENRE_ID_BY_NAME` ids. Practical effect: a `tv` search for genres TMDb splits
  differently (Sci-Fi/Fantasy) may under-match slightly. Documented simplification, not a defect —
  revisit if Match Logic testing shows it matters.
- Ran `pnpm typecheck`, `pnpm lint`, `pnpm test` (32 tests green, 10 new), and `pnpm build` (production
  build succeeds, no regression on existing routes).
