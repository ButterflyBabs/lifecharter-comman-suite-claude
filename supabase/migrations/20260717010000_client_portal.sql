-- Client-facing portal: client_portal_access already had a user_id column
-- (schema designed for this since Phase 5) but no real login flow or
-- client-facing pages existed. This migration adds the read surface a
-- signed-in client (NOT a workspace member) needs, without ever exposing
-- coach-internal data.
--
-- Client users are a second identity class alongside workspace members:
-- they authenticate via the same Supabase Auth, but have no
-- workspace_members row, so every existing "members can manage workspace
-- X" policy (scoped via private.active_workspace_ids()) already excludes
-- them by construction. New policies below are strictly additive grants
-- for this new identity class, gated by client_portal_access.

-- ============================================================================
-- 1. A portal user can read their own access row (the app needs this to
--    resolve which client_id a signed-in user represents).
-- ============================================================================
create policy "portal users can read their own access"
  on public.client_portal_access
  for select
  using (user_id = auth.uid());

-- ============================================================================
-- 2. client_actions: client_visible = true rows for the portal user's own
--    client only. client_actions has no coach-only free-text column beyond
--    what's already meant to be seen when client_visible is true, so a
--    direct row policy (not a view) is safe.
-- ============================================================================
create policy "portal users can read their own visible client actions"
  on public.client_actions
  for select
  using (
    client_visible = true
    and exists (
      select 1 from public.client_portal_access cpa
      where cpa.client_id = client_actions.client_id
      and cpa.user_id = auth.uid()
      and cpa.status = 'active'
    )
  );

-- ============================================================================
-- 3. deliverables and client_milestones: every column on these two tables
--    is already client-relevant (title, due/target dates, status,
--    approval status, evidence) — no internal_notes-style field to leak —
--    so a direct row policy is safe here too.
-- ============================================================================
create policy "portal users can read their own deliverables"
  on public.deliverables
  for select
  using (
    exists (
      select 1 from public.client_portal_access cpa
      where cpa.client_id = deliverables.client_id
      and cpa.user_id = auth.uid()
      and cpa.status = 'active'
    )
  );

create policy "portal users can read their own milestones"
  on public.client_milestones
  for select
  using (
    exists (
      select 1 from public.client_portal_access cpa
      where cpa.client_id = client_milestones.client_id
      and cpa.user_id = auth.uid()
      and cpa.status = 'active'
    )
  );

-- ============================================================================
-- 4. metrics + client_metric_values: metrics.client_visible gates which
--    metric *definitions* a portal user may see at all (workspace-wide,
--    not client-specific — metric definitions aren't per-client data), and
--    client_metric_values is further gated to the portal user's own client.
-- ============================================================================
create policy "portal users can read client-visible metric definitions"
  on public.metrics
  for select
  using (
    client_visible = true
    and exists (
      select 1 from public.client_portal_access cpa
      where cpa.workspace_id = metrics.workspace_id
      and cpa.user_id = auth.uid()
      and cpa.status = 'active'
    )
  );

create policy "portal users can read their own client-visible metric values"
  on public.client_metric_values
  for select
  using (
    exists (
      select 1 from public.client_portal_access cpa
      where cpa.client_id = client_metric_values.client_id
      and cpa.user_id = auth.uid()
      and cpa.status = 'active'
    )
    and exists (
      select 1 from public.metrics m
      where m.id = client_metric_values.metric_id
      and m.client_visible = true
    )
  );

-- ============================================================================
-- 5. Sessions carry internal_notes/agenda/preparation_brief alongside the
--    client-facing client_summary — a row policy on the base table would
--    leak the internal columns to any client who can see the row at all,
--    since RLS is row-level, not column-level. A narrow view exposing only
--    the safe columns, created with default (security-definer-like) view
--    semantics so it runs with the view owner's privileges rather than the
--    querying role's, is the standard way to do column-level security in
--    Postgres. The view's own WHERE clause (not table RLS) enforces the
--    identity/workspace scoping.
-- ============================================================================
create view public.client_portal_sessions
with (security_invoker = false)
as
select
  s.id,
  s.workspace_id,
  s.client_id,
  s.session_type,
  s.scheduled_at,
  s.completed_at,
  s.client_summary,
  s.client_summary_status,
  s.status
from public.sessions s
join public.client_portal_access cpa
  on cpa.client_id = s.client_id
  and cpa.user_id = auth.uid()
  and cpa.status = 'active'
where s.client_summary is not null;

grant select on public.client_portal_sessions to authenticated;

-- ============================================================================
-- 6. Branding: workspaces carries plenty of coach-internal columns
--    (subscription_plan_id, status, etc.) alongside the three
--    client-facing branding columns — same column-level-security reasoning
--    as sessions above, so a view rather than a table policy.
-- ============================================================================
create view public.client_portal_branding
with (security_invoker = false)
as
select
  w.id as workspace_id,
  w.name,
  w.client_portal_display_name,
  w.client_portal_logo_url,
  w.client_portal_primary_color
from public.workspaces w
join public.client_portal_access cpa
  on cpa.workspace_id = w.id
  and cpa.user_id = auth.uid()
  and cpa.status = 'active';

grant select on public.client_portal_branding to authenticated;
