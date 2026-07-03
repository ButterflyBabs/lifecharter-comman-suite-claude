import { getUserWorkspaces } from "./workspace";

// Phase 1 simplification — see getUserWorkspaces(). Returns null when the
// signed-in user has no workspace yet (before Phase 2's setup wizard exists).
export async function getCurrentWorkspaceId(): Promise<string | null> {
  const workspaces = await getUserWorkspaces();
  return workspaces[0]?.id ?? null;
}
