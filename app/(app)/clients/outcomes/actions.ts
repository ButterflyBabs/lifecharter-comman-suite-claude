"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";

export async function createMetric(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  await supabase.from("metrics").insert({
    workspace_id: workspaceId,
    name: formData.get("name") as string,
    unit: (formData.get("unit") as string) || null,
    direction: (formData.get("direction") as string) || null,
    collection_method: (formData.get("collection_method") as string) || null,
  });

  revalidatePath("/clients/outcomes");
}

export async function recordMetricValue(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  await supabase.from("client_metric_values").insert({
    workspace_id: workspaceId,
    client_id: formData.get("client_id") as string,
    metric_id: formData.get("metric_id") as string,
    value: Number(formData.get("value")),
    source: (formData.get("source") as string) || "coach_observation",
    notes: (formData.get("notes") as string) || null,
  });

  revalidatePath("/clients/outcomes");
}

export async function addMilestone(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  await supabase.from("client_milestones").insert({
    workspace_id: workspaceId,
    client_id: formData.get("client_id") as string,
    title: formData.get("title") as string,
    target_at: (formData.get("target_at") as string) || null,
  });

  revalidatePath("/clients/outcomes");
}

export async function achieveMilestone(formData: FormData) {
  const supabase = await createClient();
  await supabase
    .from("client_milestones")
    .update({ status: "achieved", achieved_at: new Date().toISOString() })
    .eq("id", formData.get("milestone_id") as string);

  revalidatePath("/clients/outcomes");
}

export async function createAssessment(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  await supabase.from("assessments").insert({
    workspace_id: workspaceId,
    name: formData.get("name") as string,
    scoring_rule: (formData.get("scoring_rule") as string) || null,
  });

  revalidatePath("/clients/outcomes");
}

export async function assignAssessment(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  await supabase.from("assessment_instances").insert({
    workspace_id: workspaceId,
    assessment_id: formData.get("assessment_id") as string,
    client_id: formData.get("client_id") as string,
  });

  revalidatePath("/clients/outcomes");
}
