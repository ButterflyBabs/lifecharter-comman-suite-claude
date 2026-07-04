"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { isWorkspaceAdmin } from "@/lib/data/workspace";

export async function createRole(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  if (!(await isWorkspaceAdmin(workspaceId))) {
    redirect("/settings/roles?error=Only%20the%20Workspace%20Owner%20or%20Administrator%20can%20create%20roles");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("roles").insert({
    workspace_id: workspaceId,
    name: formData.get("name") as string,
    description: (formData.get("description") as string) || null,
    is_system: false,
  });

  if (error) {
    redirect(`/settings/roles?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/settings/roles");
}

// Only workspace-custom roles (is_system = false) can have their
// permissions edited — system roles are the shared 15-role vocabulary
// seeded in Phase 1 and used throughout onboarding language; changing what
// "Coach" can do workspace-by-workspace would make that vocabulary
// unreliable. Custom roles created here are always editable.
export async function updateRolePermissions(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  if (!(await isWorkspaceAdmin(workspaceId))) {
    redirect("/settings/roles?error=Only%20the%20Workspace%20Owner%20or%20Administrator%20can%20change%20role%20permissions");
  }

  const roleId = formData.get("role_id") as string;
  const selectedPermissionIds = formData.getAll("permission_ids") as string[];
  const supabase = await createClient();

  const { data: role } = await supabase
    .from("roles")
    .select("id, is_system")
    .eq("id", roleId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (!role || role.is_system) {
    redirect("/settings/roles?error=Only%20workspace-specific%20roles%20can%20have%20their%20permissions%20edited");
  }

  await supabase.from("role_permissions").delete().eq("role_id", roleId);
  if (selectedPermissionIds.length > 0) {
    await supabase.from("role_permissions").insert(
      selectedPermissionIds.map((permissionId) => ({ role_id: roleId, permission_id: permissionId })),
    );
  }

  revalidatePath("/settings/roles");
}

export async function deleteRole(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  if (!(await isWorkspaceAdmin(workspaceId))) {
    redirect("/settings/roles?error=Only%20the%20Workspace%20Owner%20or%20Administrator%20can%20delete%20roles");
  }

  const roleId = formData.get("role_id") as string;
  const supabase = await createClient();

  const { count } = await supabase
    .from("member_roles")
    .select("id", { count: "exact", head: true })
    .eq("role_id", roleId);

  if (count && count > 0) {
    redirect(`/settings/roles?error=${encodeURIComponent(`Cannot delete a role assigned to ${count} member(s) — reassign them first`)}`);
  }

  const { error } = await supabase.from("roles").delete().eq("id", roleId).eq("workspace_id", workspaceId);
  if (error) {
    redirect(`/settings/roles?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/settings/roles");
}
