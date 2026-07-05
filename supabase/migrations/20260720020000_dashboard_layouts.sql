-- Per-user customizable dashboard widgets (Command Center and the other
-- StatTile-grid overview pages): which widgets show, in what order, and
-- whether the page renders as a 2-column grid or a stacked list. This is
-- a personal display preference, not shared workspace data — the same
-- workspace member sees a different arrangement on their own screen only,
-- matching the existing notification_preferences pattern (user_id, not
-- workspace_member_id, since the preference travels with the person, not
-- their membership in one specific workspace).

create table public.dashboard_layouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  page_key text not null,
  layout_mode text not null default 'grid' check (layout_mode in ('grid', 'list')),
  widget_order jsonb not null default '[]'::jsonb,
  hidden_widgets jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, page_key)
);

alter table public.dashboard_layouts enable row level security;

create policy "users manage their own dashboard layout"
  on public.dashboard_layouts for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
