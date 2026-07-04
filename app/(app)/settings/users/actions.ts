"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { isWorkspaceAdmin } from "@/lib/data/workspace";

// Creating a brand-new auth.users row for someone with no account yet is a
// Supabase Admin-only operation (Section 11.3: this is the one place per
// invite that must use the service-role client, the same "no authenticated
// equivalent exists" exception as the setup wizard's workspace bootstrap).
// Everything after that — the workspace_members/member_roles/audit_events
// rows — goes through the regular RLS-scoped client, since "owners and
// admins can manage membership" already grants Workspace Owner/
// Administrator full access to workspace_members directly; the
// isWorkspaceAdmin() check below exists for a clean redirect message, not
// as the actual enforcement (RLS is the backstop either way).

export async function inviteMember(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  if (!(await isWorkspaceAdmin(workspaceId))) {
    redirect("/settings/users?error=Only%20the%20Workspace%20Owner%20or%20Administrator%20can%20invite%20members");
  }

  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const roleId = formData.get("role_id") as string;
  if (!email) redirect("/settings/users?error=Email%20is%20required");

  const supabase = await createClient();
  const {
    data: { user: actor },
  } = await supabase.auth.getUser();

  const admin = createAdminClient();
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email);

  if (inviteError || !invited?.user) {
    redirect(`/settings/users?error=${encodeURIComponent(inviteError?.message ?? "Could not invite this email")}`);
  }

  const { data: member, error: memberError } = await supabase
    .from("workspace_members")
    .insert({
      workspace_id: workspaceId,
      user_id: invited!.user.id,
      status: "invited",
      invited_email: email,
    })
    .select("id")
    .single();

  if (memberError || !member) {
    redirect(`/settings/users?error=${encodeURIComponent(memberError?.message ?? "Could not add this member to the workspace")}`);
  }

  if (roleId) {
    await supabase.from("member_roles").insert({ workspace_member_id: member!.id, role_id: roleId });
  }

  await supabase.from("audit_events").insert({
    workspace_id: workspaceId,
    actor: actor?.id ?? null,
    action: "member.invited",
    resource_type: "workspace_members",
    resource_id: member!.id,
    after_json: { email, role_id: roleId || null },
  });

  revalidatePath("/settings/users");
}

export async function updateMemberRole(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  if (!(await isWorkspaceAdmin(workspaceId))) {
    redirect("/settings/users?error=Only%20the%20Workspace%20Owner%20or%20Administrator%20can%20change%20roles");
  }

  const memberId = formData.get("member_id") as string;
  const roleId = formData.get("role_id") as string;

  const supabase = await createClient();
  await supabase.from("member_roles").delete().eq("workspace_member_id", memberId);
  if (roleId) {
    await supabase.from("member_roles").insert({ workspace_member_id: memberId, role_id: roleId });
  }

  revalidatePath("/settings/users");
}

export async function setAccessReviewDate(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  if (!(await isWorkspaceAdmin(workspaceId))) {
    redirect("/settings/users?error=Only%20the%20Workspace%20Owner%20or%20Administrator%20can%20set%20access%20reviews");
  }

  const supabase = await createClient();
  await supabase
    .from("workspace_members")
    .update({ access_review_at: (formData.get("access_review_at") as string) || null })
    .eq("id", formData.get("member_id") as string);

  revalidatePath("/settings/users");
}

export async function updateMemberStatus(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  if (!(await isWorkspaceAdmin(workspaceId))) {
    redirect("/settings/users?error=Only%20the%20Workspace%20Owner%20or%20Administrator%20can%20change%20membership%20status");
  }

  const memberId = formData.get("member_id") as string;
  const nextStatus = formData.get("next_status") as string;

  const supabase = await createClient();
  const { error } = await supabase.from("workspace_members").update({ status: nextStatus }).eq("id", memberId);

  if (error) {
    redirect(`/settings/users?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/settings/users");
}
