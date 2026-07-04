import { createClient } from "@/lib/supabase/server";

export type WorkspaceSummary = { id: string; name: string; slug: string };

// Billing and data-deletion actions are Workspace Owner / Administrator
// only (Section 11.3) — this mirrors private.has_workspace_role() at the
// application layer using the regular RLS-scoped client, since RLS already
// restricts the underlying rows to the current user's own membership.
export async function isWorkspaceAdmin(workspaceId: string): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("workspace_members")
    .select("id, member_roles(roles(name))")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!data) return false;

  const roleNames = (data.member_roles as unknown as { roles: { name: string } | null }[] | null) ?? [];
  return roleNames.some((mr) => mr.roles?.name === "Workspace Owner" || mr.roles?.name === "Administrator");
}

// Phase 1 simplification: no workspace-switching UI persists a selection yet
// (no cookie/preference row for it), so "current workspace" is just the first
// one RLS returns for this user. Real switching is a near-term follow-up once
// there's more than a placeholder to switch between.
export async function getUserWorkspaces(): Promise<WorkspaceSummary[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("workspaces").select("id, name, slug").order("created_at");
  return data ?? [];
}
