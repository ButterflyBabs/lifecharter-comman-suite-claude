-- Public Business Command Audit snapshot (lead magnet).
--
-- Anonymous visitors can read ONLY the snapshot questions (public marketing
-- content) and submit a snapshot via a SECURITY DEFINER RPC (same pattern as
-- record_portal_login). Submissions land in a locked table reachable only
-- through that RPC / the service role — never exposed to anon via PostgREST.

create table public.public_audit_snapshots (
  id uuid primary key default gen_random_uuid(),
  template_key text not null default 'business-command-audit',
  template_version text,
  workspace_id uuid references public.workspaces(id) on delete set null,
  first_name text,
  email text not null,
  business_name text,
  role text,
  business_stage text,
  answers jsonb not null default '[]'::jsonb,
  overall_score numeric,
  per_phase_scores jsonb,
  result_band text,
  created_at timestamptz not null default now()
);

create index public_audit_snapshots_email_idx on public.public_audit_snapshots(email);
create index public_audit_snapshots_created_idx on public.public_audit_snapshots(created_at);

-- Locked: no policies; reachable only via the SECURITY DEFINER RPC / service role.
alter table public.public_audit_snapshots enable row level security;
revoke all on table public.public_audit_snapshots from anon, authenticated;
grant all on table public.public_audit_snapshots to service_role;

-- Public read of snapshot questions + their phase (marketing content only).
create policy "anyone can read snapshot audit questions" on public.audit_questions
  for select using (include_in_snapshot = true);

create policy "anyone can read active domains" on public.business_command_domains
  for select using (active is true);

-- Anonymous submission of a snapshot.
create or replace function public.submit_public_audit_snapshot(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if coalesce(payload->>'email', '') = '' then
    raise exception 'email is required';
  end if;

  insert into public.public_audit_snapshots
    (template_key, template_version, first_name, email, business_name, role, business_stage,
     answers, overall_score, per_phase_scores, result_band)
  values (
    coalesce(payload->>'templateKey', 'business-command-audit'),
    payload->>'templateVersion',
    left(payload->>'firstName', 200),
    left(payload->>'email', 320),
    left(payload->>'businessName', 300),
    payload->>'role',
    payload->>'businessStage',
    coalesce(payload->'answers', '[]'::jsonb),
    nullif(payload->>'overallScore', '')::numeric,
    payload->'perPhaseScores',
    payload->>'resultBand'
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.submit_public_audit_snapshot(jsonb) from public;
grant execute on function public.submit_public_audit_snapshot(jsonb) to anon, authenticated, service_role;
