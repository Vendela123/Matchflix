# Specs

Feature specifications for MatchFlix. Each spec is written before implementation.

One file per issue: `specs/NNN-kort.md`, combining the *what*, the *how* (exact `file:line` changes),
acceptance criteria, verification and edge cases in a single document.

## Automated workflow
Driven by slash commands (in [`.claude/commands/`](../.claude/commands/)), governed by the
constitution + template in [`.claude/spec-kit/`](../.claude/spec-kit/):

| Command | Phase |
|---------|-------|
| `/createspec <issue# \| "desc">` | Scaffold the spec + set up the `NNN-kort` branch off its feature |
| `/clarify` | Resolve `[NEEDS CLARIFICATION]` markers via targeted questions |
| `/implement` | Plan exact `file:line` changes, implement, add tests, run typecheck/lint/tests |
| `/analyze` | Cross-check spec ↔ code ↔ constitution; if all passes, close the spec out |
| `/push` | Commit pending changes + push (never main/develop, never force) |
| `/pr-check` | Pre-PR merge-safety check against the target branch |

## What to spec first
These are the capabilities chosen in the interview. Each one is a spec waiting to be written — run
`/createspec` for the one you need next and the command scaffolds `specs/NNN-kort.md` for you.

Quiz Flow ([`002-quiz-flow.md`](002-quiz-flow.md) — ✅ Done): Users enter a nickname and answer questions about preferred genres, mood, runtime tolerance, language, and streaming platform availability. Quiz responses are stored per session. Match Logic ([`004-match-logic.md`](004-match-logic.md) — ✅ Done): Recommendations are computed by comparing all participants' responses against a movie database, weighting overlapping preferences and returning the highest-scoring match. Streaming Integration ([`003-streaming-integration.md`](003-streaming-integration.md) — ✅ Done): The TMDb API provides movie metadata, genres, ratings, posters, and platform availability. Session Management ([`001-session-management.md`](001-session-management.md) — ✅ Done): One user creates a session, generates a shareable link, and invites others. The session collects responses and triggers recommendation once all participants answer. Notifications: Email or in-app alerts notify users when the session is ready or when all responses are received. Analytics: Track quiz starts, completions, recommendation acceptance rates, and session conversion.
