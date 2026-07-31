# MatchFlix — Spec Constitution

The single source of truth for how MatchFlix is built and what every spec and change must
respect. When any other file disagrees with this one, **this file wins**. It holds the *invariants*
and links to canonical docs for detail. Amendments are recorded in the spec that changes them.

Canonical sources: [`CLAUDE.md`](../../CLAUDE.md) ·
[`VISION.md`](../../docs/VISION.md) ·
[`SYSTEM_OVERVIEW.md`](../../docs/architecture/SYSTEM_OVERVIEW.md) ·
[`DEVELOPER_GUIDE.md`](../../docs/guides/DEVELOPER_GUIDE.md) ·
[`BRANCHING.md`](../../docs/architecture/BRANCHING.md).

---

## I. Architecture invariants
All quiz responses must be collected before recommendation is computed. A match session cannot be shown a recommendation until all invited participants have answered. Session links are the only access control; no user login required. Movie metadata is read-only from TMDb; MatchFlix never modifies or extends it. Recommendations must be deterministic given a set of quiz responses; the same inputs always produce the same output. Real-time updates via Supabase subscriptions keep all users in a session in sync.

## II. Data invariants
A Match Session must have at least two users before a recommendation can be generated. Quiz responses are immutable once submitted within a session. Each quiz response belongs to exactly one user and one session. Movies in recommendations must exist in the TMDb database and have valid metadata (genres, runtime, streaming platforms). Session identifiers are globally unique and non-sequential. User nicknames are session-local, not globally unique.

## III. Design invariants
The interface feels playful and lightweight, not heavy or technical. Quiz questions are presented one at a time or in small groups to avoid overwhelming users. Recommendation presentation emphasizes what everyone agreed on, not tradeoffs. Streaming platform information is always visible on the recommendation so users know where to watch. Session creation and joining are instant; no sign-up flows. The experience is optimized for mobile and small screens.

## IV. Process invariants  (PORTABLE — the MatchFlix workflow, do not weaken)
- We work via GitHub: a **feature** is a GitHub Project, and **issues** are
  linked to that feature. Each issue gets a spec and a branch.
- **Spec before code.** Every issue gets a `specs/NNN-kort.md` before implementation; the spec is the
  source of truth and code is reviewed *against* it. One feature at a time. When code and spec
  disagree, stop and **fix the spec first**.
- **`/start` sets up, the spec loop builds.** `/start` takes this project to the bare minimum that
  runs — enough to open, change and continue from. That is its ceiling, not a starting budget.
  Everything past it goes through a spec: no spec, no feature.
- Branch `NNN-kort` (issue number + short name, **no** `issue/` prefix) is cut from its
  `feature/<name>`. **PR direction is strict and never skipped:** issue branch → its `feature/<name>`
  → `develop` → `main`. An issue branch is **never** PR'd to `main` or `develop`.
- **Conventional Commits**, atomic and buildable. Small PRs — one coherent slice; squash-merge.
- **Decisions are recorded** in the spec that introduces them, or a short note under `docs/` (with or
  before the implementing PR).
- **AI context stays synchronized.** `CLAUDE.md` and docs update in the **same** change as the code.
  Single source of truth: a fact lives in one file, everything else links; duplication is a bug.
- After implementing: check off acceptance criteria, set the spec **Status**, and update
  [`specs/README.md`](../../specs/README.md).

## V. Testing invariants  (PORTABLE — do not weaken)
- Tests are **co-located** with the code they cover, matching the test runner's glob so CI runs them.
- Tests are **deterministic**: no dependence on local time/timezone, randomness, or the network. Pin
  `TZ=UTC` and anchor fake time in UTC.
- Each spec's **Verification** section names the tests it adds. `/implement` writes them; `/analyze`
  confirms they exist and are green before closing a spec.
- Bug fixes ship with a regression test that fails before the fix. Failing/skipped tests never merge.

## VI. Verification bar
A change is not done until:
- Typecheck is clean:  `pnpm typecheck`
- Linter adds **no new** issues:  `pnpm lint`
- Tests are green:  `pnpm test`  — noting known pre-existing failures.
- The relevant acceptance criteria are demonstrably met (by a test or an explicit manual check).
