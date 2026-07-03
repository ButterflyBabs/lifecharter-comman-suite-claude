import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role client. Bypasses Row Level Security — server-only, never
// import from a Client Component, and every call site must write to
// audit_events (Section 11.6).
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
