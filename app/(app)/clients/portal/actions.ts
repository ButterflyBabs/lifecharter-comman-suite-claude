"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";

// Creating a brand-new auth.users row for a client with no account yet is
// a Supabase Admin-only operation, the same "no authenticated equivalent
// exists" exception as /settings/users' inviteMember. Unlike inviteMember
// (which sets workspace_members.status = "invited" with no flip-to-active
// step anywhere in this codebase yet), client_portal_access is set
// directly to "active" here — the actual access gate is Supabase Auth's
// own unconfirmed-user state until the client follows the emailed link to
// set a password, so there's no separate "invited" portal state worth
// modeling without a promotion mechanism to pair it with.
export async function inviteContactToPortal(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const clientId = formData.get("client_id") as string;
  if (!email) redirect("/clients/portal?error=Email%20is%20required");

  const admin = createAdminClient();
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email);

  if (inviteError || !invited?.user) {
    redirect(`/clients/portal?error=${encodeURIComponent(inviteError?.message ?? "Could not invite this email")}`);
  }

  const supabase = await createClient();
  const { error: accessError } = await supabase.from("client_portal_access").insert({
    workspace_id: workspaceId,
    client_id: clientId,
    user_id: invited!.user.id,
    status: "active",
  });

  if (accessError) {
    redirect(`/clients/portal?error=${encodeURIComponent(accessError.message)}`);
  }

  const contactId = formData.get("client_contact_id") as string;
  if (contactId) {
    await supabase.from("client_contacts").update({ portal_access: true }).eq("id", contactId);
  }

  revalidatePath("/clients/portal");
}

export async function suspendPortalAccess(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("client_portal_access").update({ status: "suspended" }).eq("id", formData.get("access_id") as string);

  revalidatePath("/clients/portal");
}

export async function reactivatePortalAccess(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("client_portal_access").update({ status: "active" }).eq("id", formData.get("access_id") as string);

  revalidatePath("/clients/portal");
}
