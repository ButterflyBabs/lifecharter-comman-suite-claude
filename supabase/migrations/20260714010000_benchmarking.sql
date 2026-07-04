-- Benchmarking with privacy-safe aggregation (Section 18, Phase 8's
-- deferred remainder, item 3). Section 15.2 names dozens of possible
-- metrics but gives no further detail; four were chosen because they're
-- computed identically for every workspace regardless of its own
-- configuration (unlike workspace-defined KPIs, whose formulas can
-- differ), confirmed with the user before building: closed-won rate,
-- client at-risk percentage, capacity/delivery utilization, and
-- automation success rate.
--
-- Unlike the template marketplace (which stores a new cross-tenant-
-- readable row), benchmarking stores nothing new at all — there is no
-- table here. get_workspace_benchmarks() computes every workspace's value
-- for each metric internally (SECURITY DEFINER, bypassing RLS for its own
-- read) but only ever returns two numbers per metric: the calling
-- workspace's own value, and an aggregate across *other* workspaces —
-- never another workspace's individual value. The spec's own acceptance
-- criterion ("Benchmarking cannot expose another workspace's identifiable
-- information") is enforced by a hard floor: the aggregate is only
-- returned once at least 10 other workspaces have a computable value for
-- that metric; below that it's null, and the UI shows "not enough data
-- yet" instead of a number.

create or replace function public.get_workspace_benchmarks(p_workspace_id uuid)
returns table (
  metric text,
  your_value numeric,
  benchmark_value numeric,
  contributing_workspaces integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_is_member boolean;
  v_min_pool constant integer := 10;
begin
  select exists (
    select 1 from public.workspace_members
    where workspace_id = p_workspace_id and user_id = auth.uid() and status = 'active'
  ) into v_is_member;

  if not v_is_member then
    raise exception 'Not an active member of this workspace';
  end if;

  return query
  with closed_won as (
    select workspace_id,
      count(*) filter (where status = 'won')::numeric / nullif(count(*) filter (where status in ('won', 'lost')), 0) as value
    from public.opportunities
    group by workspace_id
    having count(*) filter (where status in ('won', 'lost')) > 0
  ),
  latest_health as (
    select distinct on (client_id) client_id, workspace_id, status
    from public.client_health_events
    order by client_id, calculated_at desc
  ),
  at_risk as (
    select workspace_id,
      count(*) filter (where status = 'at_risk')::numeric / nullif(count(*), 0) as value
    from latest_health
    group by workspace_id
    having count(*) > 0
  ),
  capacity as (
    select workspace_id,
      sum(actual_hours)::numeric / nullif(sum(planned_hours), 0) as value
    from public.capacity_allocations
    group by workspace_id
    having sum(planned_hours) > 0
  ),
  automation as (
    select workspace_id,
      count(*) filter (where status = 'success')::numeric / nullif(count(*) filter (where status in ('success', 'failed')), 0) as value
    from public.automation_runs
    group by workspace_id
    having count(*) filter (where status in ('success', 'failed')) > 0
  )
  select 'closed_won_rate'::text,
    (select round(value, 4) from closed_won where workspace_id = p_workspace_id),
    case when (select count(*) from closed_won where workspace_id <> p_workspace_id) >= v_min_pool
      then (select round(avg(value), 2) from closed_won where workspace_id <> p_workspace_id)
      else null end,
    (select count(*) from closed_won where workspace_id <> p_workspace_id)::integer
  union all
  select 'client_at_risk_pct'::text,
    (select round(value, 4) from at_risk where workspace_id = p_workspace_id),
    case when (select count(*) from at_risk where workspace_id <> p_workspace_id) >= v_min_pool
      then (select round(avg(value), 2) from at_risk where workspace_id <> p_workspace_id)
      else null end,
    (select count(*) from at_risk where workspace_id <> p_workspace_id)::integer
  union all
  select 'capacity_utilization'::text,
    (select round(value, 4) from capacity where workspace_id = p_workspace_id),
    case when (select count(*) from capacity where workspace_id <> p_workspace_id) >= v_min_pool
      then (select round(avg(value), 2) from capacity where workspace_id <> p_workspace_id)
      else null end,
    (select count(*) from capacity where workspace_id <> p_workspace_id)::integer
  union all
  select 'automation_success_rate'::text,
    (select round(value, 4) from automation where workspace_id = p_workspace_id),
    case when (select count(*) from automation where workspace_id <> p_workspace_id) >= v_min_pool
      then (select round(avg(value), 2) from automation where workspace_id <> p_workspace_id)
      else null end,
    (select count(*) from automation where workspace_id <> p_workspace_id)::integer;
end;
$$;

revoke execute on function public.get_workspace_benchmarks(uuid) from public, anon;
grant execute on function public.get_workspace_benchmarks(uuid) to authenticated;
