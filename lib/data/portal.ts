import { createClient } from "@/lib/supabase/server";

export type PortalAccess = { clientId: string; workspaceId: string };

// A portal user has no workspace_members row at all — they're a second
// identity class alongside workspace members, resolved through
// client_portal_access instead of private.active_workspace_ids(). Mirrors
// getCurrentWorkspaceId()'s "first match wins" simplification: a client
// with portal access to more than one workspace isn't a case this build
// handles yet.
export async function getPortalAccess(): Promise<PortalAccess | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("client_portal_access")
    .select("client_id, workspace_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!data) return null;
  return { clientId: data.client_id, workspaceId: data.workspace_id };
}
