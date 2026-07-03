-- Phase 1: Core spine and tenant safety — notifications/preferences and the
-- asset/template version foundations (Section 10.9 subset).

-- Not tenant-scoped: a notification belongs to its recipient regardless of
-- workspace context. workspace_id is kept for UI filtering (which workspace a
-- notification relates to) but RLS is keyed on recipient_id, which is simpler
-- and strictly correct — no user can ever see another user's notification.
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  severity text not null default 'info' check (severity in ('info', 'warning', 'critical')),
  subject_type text,
  subject_id uuid,
  message text not null,
  action_url text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  notification_type text not null,
  channel text not null default 'in_app' check (channel in ('in_app', 'email', 'sms')),
  cadence text not null default 'immediate' check (cadence in ('immediate', 'daily_digest', 'weekly_digest')),
  quiet_hours jsonb,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, notification_type, channel)
);

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null,
  asset_type text not null,
  owner uuid references auth.users(id),
  current_version_id uuid,
  visibility text not null default 'internal' check (visibility in ('internal', 'client_visible', 'public')),
  status text not null default 'draft' check (status in ('draft', 'approved', 'archived')),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  archived_at timestamptz
);

create table public.asset_versions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  asset_id uuid not null references public.assets(id) on delete cascade,
  version integer not null,
  storage_path text,
  mime_type text,
  checksum text,
  created_by uuid references auth.users(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (asset_id, version)
);

alter table public.assets
  add constraint assets_current_version_id_fkey
  foreign key (current_version_id) references public.asset_versions(id) on delete set null;

create table public.folders (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  parent_id uuid references public.folders(id) on delete cascade,
  name text not null,
  visibility text not null default 'internal' check (visibility in ('internal', 'client_visible', 'public')),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  category text,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (workspace_id, category, name)
);

create table public.asset_tags (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  asset_id uuid not null references public.assets(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  unique (asset_id, tag_id)
);

create table public.templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  template_type text not null,
  owner uuid references auth.users(id),
  current_version_id uuid,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  archived_at timestamptz
);

create table public.template_versions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  template_id uuid not null references public.templates(id) on delete cascade,
  version integer not null,
  schema_json jsonb,
  content text,
  effective_at timestamptz,
  created_at timestamptz not null default now(),
  unique (template_id, version)
);

alter table public.templates
  add constraint templates_current_version_id_fkey
  foreign key (current_version_id) references public.template_versions(id) on delete set null;

-- ============================================================================
-- Indexes
-- ============================================================================

create index notifications_recipient_id_idx on public.notifications(recipient_id, read_at);
create index notification_preferences_user_id_idx on public.notification_preferences(user_id);
create index assets_workspace_id_idx on public.assets(workspace_id);
create index asset_versions_workspace_id_idx on public.asset_versions(workspace_id);
create index asset_versions_asset_id_idx on public.asset_versions(asset_id);
create index folders_workspace_id_idx on public.folders(workspace_id);
create index tags_workspace_id_idx on public.tags(workspace_id);
create index asset_tags_workspace_id_idx on public.asset_tags(workspace_id);
create index templates_workspace_id_idx on public.templates(workspace_id);
create index template_versions_workspace_id_idx on public.template_versions(workspace_id);

-- ============================================================================
-- updated_at triggers
-- ============================================================================

create trigger set_updated_at before update on public.notification_preferences
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.assets
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.folders
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.templates
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.assets enable row level security;
alter table public.asset_versions enable row level security;
alter table public.folders enable row level security;
alter table public.tags enable row level security;
alter table public.asset_tags enable row level security;
alter table public.templates enable row level security;
alter table public.template_versions enable row level security;

create policy "users manage their own notifications" on public.notifications
  for all
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

create policy "users manage their own notification preferences" on public.notification_preferences
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "members can manage workspace assets" on public.assets
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage asset versions" on public.asset_versions
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace folders" on public.folders
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace tags" on public.tags
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage asset tags" on public.asset_tags
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage workspace templates" on public.templates
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

create policy "members can manage template versions" on public.template_versions
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));
