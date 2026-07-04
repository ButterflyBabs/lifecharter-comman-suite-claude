-- Real, previously-invisible gap surfaced by this build's new CI
-- workflow, not by anything in the hosted project: none of this
-- project's 178 tables (across every migration since Phase 1) has ever
-- had an explicit GRANT statement. On Supabase's hosted platform, base
-- table/sequence privileges for anon/authenticated/service_role are
-- provisioned automatically and silently the moment a project is
-- created — RLS policies have always been the *second* layer of
-- restriction on top of those grants, never a replacement for them.
-- Replaying every migration from scratch against a genuinely fresh,
-- non-hosted-provisioned Postgres (this build's CI, via the Supabase
-- CLI's local stack) has no such automatic bootstrap, so every single
-- RLS test failed immediately with "permission denied for table X," not
-- an RLS violation — there was no base grant to even attempt the query
-- against, regardless of any policy.
--
-- This migration is a no-op against the existing hosted project (these
-- grants already exist there silently) but is required for this schema
-- to function at all anywhere else, including this new CI stack.
--
-- Deliberately scoped to tables and sequences only, and to
-- `authenticated`/`service_role` only, never `anon` or `routines`:
-- every function grant in this codebase has been individually curated
-- (narrow, revoked from anon by default, granted only where a function
-- is meant to be callable) — a blanket `grant ... on all routines ...`
-- here would silently undo the anon-grant fixes already shipped this
-- session (increment_marketplace_install_count, record_portal_login,
-- etc.). This project has also never granted anon anything directly;
-- unauthenticated access goes through Supabase Auth itself, not table
-- grants.
grant usage on schema public to authenticated, service_role;
grant all on all tables in schema public to authenticated, service_role;
grant all on all sequences in schema public to authenticated, service_role;

-- So future migrations' new tables/sequences get the same baseline
-- automatically, without needing to repeat this migration.
alter default privileges in schema public grant all on tables to authenticated, service_role;
alter default privileges in schema public grant all on sequences to authenticated, service_role;
