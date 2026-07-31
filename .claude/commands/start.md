---
description: Take this foundation from documents to a project that runs, once.
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
---

Set up **MatchFlix** so it runs.

This foundation ships the documents, the rules and the workflow. It does not ship a stack — that is
what this command is for. Run it once, in a fresh clone. Read
@.claude/spec-kit/constitution.md first; everything below is subject to it.

**Re-runnable by design.** Check before every step and skip what is already there. A founder who runs
this twice, or runs it after writing code, must lose nothing. When a step's output already exists,
say so and move on — never overwrite, never scaffold on top.

**It stops at this machine.** No creating a remote repository, no provisioning a database, no
deploying, no writing secrets anywhere. Those need a human with an account and are step 2 of
[START_HERE.md](../../START_HERE.md).

---

## 1. Stack and toolchain

**Already has a `package.json`?** Then this section has run. Skip to section 2.

1. **Scaffold into a throwaway directory.** Every flag is passed, so it asks nothing:

   ```bash
   pnpm create next-app@latest matchflix-scaffold --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm --yes --disable-git --skip-install
   ```

2. **Move it in.** Copy everything from `matchflix-scaffold/` into this directory, **skipping any
   path that already exists** — this foundation's `README.md`, `CLAUDE.md`, `.github/` and
   `.gitignore` win over the generator's. Then delete `matchflix-scaffold/`, and set `name` in
   `package.json` to `matchflix` — the generator took it from that throwaway directory.
   Nothing that was here before you started may be modified or lost by this step; if you cannot
   move a file in without overwriting one of ours, leave ours and say so.

3. **Install dependencies:** `pnpm install`.

4. **Initialise shadcn/ui.** Tailwind came with the scaffolder (`--tailwind`); shadcn/ui did not,
   and this project's documents name both as its stack:

   ```bash
   pnpm dlx shadcn@latest init --yes --base-color neutral
   ```

   That writes `components.json` and the `cn` helper, and installs **no components**.
   Components arrive one at a time, when a spec calls for one: `pnpm dlx shadcn@latest add <name>`.

5. **Add the test runner:** `pnpm add -D vitest@^3`. Pinned to a major deliberately —
   unpinned, this lands whatever shipped today, and a test runner that will not start is the
   exact failure this command exists to prevent. A project whose `pnpm test`
   does nothing is worse than one without tests: it reports green having checked nothing.

6. **Make the five commands real.** The `scripts` block in `package.json` must define `dev`,
   `build`, `typecheck`, `lint` and `test`, because `START_HERE.md` and `.github/workflows/ci.yml`
   already name them. `typecheck` is `tsc --noEmit`; TypeScript runs `strict`.

7. **Create `.env.example`, then copy it to `.env.local`.** The foundation names this file but
   does not ship it — nothing here knows your keys, and a committed file that might hold one is
   not worth the risk. It carries variable *names* only, never values:

   ```
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=   # server-only — never prefix this one with NEXT_PUBLIC_
   ```

   `.env.local` is where real values go, and `.gitignore` must already exclude it.

## 2. Git, locally

Skip any of these that is already done.

1. `git init -b main`, if there is no `.git` here yet. The branch model this foundation ships is
   `main` ← `develop` ← `feature/<name>`, and git still defaults to `master` on many machines.
2. Commit everything as the first commit — the foundation as it was generated, before your changes.
3. Create the long-lived branches: `develop`, then your first `feature/<name>`. See
   [BRANCHING.md](../../docs/architecture/BRANCHING.md).

No remote. Adding one, and pushing, is yours to do in [START_HERE.md](../../START_HERE.md).

## 3. The smallest thing that runs

Replace the generator's placeholder home page with one screen that is recognisably this
project: **MatchFlix** — Allow two or more people to answer a short movie preference quiz and instantly receive a movie recommendation that matches everyone's tastes.

The core objects this product is about: Core Objects

👤 User

A person participating in a movie match.
Has a nickname and answers the quiz.

🎬 Movie

A movie with genres, runtime, age rating, mood, streaming platforms, release year, and description.

❓ Quiz Response

A user's answers about their preferences (genres, mood, runtime, language, etc.).

🤝 Match Session

A shared room where multiple users join, answer the quiz, and receive a recommendation together.

✨ Recommendation

The final movie (or top 3 movies) selected based on everyone's combined preferences.
Relationships
A Match Session contains multiple Users.
Each User sub Name them where they belong — a type, a folder, a heading. Do not model them, do not persist them, do not build screens for them.

Style it with Tailwind, using the shadcn/ui primitives section 1 installed where one fits. That is this project's design system and using it is not a feature — but do not add components ahead of a spec that calls for them.

**This is the ceiling, not a starting budget.** No features, no routes nobody asked for, no
database, no auth, nothing built ahead of a spec that calls for it. The founder should
open the page, recognise their product, and see plainly where to change it next. Everything
past that goes through `/createspec` — that is what the rest of this foundation is for.

## 4. Verify, and report honestly

Run all five and show the real output:

```bash
pnpm dev        # starts, serves the page, then stop it
pnpm build      # builds
pnpm typecheck  # type check
pnpm lint       # linter
pnpm test       # tests
```

This is the **verification bar**, and every change from here has to pass it before it merges — the
same bar `.github/workflows/ci.yml` runs on every push.

Report what you did, what you skipped because it already existed, and the result of each command. If
one of them fails, say which and why rather than working around it. A green bar that was reached by
weakening a check is worth less than a red one that is honest.

Then point the founder at step 2 of [START_HERE.md](../../START_HERE.md): the accounts and services
only they can create.
