-- public.dashboard_data was a pre-existing, empty, generic key-value table with an
-- effectively-open RLS policy (USING true / WITH CHECK true), not part of the
-- canonical Section 10 data model. Dropped in Phase 0 so Phase 1's real schema
-- starts clean. See docs/migration-and-deployment.md.
drop table if exists public.dashboard_data;
