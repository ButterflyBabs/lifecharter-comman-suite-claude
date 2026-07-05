-- Canonical Business Command Audit v1 needs a stable question key, an intra-phase
-- display order, and support for the Risk secondary measure. Additive only.
alter table public.audit_questions
  add column if not exists question_key text,
  add column if not exists display_order integer,
  add column if not exists risk_eligible boolean not null default false,
  add column if not exists secondary_measure text;

-- question_key is unique when present (existing AI-authored rows leave it null).
create unique index if not exists audit_questions_question_key_key
  on public.audit_questions(question_key)
  where question_key is not null;
