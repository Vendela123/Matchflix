# Spec 001 — Session Management

> **In one sentence:** Let a host create a shared match session with a short join code, let others
> join via that code or a link without an account, and let the host see participants and start the
> quiz when ready.

|                |                                                      |
| -------------- | ---------------------------------------------------- |
| **Status**     | ✅ Done                                              |
| **Issue**      | #TBD — "Session Management — MVP foundation" [NEEDS CLARIFICATION: assign issue #] |
| **Branch**     | `001-session-management` (from `feature/mvp-core-loop`) |
| **Feature**    | Session Management                                  |
| **Depends on** | nothing                                              |

**Short on time?** Read _User story_ and _Acceptance criteria_ — that's the whole point of the change and
how you'll know it's done. Everything after those is detail for whoever implements and reviews it.

---

## User story

_Who wants this, and what they get out of it._

As a **host** I want to **create a match session and have others join it with a short code or link,
using just a nickname** so that **my group can start picking a movie together without any sign-up
friction**.

---

## Background

_How things work today and what's wrong with that — grounded in real code (`file:line` links added
during `/implement`)._

- **Today:** No session concept exists yet; the Next.js/Tailwind/shadcn scaffold and Supabase wiring
  are in place but no session, join, or quiz-trigger flow has been built.
- **The problem:** There is no way for a group to gather in one place before the quiz — everything in
  the MVP core loop (quiz, matching) depends on a session existing first.
- **Already in place:** Supabase project wiring (`.env.local`) and the base Next.js app shell
  (`src/app/layout.tsx`, `src/app/page.tsx`) from `chore: scaffold Next.js/Tailwind/shadcn stack`.

---

## Design decision

_The approach we picked, and what we deliberately leave alone._

A host creates a session row in Supabase; the row gets a 6-character, uppercase, non-sequential join
code drawn from letters and numbers excluding visually ambiguous characters (`O`/`0`, `I`/`1`), used
both as the URL slug for the shareable link and as the manually-typed join code. The host is a
participant like any other — joining under a nickname and later completing the quiz themselves.
Participants join by submitting a nickname against that code — no auth. The host's client subscribes
to the session's participant list via a Supabase real-time subscription and sees joins as they happen.
The host can start the quiz once at least 2 participants (including themselves) have joined; starting
it flips the session state so all joined participants' clients move to the quiz and closes the session
to new joins. If the host disconnects before the quiz starts, host privileges transfer to the
earliest-joined remaining participant; if no other participant is present, the session ends. Sessions
with no activity for 24 hours automatically expire.

**Not touched:** The quiz itself, the matching/recommendation algorithm, and notifications — those are
separate specs. This spec ends at "quiz has started"; it does not compute or store quiz responses.

---

## Acceptance criteria

_What "done" means. Every line is something a reviewer can check._

- [x] A user can create a new match session with no account/login required.
- [x] Session creation generates a 6-character uppercase join code (letters + numbers, excluding
      `O`/`0`/`I`/`1`) that is non-sequential.
- [x] Other users can join an existing session by entering the join code.
- [x] Other users can join an existing session via a shareable link that encodes the join code.
- [x] Joining requires no account — only a nickname.
- [x] Nicknames are session-local (not globally unique); duplicate nicknames across sessions are fine.
- [x] The host is a participant too — they join with a nickname and complete the quiz like everyone
      else.
- [x] The host sees a live-updating list of participants as they join (via Supabase real-time), without
      refreshing the page.
- [x] The host can only start the quiz once at least 2 participants (including the host) have joined.
- [x] Only the host can start the quiz; starting it transitions the session so all joined participants'
      clients move to the quiz step, and closes the session to further joins.
