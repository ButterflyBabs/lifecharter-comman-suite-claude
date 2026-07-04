-- Benchmarking test: proves the actual privacy safeguard (the >=10-
-- contributing-workspaces floor), that a non-member cannot call the
-- function for a workspace they don't belong to, and that the function's
-- return shape can only ever be 4 metric rows — structurally incapable of
-- leaking a per-workspace row regardless of how many workspaces exist.

begin;

insert into auth.users (id) values
  ('11111111-1111-1111-1111-111111111111'),
  ('22222222-2222-2222-2222-222222222222');

-- Workspace A: the caller's own workspace, with a computable closed-won
-- rate (1 won, 1 lost) but no client_health_events at all (so
-- client_at_risk_pct's "your_value" should be null for A).
insert into public.workspaces (id, name, slug) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Benchmark Tenant A', 'bm-tenant-a'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Benchmark Tenant B', 'bm-tenant-b');

insert into public.workspace_members (id, workspace_id, user_id, status, joined_at) values
  ('e1000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'active', now()),
  ('e1000000-0000-0000-0000-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'active', now());

insert into public.opportunities (workspace_id, name, status)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'A Deal 1', 'won'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'A Deal 2', 'lost');

-- 12 other workspaces, each with one won opportunity, so closed_won_rate's
-- pool of *other* contributing workspaces is 12 (>= the 10 floor) but
-- client_at_risk_pct's pool stays at 0 (none of them have health events).
do $$
declare
  i integer;
  v_ws_id uuid;
begin
  for i in 1..12 loop
    v_ws_id := gen_random_uuid();
    insert into public.workspaces (id, name, slug) values (v_ws_id, 'Pool Workspace ' || i, 'pool-ws-' || i);
    insert into public.opportunities (workspace_id, name, status) values (v_ws_id, 'Pool Deal', 'won');
  end loop;
end $$;

set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

do $$
declare
  v_row record;
  v_row_count int := 0;
  v_closed_won_benchmark numeric;
  v_closed_won_pool int;
  v_at_risk_benchmark numeric;
  v_at_risk_pool int;
begin
  for v_row in select * from public.get_workspace_benchmarks('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') loop
    v_row_count := v_row_count + 1;
    if v_row.metric = 'closed_won_rate' then
      v_closed_won_benchmark := v_row.benchmark_value;
      v_closed_won_pool := v_row.contributing_workspaces;
      if v_row.your_value <> 0.5 then
        raise exception 'FAIL 1: expected A''s own closed_won_rate to be 0.5 (1 won of 2 closed), got %', v_row.your_value;
      end if;
    elsif v_row.metric = 'client_at_risk_pct' then
      v_at_risk_benchmark := v_row.benchmark_value;
      v_at_risk_pool := v_row.contributing_workspaces;
      if v_row.your_value is not null then
        raise exception 'FAIL 2: expected A''s own client_at_risk_pct to be null (no health events), got %', v_row.your_value;
      end if;
    end if;
  end loop;

  -- Exactly 4 metric rows — never one row per contributing workspace,
  -- regardless of the 14 workspaces that now exist in this transaction.
  if v_row_count <> 4 then raise exception 'FAIL 3: expected exactly 4 benchmark rows, got %', v_row_count; end if;

  -- The >=10 floor: 12 other workspaces contributed a closed-won value,
  -- so a real benchmark number is returned.
  if v_closed_won_pool < 10 or v_closed_won_benchmark is null then
    raise exception 'FAIL 4: expected a real closed_won_rate benchmark with a pool of 12, got pool=% benchmark=%', v_closed_won_pool, v_closed_won_benchmark;
  end if;

  -- The floor blocking case: 0 other workspaces have health events, so no
  -- benchmark is returned even though the function ran successfully.
  if v_at_risk_pool <> 0 or v_at_risk_benchmark is not null then
    raise exception 'FAIL 5: expected no client_at_risk_pct benchmark with a pool of 0, got pool=% benchmark=%', v_at_risk_pool, v_at_risk_benchmark;
  end if;
end $$;

-- Tenant B's user is not a member of tenant A — calling the function for
-- A's workspace must be rejected, not silently return A's data.
reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

do $$
begin
  begin
    perform public.get_workspace_benchmarks('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
    raise exception 'FAIL 6: a non-member was able to read tenant A''s benchmarks';
  exception
    when others then
      if sqlerrm not like 'Not an active member of this workspace' then
        raise exception 'FAIL 6b: unexpected error instead of the membership guard: %', sqlerrm;
      end if;
  end;
end $$;

reset role;
rollback;
