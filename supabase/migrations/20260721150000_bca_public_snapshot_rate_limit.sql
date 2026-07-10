-- Rate-limit anonymous public audit snapshot submissions by IP.
--
-- submit_public_audit_snapshot is callable directly via PostgREST
-- (granted to anon), with no cooldown before this migration — a script
-- could spam public_audit_snapshots with unlimited rows. IPs are stored
-- only as a sha256 hash, not raw, matching this table's existing pattern
-- of holding no more than the minimum needed to enforce the limit.
--
-- Scoped to this one function rather than a global pgrst.db_pre_request
-- hook (Supabase's documented pattern) because that hook fires on every
-- POST/PUT/PATCH/DELETE across the whole Data API — it would also throttle
-- normal authenticated app usage (creating tasks, completing milestones,
-- etc.), not just this anonymous lead-magnet form.

create table public.public_audit_snapshot_attempts (
  id uuid primary key default gen_random_uuid(),
  ip_hash text not null,
  created_at timestamptz not null default now()
);

create index public_audit_snapshot_attempts_ip_created_idx
  on public.public_audit_snapshot_attempts(ip_hash, created_at);

-- Locked down the same way as public_audit_snapshots: no policies, no
-- anon/authenticated grants — reachable only from inside the SECURITY
-- DEFINER function below.
alter table public.public_audit_snapshot_attempts enable row level security;
revoke all on table public.public_audit_snapshot_attempts from anon, authenticated;
grant all on table public.public_audit_snapshot_attempts to service_role;

create or replace function public.submit_public_audit_snapshot(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_ip text;
  v_ip_hash text;
  v_recent_count int;
  v_daily_count int;
begin
  if coalesce(payload->>'email', '') = '' then
    raise exception 'email is required';
  end if;

  -- PostgREST sets `request.headers` as a JSON GUC on every Data API call;
  -- a direct psql/service-role call (no HTTP context) won't have it, in
  -- which case there's no real IP to key a limit on, so the check is
  -- skipped rather than lumping every header-less caller into one bucket.
  v_ip := nullif(split_part(
    coalesce((current_setting('request.headers', true)::json ->> 'x-forwarded-for'), ''),
    ',', 1
  ), '');

  if v_ip is not null then
    v_ip_hash := encode(extensions.digest(v_ip, 'sha256'), 'hex');

    select count(*) into v_recent_count
    from public.public_audit_snapshot_attempts
    where ip_hash = v_ip_hash
      and created_at > now() - interval '1 hour';

    if v_recent_count >= 5 then
      raise exception 'Too many submissions from this location. Please try again later.';
    end if;

    select count(*) into v_daily_count
    from public.public_audit_snapshot_attempts
    where ip_hash = v_ip_hash
      and created_at > now() - interval '24 hours';

    if v_daily_count >= 15 then
      raise exception 'Too many submissions from this location. Please try again later.';
    end if;

    insert into public.public_audit_snapshot_attempts (ip_hash) values (v_ip_hash);
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
