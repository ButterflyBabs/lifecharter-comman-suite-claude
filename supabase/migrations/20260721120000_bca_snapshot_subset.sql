-- Snapshot mode subset for the public lead-magnet route: one Build Completion
-- (displayOrder 1, key _01) and one Operating Health (displayOrder 3, key _03)
-- question per phase = 24 questions, balanced across both measures and all 12
-- phases. Scoped to the active canonical questions (question_key is only set on
-- the seeded v1 bank; the superseded AI-authored rows have null keys).
update public.audit_questions
  set include_in_snapshot = true
  where question_key ~ '_0[13]$';
