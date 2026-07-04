"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";

export async function createJourneyTemplate(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  await supabase.from("journey_templates").insert({
    workspace_id: workspaceId,
    offer_version_id: (formData.get("offer_version_id") as string) || null,
    name: formData.get("name") as string,
    success_definition: (formData.get("success_definition") as string) || null,
  });

  revalidatePath("/clients/journey-design");
}

export async function publishJourneyTemplate(formData: FormData) {
  const templateId = formData.get("template_id") as string;

  const supabase = await createClient();
  await supabase.from("journey_templates").update({ status: "published" }).eq("id", templateId);

  revalidatePath("/clients/journey-design");
}

export async function addJourneyStage(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  await supabase.from("journey_stages").insert({
    workspace_id: workspaceId,
    journey_template_id: formData.get("journey_template_id") as string,
    name: formData.get("name") as string,
    sequence: Number(formData.get("sequence") ?? 0),
    entry_criteria: (formData.get("entry_criteria") as string) || null,
    exit_criteria: (formData.get("exit_criteria") as string) || null,
  });

  revalidatePath("/clients/journey-design");
}

export async function addJourneyTouchpoint(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  await supabase.from("journey_touchpoints").insert({
    workspace_id: workspaceId,
    journey_stage_id: formData.get("journey_stage_id") as string,
    touchpoint_type: (formData.get("touchpoint_type") as string) || null,
    title: formData.get("title") as string,
    owner_role: (formData.get("owner_role") as string) || null,
    timing_rule: (formData.get("timing_rule") as string) || null,
    client_visible: formData.get("client_visible") === "on",
  });

  revalidatePath("/clients/journey-design");
}
