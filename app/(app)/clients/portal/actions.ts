"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";

export async function inviteContactToPortal(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  const clientId = formData.get("client_id") as string;

  await supabase.from("client_portal_access").insert({
    workspace_id: workspaceId,
    client_id: clientId,
  });

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
