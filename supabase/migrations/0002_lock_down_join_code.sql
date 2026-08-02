-- Fixes a gap in 0001: Supabase grants `anon`/`authenticated` blanket table-level
-- SELECT on new public tables by default (verified: anon could read join_code
-- despite 0001's narrower column GRANT — GRANT is additive, it can't be used to
-- take away a broader privilege granted elsewhere). Explicitly revoke first, then
-- re-grant only the safe columns, so join_code is genuinely unreadable by anon.

revoke select on public.sessions from anon, authenticated;

grant select (id, status, created_at, last_activity_at) on public.sessions to anon;
