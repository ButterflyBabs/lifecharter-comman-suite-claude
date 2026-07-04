"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { isWorkspaceAdmin } from "@/lib/data/workspace";

export async function createBusinessUnit(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  if (!(await isWorkspaceAdmin(workspaceId))) {
    redirect("/settings/business-units?error=Only%20the%20Workspace%20Owner%20or%20Administrator%20can%20add%20business%20units");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("business_units").insert({
    workspace_id: workspaceId,
    name: formData.get("name") as string,
    code: formData.get("code") as string,
    type: (formData.get("type") as string) || null,
    parent_id: (formData.get("parent_id") as string) || null,
  });

  if (error) {
    redirect(`/settings/business-units?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/settings/business-units");
}

export async function archiveBusinessUnit(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  if (!(await isWorkspaceAdmin(workspaceId))) {
    redirect("/settings/business-units?error=Only%20the%20Workspace%20Owner%20or%20Administrator%20can%20archive%20business%20units");
  }

  const supabase = await createClient();
  await supabase
    .from("business_units")
    .update({ status: "archived", archived_at: new Date().toISOString() })
    .eq("id", formData.get("business_unit_id") as string);

  revalidatePath("/settings/business-units");
}

export async function reactivateBusinessUnit(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  if (!(await isWorkspaceAdmin(workspaceId))) {
    redirect("/settings/business-units?error=Only%20the%20Workspace%20Owner%20or%20Administrator%20can%20reactivate%20business%20units");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("business_units")
    .update({ status: "active", archived_at: null })
    .eq("id", formData.get("business_unit_id") as string);

  if (error) {
    redirect(`/settings/business-units?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/settings/business-units");
}
