-- Phase 8 fix: workspace_subscriptions.status was under-scoped against
-- Stripe's real Subscription.status enum (incomplete, incomplete_expired,
-- trialing, active, past_due, canceled, unpaid, paused) — the original
-- migration only allowed a subset, which would have made the webhook
-- handler's upsert fail (and be recorded as a failed billing_webhook_event)
-- the first time Stripe sent a status this build didn't expect. Caught and
-- fixed before any real webhook could hit it, the same "self-introduced
-- bug caught during this phase" pattern as Phase 4's revenue_forecasts
-- default fix.

alter table public.workspace_subscriptions drop constraint workspace_subscriptions_status_check;

alter table public.workspace_subscriptions add constraint workspace_subscriptions_status_check
  check (status in (
    'none', 'incomplete', 'incomplete_expired', 'trialing', 'active',
    'past_due', 'canceled', 'unpaid', 'paused'
  ));
