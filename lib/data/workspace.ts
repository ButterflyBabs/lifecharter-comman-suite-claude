import { createClient } from "@/lib/supabase/server";

export type WorkspaceSummary = { id: string; name: string; slug: string };

// Phase 1 simplification: no workspace-switching UI persists a selection yet
// (no cookie/preference row for it), so "current workspace" is just the first
// one RLS returns for this user. Real switching is a near-term follow-up once
// there's more than a placeholder to switch between.
export async function getUserWorkspaces(): Promise<WorkspaceSummary[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("workspaces").select("id, name, slug").order("created_at");
  return data ?? [];
}
