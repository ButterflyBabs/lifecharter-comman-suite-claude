-- Fix: increment_marketplace_install_count was left callable by anon/public
-- by default (Postgres grants EXECUTE to PUBLIC on new functions unless
-- explicitly revoked) — the same class of finding Phase 1's
-- handle_new_user()/log_audit_event() and Phase 8's increment_usage_counter
-- already fixed. Caught by the security advisor immediately after applying
-- the marketplace migration, before anything used it.

revoke execute on function public.increment_marketplace_install_count(uuid) from public, anon;
grant execute on function public.increment_marketplace_install_count(uuid) to authenticated;
