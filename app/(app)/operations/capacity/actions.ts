"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";

export async function upsertCapacityProfile(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  await supabase.from("capacity_profiles").upsert(
    {
      workspace_id: workspaceId,
      workspace_member_id: formData.get("workspace_member_id") as string,
      weekly_hours: formData.get("weekly_hours") ? Number(formData.get("weekly_hours")) : null,
      meeting_limit: formData.get("meeting_limit") ? Number(formData.get("meeting_limit")) : null,
      decision_limit: formData.get("decision_limit") ? Number(formData.get("decision_limit")) : null,
      client_cap: formData.get("client_cap") ? Number(formData.get("client_cap")) : null,
      energy_load: (formData.get("energy_load") as string) || null,
      fixed_constraints: (formData.get("fixed_constraints") as string) || null,
      recovery_rules: (formData.get("recovery_rules") as string) || null,
    },
    { onConflict: "workspace_member_id" },
  );

  revalidatePath("/operations/capacity");
}

export async function addCapacityAllocation(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  await supabase.from("capacity_allocations").insert({
    workspace_id: workspaceId,
    capacity_profile_id: formData.get("capacity_profile_id") as string,
    period: formData.get("period") as string,
    category: formData.get("category") as string,
    planned_hours: formData.get("planned_hours") ? Number(formData.get("planned_hours")) : null,
    actual_hours: formData.get("actual_hours") ? Number(formData.get("actual_hours")) : null,
  });

  revalidatePath("/operations/capacity");
}