- [x] If the host disconnects before the quiz starts, host privileges transfer to the earliest-joined
      remaining participant; if none remain, the session ends *(see Implementation notes — the "none
      remain" branch is covered by 24h expiry, not instant detection)*.
- [x] A session with no activity for 24 hours automatically expires.
- [x] Typecheck passes; lint adds no new issues; tests green (note known pre-existing failures).

### Verification

_How each criterion above is proven._

- **New tests** — `src/lib/session/rules.test.ts`: join-code format/charset, collision-retry
  generation, the ≥2-participant start guard, the 24h expiry boundary, and earliest-joined host
  handoff — all as pure-function unit tests (9 tests).
- Join-code generation → covered by `randomJoinCode`/`generateUniqueJoinCode` tests above.
- Join flow (code + link) and host-only start-quiz guard → these depend on a live Supabase database,
  which the testing invariants (no network in tests) rule out for automated coverage. Verified
  instead by code review of the authorization checks in `src/lib/session/actions.ts`
  (`startQuiz`, `joinSession`) and, after applying the migrations, by exercising the real
  create-session flow over HTTP against the running dev server — see Implementation notes.
- `pnpm typecheck` — clean. `pnpm lint` — no issues. `pnpm test` — 2 files, 11 tests, all green.
  `pnpm build` — production build succeeds (Next.js 16.2.12 / Turbopack).

---

## Exact changes (file:line)

_The plan, for whoever implements it. Every change grounded in current code; expanded by `/implement`._

1. **`supabase/migrations/0001_session_management.sql`** — new `sessions` and `session_participants`
   tables, RLS, and column-level grants (see Data model / Security).
2. **`supabase/migrations/0002_lock_down_join_code.sql`** — closes a gap found while applying 0001:
   Supabase grants `anon`/`authenticated` blanket table-level `SELECT` on new `public` tables by
   default, which silently overrode 0001's narrower column grant. Explicitly revokes table-level
   `SELECT` first, then re-grants only the safe columns.
3. **`src/lib/supabase/server.ts`** — service-role Supabase client factory, server-only.
4. **`src/lib/supabase/client.ts`** — anon-key Supabase client factory for the browser (realtime).
5. **`src/lib/session/rules.ts`** — pure business rules: join-code generation/charset,
   `canStartQuiz`, `isSessionExpired`, `pickNextHost`.
6. **`src/lib/session/session-data.ts`** — read/idempotent helpers shared by pages and actions:
   `getIdentity` (cookie read), `getSessionByCode`, `expireIfInactive`, `getParticipants`.
7. **`src/lib/session/actions.ts`** — server actions: `createSession`, `joinSession`, `startQuiz`,
   `transferHostIfNeeded`; sets the `mf_session`/`mf_participant` identity cookies.
8. **`src/components/session/create-session-form.tsx`**, **`join-session-form.tsx`**,
   **`session-lobby.tsx`** — client components (`useActionState` forms; the lobby subscribes to
   `postgres_changes` for the participant list and session status, and to Presence for host
   handoff).
9. **`src/app/session/new/page.tsx`**, **`src/app/session/join/page.tsx`** — create/join entry
   pages.
10. **`src/app/session/[code]/page.tsx`** — resolves the code, shows the join form if the visitor
    isn't yet a participant, otherwise the live lobby; redirects to the quiz once it starts.
11. **`src/app/session/[code]/quiz/page.tsx`** — placeholder confirming the session→quiz
    transition (the quiz itself is out of scope; see below).
12. **`src/app/page.tsx`** — added "Create a session" / "Join with a code" CTAs linking to the new
    routes.

**No change needed:** `src/types/core.ts` — explicitly a not-yet-persisted concept sketch; this spec
introduces the real persisted shapes in `session-data.ts` instead of retrofitting it.

---

## Data model

_Any database change. Most specs have none — say so plainly._

New Supabase tables, in `supabase/migrations/0001_session_management.sql`:
- `sessions` — id (uuid PK), join_code (6-char uppercase, unique), status (`waiting` /
  `quiz_in_progress` / `ended`), created_at, last_activity_at (drives the 24h expiry).
- `session_participants` — id, session_id (FK, cascade delete), nickname, is_host, joined_at. The
  host has a normal row here like every other participant; a partial unique index enforces at most
  one `is_host = true` row per session. `is_host` moves to the next-earliest-joined row if the host
  disconnects before the quiz starts.

RLS is enabled on both tables. Writes happen only through server actions using the service-role key
(bypasses RLS). Anon (browser) reads are: `session_participants` — fully readable (no sensitive
data); `sessions` — readable, but only the `id`, `status`, `created_at`, `last_activity_at` columns
are granted to `anon` — `join_code` is deliberately never selectable by the browser, so it can't be
enumerated. Getting this right took two migrations (`0001` then the `0002` fix); see Security and
Implementation notes.

---

## Security

_Two lines at most: what this opens up and who may reach it — or "nothing security-relevant, because …".
Required by the constitution; silence is not an answer._

The join code is the only access control (per constitution) — anyone with the code or link can join
and see the participant list, so codes must be non-sequential/hard to guess and sessions should not
leak other sessions' data. No auth, no PII beyond a self-chosen nickname.

`session_participants` is fully readable by `anon` (needed for realtime) — this leaks nicknames +
session ids across all sessions to anyone with the anon key, which is an accepted low-severity
tradeoff (no PII beyond a nickname, and a session id alone grants no access — the join code does).
`sessions.join_code` is never granted to `anon` at the column level, so join codes themselves cannot
be enumerated even though the table is otherwise readable.

**Found and fixed during this spec's implementation:** Supabase grants `anon`/`authenticated`
blanket table-level `SELECT` on new `public` tables by default. `0001`'s narrower column `GRANT` was
additive on top of that, not a restriction — verified live: `anon` could `select=join_code` and get
the real code back. `0002_lock_down_join_code.sql` explicitly `REVOKE`s table-level `SELECT` first,
then re-grants only the safe columns. Re-verified live afterward: `anon` selecting `join_code` now
gets `42501 permission denied`, while selecting `id`/`status` (the columns realtime actually needs)
still works.

---

## Edge cases

_Unusual inputs or states, and what should happen._

- Join code entered doesn't match any session → clear "session not found" error, no crash.
- Two participants pick the same nickname in one session → allowed (session-local, not unique).
- A participant tries to join after the host has already started the quiz → join is rejected (session
  is closed to new joins once the quiz starts).
- Host closes their tab/loses connection before the quiz starts → host privileges transfer to the
  earliest-joined remaining participant; if no other participant is present, the session ends.
- Session has no activity for 24 hours → session automatically expires.
- Join-code generation collision (extremely unlikely at MVP scale) → regenerate until unique.

---

## Out of scope

_Deliberately excluded, so nobody wonders whether it was forgotten._

- The quiz itself and its questions — separate spec.
- Match/recommendation computation — separate spec.
- Email/in-app notifications when a session is ready — separate spec (Notifications).
- Host disconnect handling *after* the quiz has started — only the pre-quiz case is in scope here.

---

## Implementation notes

- **Migrations applied.** DDL can't be run from this environment (`.env.local` only has the project
  URL, anon key, and service-role key — none authorize schema changes), so both migrations were
  applied by hand via the Supabase dashboard SQL Editor: `0001_session_management.sql`, then
  `0002_lock_down_join_code.sql` after the anon-grant gap below was found. Confirmed live via REST
  probes: both tables exist, `session_participants_one_host_per_session` correctly rejects a second
  host insert (`23505`), cascade delete removes participants when a session is deleted, and `anon`
  can no longer read `join_code`.
