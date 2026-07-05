-- dashboard_layouts RLS test: a personal display preference table, scoped
-- by user_id directly (not workspace membership) — proves a user can read
-- and write their own row, and cannot see another user's row at all, even
-- though both users are unrelated to any workspace here (this table has
-- no workspace concept at all, unlike almost everything else in this
-- schema).

begin;

insert into auth.users (id) values
  ('11111111-1111-1111-1111-100000000001'), -- owns a layout
  ('22222222-2222-2222-2222-100000000002'); -- owns a different layout

insert into public.dashboard_layouts (id, user_id, page_key, layout_mode, widget_order, hidden_widgets) values
  ('a0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-100000000001', 'command_center', 'list', '["capacity","roadmap_progress"]', '["secondary_metrics"]'),
  ('a0000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-100000000002', 'command_center', 'grid', '[]', '[]');

set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-100000000001","role":"authenticated"}';

do $$
declare
  v_count int;
  v_mode text;
begin
  -- Can read own layout, with the real saved values.
  select layout_mode into v_mode from public.dashboard_layouts where user_id = '11111111-1111-1111-1111-100000000001';
  if v_mode <> 'list' then raise exception 'FAIL 1: could not read own dashboard_layouts row (got %)', v_mode; end if;

  -- Cannot see the other user's row at all.
  select count(*) into v_count from public.dashboard_layouts where user_id = '22222222-2222-2222-2222-100000000002';
  if v_count <> 0 then raise exception 'FAIL 2: could read another user''s dashboard_layouts row (% rows)', v_count; end if;

  -- A blanket count(*) confirms RLS is filtering, not just the WHERE clause above.
  select count(*) into v_count from public.dashboard_layouts;
  if v_count <> 1 then raise exception 'FAIL 3: expected exactly 1 visible row (own), got %', v_count; end if;

  -- Can update own layout.
  update public.dashboard_layouts set layout_mode = 'grid' where user_id = '11111111-1111-1111-1111-100000000001';
  select layout_mode into v_mode from public.dashboard_layouts where user_id = '11111111-1111-1111-1111-100000000001';
  if v_mode <> 'grid' then raise exception 'FAIL 4: could not update own dashboard_layouts row (got %)', v_mode; end if;

  -- Cannot update the other user's row (0 rows affected, not an error).
  update public.dashboard_layouts set layout_mode = 'list' where user_id = '22222222-2222-2222-2222-100000000002';
  get diagnostics v_count = row_count;
  if v_count <> 0 then raise exception 'FAIL 5: updated another user''s dashboard_layouts row (% rows)', v_count; end if;
end $$;

rollback;
