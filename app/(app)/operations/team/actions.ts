"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";

export async function createTeam(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  await supabase.from("teams").insert({
    workspace_id: workspaceId,
    name: formData.get("name") as string,
    purpose: (formData.get("purpose") as string) || null,
  });

  revalidatePath("/operations/team");
}

export async function addTeamMembership(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  await supabase.from("team_memberships").insert({
    workspace_id: workspaceId,
    team_id: formData.get("team_id") as string,
    workspace_member_id: formData.get("workspace_member_id") as string,
    role: (formData.get("role") as string) || null,
    allocation_percent: formData.get("allocation_percent") ? Number(formData.get("allocation_percent")) : null,
    start_at: (formData.get("start_at") as string) || null,
  });

  revalidatePath("/operations/team");
}

export async function addResponsibility(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  await supabase.from("responsibilities").insert({
    workspace_id: workspaceId,
    business_area: formData.get("business_area") as string,
    responsibility: formData.get("responsibility") as string,
    owner_member_id: (formData.get("owner_member_id") as string) || null,
    backup_member_id: (formData.get("backup_member_id") as string) || null,
    criticality: (formData.get("criticality") as string) || "standard",
    review_cadence: (formData.get("review_cadence") as string) || null,
  });

  revalidatePath("/operations/team");
}
