-- Fine-grained role permission enforcement test (Section 11.2's
-- resource.action.scope model, actually consulted at request time via
-- private.has_permission() — see docs/permissions-and-rls.md's "Phase 1
-- Enforcement, Honestly" for the history of why this was previously just
-- a populated catalog, not a live decision path).
--
-- Covers the two Section 11.3 example scenarios this build added real
-- enforcement for:
--   1. Marketing cannot reconcile payments; Finance can.
--   2. Finance cannot read internal coaching notes via
--      sessions_for_role; Coach or Delivery Team can.
--
-- Also proves the base `sessions` table is untouched by this change
-- (masking only happens through the new view), so this is additive, not
-- a breaking change to Phase 5's existing session access.

begin;

insert into auth.users (id) values
  ('11111111-1111-1111-1111-100000000001'), -- Finance
  ('11111111-1111-1111-1111-100000000002'), -- Marketing
  ('11111111-1111-1111-1111-100000000003'); -- Coach or Delivery Team

insert into public.workspaces (id, name, slug) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Fine-Grained Permissions Test Tenant', 'fgp-test-tenant');

insert into public.workspace_members (id, workspace_id, user_id, status, joined_at) values
  ('e2000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-100000000001', 'active', now()),
  ('e2000000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-100000000002', 'active', now()),
  ('e2000000-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-100000000003', 'active', now());

insert into public.member_roles (workspace_member_id, role_id)
select 'e2000000-0000-0000-0000-000000000001', id from public.roles where workspace_id is null and name = 'Finance';
insert into public.member_roles (workspace_member_id, role_id)
select 'e2000000-0000-0000-0000-000000000002', id from public.roles where workspace_id is null and name = 'Marketing';
insert into public.member_roles (workspace_member_id, role_id)
select 'e2000000-0000-0000-0000-000000000003', id from public.roles where workspace_id is null and name = 'Coach or Delivery Team';

-- Payment reconciliation chain (payments.invoice_id and
-- invoices.order_id are both NOT NULL).
insert into public.orders (id, workspace_id, total, currency, status) values
  ('c2000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 500, 'usd', 'invoiced');
insert into public.invoices (id, workspace_id, order_id, amount_due, status) values
  ('d2000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c2000000-0000-0000-0000-000000000001', 500, 'paid');
insert into public.payments (id, workspace_id, invoice_id, amount, currency, status) values
  ('b2000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'd2000000-0000-0000-0000-000000000001', 500, 'usd', 'succeeded');

-- A client and one session carrying coach-only notes.
insert into public.clients (id, workspace_id, status, start_at) values
  ('c3000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'active', now());
insert into public.sessions (id, workspace_id, client_id, session_type, agenda, preparation_brief, internal_notes, status) values
  ('e3000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c3000000-0000-0000-0000-000000000001', 'coaching', 'Review Q3 goals', 'Client seemed disengaged last time', 'Recommend addressing accountability gap directly', 'completed');

-- Marketing (no payment.reconcile.workspace) cannot reconcile a payment.
set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-100000000002","role":"authenticated"}';

do $$
begin
  update public.payments set reconciliation_status = 'reconciled' where id = 'b2000000-0000-0000-0000-000000000001';
  raise exception 'FAIL 1: Marketing was able to reconcile a payment without the permission';
exception
  when others then
    if sqlerrm not like '%do not have permission to reconcile payments%' then
      raise exception 'FAIL 1: unexpected error instead of the permission guard: %', sqlerrm;
    end if;
end $$;

-- Finance (has payment.reconcile.workspace) can.
reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-100000000001","role":"authenticated"}';

do $$
declare
  v_status text;
begin
  update public.payments set reconciliation_status = 'reconciled' where id = 'b2000000-0000-0000-0000-000000000001';
  select reconciliation_status into v_status from public.payments where id = 'b2000000-0000-0000-0000-000000000001';
  if v_status <> 'reconciled' then raise exception 'FAIL 2: Finance could not reconcile a payment (status: %)', v_status; end if;
end $$;

-- Finance (no session_note.read.internal) sees masked coaching notes
-- through the role-aware view, even though they can read the session
-- row itself (workspace member, not blocked by RLS at the row level).
do $$
declare
  v_agenda text;
  v_prep text;
  v_notes text;
begin
  select agenda, preparation_brief, internal_notes into v_agenda, v_prep, v_notes
  from public.sessions_for_role where id = 'e3000000-0000-0000-0000-000000000001';
  if v_agenda is not null or v_prep is not null or v_notes is not null then
    raise exception 'FAIL 3: Finance saw coaching notes through sessions_for_role without the permission (agenda=%, prep=%, notes=%)', v_agenda, v_prep, v_notes;
  end if;

  -- The base table is untouched by this build: Finance can still read
  -- the row (and, per Phase 5's existing RLS, its real notes) directly —
  -- masking only happens through the new view, not a new table policy.
  select agenda, preparation_brief, internal_notes into v_agenda, v_prep, v_notes
  from public.sessions where id = 'e3000000-0000-0000-0000-000000000001';
  if v_agenda is null or v_prep is null or v_notes is null then
    raise exception 'FAIL 4: base sessions table unexpectedly masked notes — this build should not have changed it';
  end if;
end $$;

-- Coach or Delivery Team (has session_note.read.internal) sees the real
-- values through the same view.
reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-100000000003","role":"authenticated"}';

do $$
declare
  v_agenda text;
  v_prep text;
  v_notes text;
begin
  select agenda, preparation_brief, internal_notes into v_agenda, v_prep, v_notes
  from public.sessions_for_role where id = 'e3000000-0000-0000-0000-000000000001';
  if v_agenda is distinct from 'Review Q3 goals'
     or v_prep is distinct from 'Client seemed disengaged last time'
     or v_notes is distinct from 'Recommend addressing accountability gap directly' then
    raise exception 'FAIL 5: Coach or Delivery Team did not see real coaching notes through sessions_for_role (agenda=%, prep=%, notes=%)', v_agenda, v_prep, v_notes;
  end if;
end $$;

reset role;
rollback;