- **End-to-end verified against the real server, not just code review.** No browser tooling was
  connected this session, so the create-session form was submitted as a real HTTP request (extracting
  the actual `$ACTION_*` fields Next.js renders for the Server Action, not a simulated call): got a
  303 redirect to `/session/<CODE>`, `mf_session`/`mf_participant` cookies set correctly
  (httpOnly, 24h), and the lobby rendered the creator as host. Reloaded 5× with no errors. Test data
  cleaned up afterward.
- **A dev-server "Jest worker" crash during manual testing was environmental, not a code bug** — two
  concurrent `next dev` processes (from an earlier restart) briefly wrote to `.next/` at once,
  corrupting the Turbopack cache. Resolved by killing the stray process and clearing `.next`; not a
  defect in the shipped code.
- **24h expiry is lazy, not a background job.** `expireIfInactive` checks `last_activity_at` on every
  read of a session (join, lobby load, start-quiz) and flips `status` to `ended` if it's stale,
  instead of running a cron/edge function. Simpler, and sufficient at MVP scale — a session nobody
  touches for a day just quietly reports "expired" the next time anyone looks it up.
- **Host-disconnect-with-nobody-left is covered by the same lazy expiry, not instant detection.**
  Presence (Supabase Realtime) lets a *remaining* participant's client detect the host is gone and
  self-promote via `transferHostIfNeeded`. But if the host was alone when they disconnect, there's no
  other client left to notice — instant detection of an empty room would need a server-side presence
  webhook or scheduled sweep, which is more infrastructure than an MVP warrants. In practice, an
  abandoned solo session just expires within 24h instead of ending immediately. Noted as a deliberate
  simplification, not an oversight.
- **Realtime uses `postgres_changes` (not Broadcast).** This required granting `anon` SELECT (with
  `sessions` column-restricted, see Data model) so RLS lets the browser's realtime subscription
  receive row changes — the tradeoff is documented in Security.
- Ran `pnpm typecheck`, `pnpm lint`, `pnpm test` (11 tests green), and `pnpm build` (production build
  succeeds). `pnpm dev` starts cleanly; `/`, `/session/new`, `/session/join`, and `/session/[code]`
  (not-found path) all return 200.
