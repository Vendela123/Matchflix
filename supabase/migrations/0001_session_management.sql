-- Spec 001 — Session Management
-- Sessions and their participants. No auth: the join code (and, internally, the
-- non-sequential session id) are the only access control, per the constitution's
-- security model. Writes happen exclusively through server actions using the
-- service_role key, which bypasses RLS — anon (browser) access is read-only and,
-- on `sessions`, column-restricted so join codes can never be enumerated.

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  join_code text not null unique,
  status text not null default 'waiting'
    check (status in ('waiting', 'quiz_in_progress', 'ended')),
  created_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now()
);

create table if not exists public.session_participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  nickname text not null,
  is_host boolean not null default false,
  joined_at timestamptz not null default now()
);

-- At most one host per session.
create unique index if not exists session_participants_one_host_per_session
  on public.session_participants (session_id)
  where is_host;

create index if not exists session_participants_session_id_idx
  on public.session_participants (session_id);

alter table public.sessions enable row level security;
alter table public.session_participants enable row level security;

-- anon may read session status/timestamps (needed to detect "quiz started" and
-- expiry via realtime) but never join_code — that column is intentionally not
-- granted, so it cannot be selected or enumerated by the browser under any filter.
grant select (id, status, created_at, last_activity_at) on public.sessions to anon;

create policy "sessions are readable" on public.sessions
  for select
  to anon
  using (true);

-- Participant rows carry no sensitive data (a self-chosen nickname), so they are
-- fully readable — this is what powers the live participant list.
grant select on public.session_participants to anon;

create policy "session participants are readable" on public.session_participants
  for select
  to anon
  using (true);

-- No insert/update/delete policies for anon: all writes go through server actions
-- using the service_role key, which bypasses RLS entirely.

-- Publish both tables for realtime so the lobby can subscribe to postgres_changes.
-- Guarded so it's safe to re-run and safe on projects where `supabase_realtime`
-- is already a FOR ALL TABLES publication.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'sessions'
  ) then
    alter publication supabase_realtime add table public.sessions;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'session_participants'
  ) then
    alter publication supabase_realtime add table public.session_participants;
  end if;
end $$;
