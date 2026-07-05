-- Business Command Audit (My Roadmap, Phase 1) — engine extensions.
--
-- Additive reconciliation only. No existing table is recreated. Existing
-- audit_* tables (phase2_domains_and_audit) are the source of truth; this
-- migration extends them to support the /roadmap/plan A–D state flow, snapshot
-- mode, and soft-delete of audit runs/findings.

-- 1. Extend audit_instances.status with the states the /roadmap/plan UI derives
--    its A–D rendering from. Existing rows ('in_progress','completed') stay
--    valid. 'findings_pending' is the landing state after completion so State C
--    renders (no empty "Roadmap ready" flash); 'findings_approved' is State D.
alter table public.audit_instances drop constraint if exists audit_instances_status_check;
alter table public.audit_instances
  add constraint audit_instances_status_check
  check (status in ('not_started', 'in_progress', 'completed', 'findings_pending', 'findings_approved'));

-- 2. Soft-delete: no hard deletes on audit runs or findings.
alter table public.audit_instances add column if not exists archived_at timestamptz;
alter table public.audit_findings  add column if not exists archived_at timestamptz;

-- 3. Snapshot mode flag on the shared question bank. Defaults false so the full
--    bank is unaffected; the ~24 snapshot questions get tagged by a scoped
--    UPDATE later (do NOT flag the whole bank). Public route uses this later.
alter table public.audit_questions add column if not exists include_in_snapshot boolean not null default false;
