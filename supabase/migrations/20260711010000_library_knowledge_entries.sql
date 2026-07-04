-- Knowledge and Asset Library (Section 9 / 10.9's assets/templates set,
-- Appendix A's /library/* route tree).
--
-- Nine of Business Brain's eleven knowledge categories (business identity,
-- founder/leadership, vision/strategy, business model, market/positioning,
-- brand/messaging, offers/pricing, proof, decisions) already have a
-- purpose-built home from earlier phases (founder_profiles, strategy_profiles,
-- business_models, market_segments/positioning_profiles, brand_profiles,
-- offers/offer_versions, proof_items, decisions) — Business Brain surfaces
-- those as live links/counts rather than duplicating them. Only the two
-- categories with no existing table (Policies, Glossary) need one.
--
-- knowledge_entries.version/status follow the exact "edit resets to draft"
-- pattern Phase 3 established for founder_profiles/brand_profiles/
-- strategy_profiles — an entry is a living document, re-approved after
-- every edit, not a one-shot record.

create table public.knowledge_entries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  knowledge_type text not null check (knowledge_type in ('policy', 'glossary')),
  title text not null,
  structured_content jsonb,
  owner uuid references auth.users(id),
  version integer not null default 1,
  status text not null default 'draft' check (status in ('draft', 'approved', 'retired')),
  effective_at date,
  review_at date,
  visibility text not null default 'internal' check (visibility in ('internal', 'client_visible', 'public')),
  dependent_modules text[],
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  archived_at timestamptz
);

create index knowledge_entries_workspace_id_idx on public.knowledge_entries(workspace_id);
create index knowledge_entries_knowledge_type_idx on public.knowledge_entries(workspace_id, knowledge_type);

create trigger set_updated_at before update on public.knowledge_entries
  for each row execute function public.set_updated_at();

alter table public.knowledge_entries enable row level security;

create policy "members can manage workspace knowledge entries" on public.knowledge_entries
  for all
  using (workspace_id in (select private.active_workspace_ids()))
  with check (workspace_id in (select private.active_workspace_ids()));

-- templates.template_type was free text with no constraint (Phase 1) since
-- no UI existed yet to populate it. Section 9's Templates module names a
-- closed list of 16 types; constraining it now that /library/templates
-- actually writes to this column.
alter table public.templates
  add constraint templates_template_type_check
  check (template_type in (
    'email_sms', 'outreach', 'campaign', 'content_brief', 'proposal', 'contract',
    'onboarding', 'journey_program', 'session', 'progress_review', 'renewal',
    'testimonial_referral', 'sop', 'automation', 'review', 'report'
  ));
