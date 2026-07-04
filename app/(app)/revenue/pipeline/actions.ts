"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";

export async function createPipeline(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  const { data: pipeline } = await supabase
    .from("pipeline_definitions")
    .insert({
      workspace_id: workspaceId,
      name: formData.get("name") as string,
      pathway: (formData.get("pathway") as string) || null,
    })
    .select("id")
    .single();

  if (pipeline) {
    const stageNames = ((formData.get("stages") as string) || "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const rows = stageNames.map((name, i) => ({
      workspace_id: workspaceId,
      pipeline_id: pipeline.id,
      name,
      sequence: i + 1,
    }));

    if (rows.length > 0) {
      await supabase.from("pipeline_stages").insert(rows);
    }
  }

  revalidatePath("/revenue/pipeline");
}

export async function addOpportunity(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  await supabase.from("opportunities").insert({
    workspace_id: workspaceId,
    name: formData.get("name") as string,
    organization_id: (formData.get("organization_id") as string) || null,
    offer_id: (formData.get("offer_id") as string) || null,
    pipeline_id: formData.get("pipeline_id") as string,
    stage_id: formData.get("stage_id") as string,
    expected_value: formData.get("expected_value") ? Number(formData.get("expected_value")) : null,
    target_close_date: (formData.get("target_close_date") as string) || null,
  });

  revalidatePath("/revenue/pipeline");
}

export async function moveOpportunityStage(formData: FormData) {
  const opportunityId = formData.get("opportunity_id") as string;
  const stageId = formData.get("stage_id") as string;

  const supabase = await createClient();
  await supabase.from("opportunities").update({ stage_id: stageId }).eq("id", opportunityId);

  revalidatePath("/revenue/pipeline");
}
