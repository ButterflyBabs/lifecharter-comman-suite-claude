-- Phase 3 RLS test: Business Architecture objects (Section 10.5).
--
-- Same pattern as rls_workspace_isolation.sql — wrapped in a transaction that
-- rolls back at the end, no state persists. Inserts one row per new table
-- (catches column/type typos across all 19 objects) and verifies workspace
-- isolation on a representative cross-section: the founder_profiles singleton,
-- the strategy_profiles -> goals -> key_results chain, and the
-- offers -> offer_versions -> offer_pricing/offer_capacity_models/offer_economics
-- chain.

begin;

insert into auth.users (id) values
  ('11111111-1111-1111-1111-111111111111'),
  ('22222222-2222-2222-2222-222222222222');

insert into public.workspaces (id, name, slug) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'BA Test Tenant A', 'ba-test-tenant-a'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'BA Test Tenant B', 'ba-test-tenant-b');

insert into public.workspace_members (workspace_id, user_id, status, joined_at) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'active', now()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'active', now());

-- One row per table, as service role (RLS bypassed by table owner in this
-- session before we switch to `authenticated`), covering both tenants.

insert into public.founder_profiles (workspace_id, role_statement) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Tenant A founder role'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Tenant B founder role');

insert into public.decision_principles (workspace_id, name, principle) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Tenant A principle', 'Say no to scope creep');

insert into public.strategy_profiles (id, workspace_id, vision) values
  ('c0000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Tenant A vision'),
  ('c0000000-0000-0000-0000-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Tenant B vision');

insert into public.goals (id, workspace_id, strategy_profile_id, title, metric, target) values
  ('c0000000-0000-0000-0000-000000000011', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c0000000-0000-0000-0000-000000000001', 'Tenant A goal', 'MRR', '10000');

insert into public.key_results (workspace_id, goal_id, metric_definition, target) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c0000000-0000-0000-0000-000000000011', 'Monthly recurring revenue', 10000);

insert into public.business_models (workspace_id, cost_structure) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Tenant A cost structure');

insert into public.market_segments (id, workspace_id, name) values
  ('c0000000-0000-0000-0000-000000000021', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Tenant A segment');

insert into public.ideal_profiles (id, workspace_id, market_segment_id, profile_name, pathway) values
  ('c0000000-0000-0000-0000-000000000022', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c0000000-0000-0000-0000-000000000021', 'Tenant A ideal client', 'b2b');

insert into public.positioning_profiles (workspace_id, ideal_profile_id, promise) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c0000000-0000-0000-0000-000000000022', 'Tenant A promise');

insert into public.brand_profiles (id, workspace_id, core_promise) values
  ('c0000000-0000-0000-0000-000000000031', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Tenant A core promise');

insert into public.message_pillars (workspace_id, brand_profile_id, title, message) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c0000000-0000-0000-0000-000000000031', 'Pillar 1', 'Tenant A message');

insert into public.claim_rules (workspace_id, brand_profile_id, claim_text, status) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c0000000-0000-0000-0000-000000000031', 'We double your revenue', 'restricted');

insert into public.proof_items (workspace_id, proof_type, title) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'testimonial', 'Tenant A testimonial');

insert into public.offers (id, workspace_id, name) values
  ('c0000000-0000-0000-0000-000000000041', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Tenant A offer'),
  ('c0000000-0000-0000-0000-000000000042', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Tenant B offer');

insert into public.offer_versions (id, workspace_id, offer_id, version, problem) values
  ('c0000000-0000-0000-0000-000000000051', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c0000000-0000-0000-0000-000000000041', 1, 'Tenant A problem');

insert into public.offer_deliverables (workspace_id, offer_version_id, title) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c0000000-0000-0000-0000-000000000051', 'Tenant A deliverable');

insert into public.offer_pricing (workspace_id, offer_version_id, price) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c0000000-0000-0000-0000-000000000051', 2500);

insert into public.offer_capacity_models (workspace_id, offer_version_id, max_clients) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c0000000-0000-0000-0000-000000000051', 10);

insert into public.offer_economics (workspace_id, offer_version_id, gross_margin) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c0000000-0000-0000-0000-000000000051', 0.65);

-- Tenant A member
set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

do $$
declare
  v_count int;
begin
  select count(*) into v_count from public.founder_profiles;
  if v_count <> 1 then raise exception 'FAIL 1: tenant A sees % founder_profiles (expected 1)', v_count; end if;

  select count(*) into v_count from public.founder_profiles where role_statement = 'Tenant B founder role';
  if v_count <> 0 then raise exception 'FAIL 2: tenant A can see tenant B founder profile by direct query'; end if;

  select count(*) into v_count from public.goals where title = 'Tenant A goal';
  if v_count <> 1 then raise exception 'FAIL 3: tenant A cannot see its own goal'; end if;

  select count(*) into v_count from public.key_results where metric_definition = 'Monthly recurring revenue';
  if v_count <> 1 then raise exception 'FAIL 4: tenant A cannot see its own key result'; end if;

  select count(*) into v_count from public.offers where name = 'Tenant B offer';
  if v_count <> 0 then raise exception 'FAIL 5: tenant A can see tenant B offer by direct query'; end if;

  select count(*) into v_count from public.offer_pricing where price = 2500;
  if v_count <> 1 then raise exception 'FAIL 6: tenant A cannot see its own offer pricing'; end if;

  update public.offers set name = 'HACKED' where id = 'c0000000-0000-0000-0000-000000000042';
  get diagnostics v_count = row_count;
  if v_count <> 0 then raise exception 'FAIL 7: tenant A could update tenant B offer (% rows)', v_count; end if;
end $$;

-- Tenant B member
reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

do $$
declare
  v_count int;
begin
  select count(*) into v_count from public.founder_profiles;
  if v_count <> 1 then raise exception 'FAIL 8: tenant B sees % founder_profiles (expected 1)', v_count; end if;

  select count(*) into v_count from public.founder_profiles where role_statement = 'Tenant A founder role';
  if v_count <> 0 then raise exception 'FAIL 9: tenant B can see tenant A founder profile by direct query'; end if;

  select count(*) into v_count from public.goals;
  if v_count <> 0 then raise exception 'FAIL 10: tenant B can see tenant A goals (expected 0, got %)', v_count; end if;

  select count(*) into v_count from public.offer_pricing;
  if v_count <> 0 then raise exception 'FAIL 11: tenant B can see tenant A offer pricing (expected 0, got %)', v_count; end if;
end $$;

reset role;
rollback;
