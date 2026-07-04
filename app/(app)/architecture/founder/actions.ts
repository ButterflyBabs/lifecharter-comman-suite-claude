"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";

function linesToJson(value: FormDataEntryValue | null): string[] | null {
  const text = (value as string) ?? "";
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  return lines.length > 0 ? lines : null;
}

export async function saveFounderProfile(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: existing } = await supabase
    .from("founder_profiles")
    .select("version")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  await supabase.from("founder_profiles").upsert(
    {
      workspace_id: workspaceId,
      role_statement: formData.get("role_statement") as string,
      leadership_responsibilities: formData.get("leadership_responsibilities") as string,
      prioritized_values: linesToJson(formData.get("prioritized_values")),
      strengths_and_patterns: formData.get("strengths_and_patterns") as string,
      boundaries_triggers_responses: formData.get("boundaries_triggers_responses") as string,
      non_negotiables: formData.get("non_negotiables") as string,
      capacity_constraints: formData.get("capacity_constraints") as string,
      support_requirements: formData.get("support_requirements") as string,
      review_cadence: formData.get("review_cadence") as string,
      version: (existing?.version ?? 0) + 1,
      status: "draft",
      updated_by: user?.id,
    },
    { onConflict: "workspace_id" },
  );

  revalidatePath("/architecture/founder");
}

export async function approveFounderProfile() {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  await supabase.from("founder_profiles").update({ status: "approved" }).eq("workspace_id", workspaceId);

  revalidatePath("/architecture/founder");
}

export async function addDecisionPrinciple(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  await supabase.from("decision_principles").insert({
    workspace_id: workspaceId,
    name: formData.get("name") as string,
    principle: formData.get("principle") as string,
    priority: Number(formData.get("priority")) || 0,
  });

  revalidatePath("/architecture/founder");
}

export async function toggleDecisionPrinciple(id: string, active: boolean) {
  const supabase = await createClient();
  await supabase.from("decision_principles").update({ active }).eq("id", id);
  revalidatePath("/architecture/founder");
}
