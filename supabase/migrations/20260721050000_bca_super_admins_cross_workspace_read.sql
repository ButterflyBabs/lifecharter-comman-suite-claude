-- Business Command Audit — super-admin cross-workspace READ.
--
-- The roles/permissions model is workspace-scoped (roles.workspace_id); there is
-- no global role. Rather than distort that model, super admins are a dedicated,
-- explicit allow-list. is_super_admin() is wired into SELECT-only policies so a
-- super admin can READ across workspaces without gaining write access anywhere.
-- These are additive PERMISSIVE policies (OR'd with the existing member policies);
-- normal workspace scoping is untouched.

create table public.super_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  note text,
  created_at timestamptz not null default now()
);

grant all on table public.super_admins to authenticated, service_role;

alter table public.super_admins enable row level security;

-- Only super admins can see the roster; writes are service-role only (no write
-- policy → denied for authenticated).
create policy "super admins can read the roster" on public.super_admins
  for select using (private.is_super_admin());

create or replace function private.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.super_admins sa where sa.user_id = auth.uid()
  );
$$;

revoke all on function private.is_super_admin() from public, anon;
grant execute on function private.is_super_admin() to authenticated, service_role;

-- Cross-workspace read, SELECT only. audit_domain_scores is a security_invoker
-- view over audit_responses + audit_instances, so granting super-admin SELECT on
-- those base tables covers the view too.
create policy "super admins can read all audit instances" on public.audit_instances
  for select using (private.is_super_admin());

create policy "super admins can read all audit responses" on public.audit_responses
  for select using (private.is_super_admin());

create policy "super admins can read all audit findings" on public.audit_findings
  for select using (private.is_super_admin());

create policy "super admins can read all findings summaries" on public.audit_findings_summary
  for select using (private.is_super_admin());

create policy "super admins can read all adaptive questions" on public.audit_adaptive_questions
  for select using (private.is_super_admin());
