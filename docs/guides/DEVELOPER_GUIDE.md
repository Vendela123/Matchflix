# MatchFlix — Developer Guide

## Setup
```bash
pnpm dev        # start the dev server
```
Next.js (App Router) · TypeScript · Tailwind + shadcn/ui · Supabase (Postgres) · Vercel · GitHub

## Verification bar (run before any PR)
```bash
pnpm typecheck  # type check
pnpm lint       # linter — no new issues
pnpm test       # tests — green (note known pre-existing failures)
```

## Patterns & conventions
Session state is managed via Supabase real-time subscriptions; client components subscribe to session changes and render updates immediately. API routes handle TMDb queries; never expose TMDb API key to the client. Quiz response validation happens server-side. Recommendation algorithm is deterministic and stateless; given the same responses, it always returns the same result. Component names follow shadcn/ui conventions; custom components extend or wrap them. Quiz questions are stored in code, not the database, until MVP scope expands. Analytics events are logged to a Supabase table for later analysis.

## Workflow
Spec-driven, via slash commands: `/createspec → /clarify → /implement → /analyze`, with `/push` and
`/pr-check` around the PR. Governed by
[`../../.claude/spec-kit/constitution.md`](../../.claude/spec-kit/constitution.md). Branch + PR
direction: see [`../architecture/BRANCHING.md`](../architecture/BRANCHING.md).
