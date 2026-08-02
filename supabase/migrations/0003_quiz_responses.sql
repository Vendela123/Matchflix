-- Spec 002 — Quiz Flow
-- One immutable response per participant per session, plus the sessions.status
-- value needed to signal "everyone has answered, move on to matching."

create table if not exists public.quiz_responses (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  participant_id uuid not null references public.session_participants(id) on delete cascade,
  preferred_genres text[] not null,
  avoided_genres text[] not null default '{}',
  mood text not null,
  runtime_bucket text not null,
  media_type text not null,
  release_preference text not null,
  submitted_at timestamptz not null default now(),
  unique (session_id, participant_id)
);

alter table public.quiz_responses enable row level security;

-- Only completion status (who has submitted) is needed by the browser, for the
-- live waiting screen — the answers themselves stay server-side. Following the
-- lesson from 0002: Supabase's default blanket anon SELECT grant on new public
-- tables is additive over any narrower column GRANT, so it must be revoked
-- explicitly first.
revoke select on public.quiz_responses from anon, authenticated;

grant select (id, session_id, participant_id, submitted_at) on public.quiz_responses to anon;

create policy "quiz response completion status is readable" on public.quiz_responses
  for select
  to anon
  using (true);

-- No insert/update/delete policies for anon: all writes go through server
-- actions using the service_role key, which bypasses RLS entirely — this is
-- also what makes responses immutable in practice.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'quiz_responses'
  ) then
    alter publication supabase_realtime add table public.quiz_responses;
  end if;
end $$;

-- Extend sessions.status: "matching" means every participant has submitted
-- their quiz response and the group moves on to the (separate spec) Match
-- Logic step.
alter table public.sessions drop constraint if exists sessions_status_check;
alter table public.sessions add constraint sessions_status_check
  check (status in ('waiting', 'quiz_in_progress', 'matching', 'ended'));
