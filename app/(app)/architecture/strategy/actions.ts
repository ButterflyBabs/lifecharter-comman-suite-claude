"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";

export async function saveStrategyProfile(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: existing } = await supabase
    .from("strategy_profiles")
    .select("version")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  await supabase.from("strategy_profiles").upsert(
    {
      workspace_id: workspaceId,
      vision: formData.get("vision") as string,
      mission: formData.get("mission") as string,
      strategic_thesis: formData.get("strategic_thesis") as string,
      horizon: formData.get("horizon") as string,
      rationale_and_tradeoffs: formData.get("rationale_and_tradeoffs") as string,
      constraints: formData.get("constraints") as string,
      strategic_bets: formData.get("strategic_bets") as string,
      not_doing: formData.get("not_doing") as string,
      owner_user_id: user?.id,
      version: (existing?.version ?? 0) + 1,
      status: "draft",
      updated_by: user?.id,
    },
    { onConflict: "workspace_id" },
  );

  revalidatePath("/architecture/strategy");
}

export async function approveStrategyProfile() {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  await supabase
    .from("strategy_profiles")
    .update({ status: "approved", approved_at: new Date().toISOString() })
    .eq("workspace_id", workspaceId);

  revalidatePath("/architecture/strategy");
}

export async function addGoal(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const strategyProfileId = formData.get("strategy_profile_id") as string;
  const supabase = await createClient();

  await supabase.from("goals").insert({
    workspace_id: workspaceId,
    strategy_profile_id: strategyProfileId,
    domain_id: (formData.get("domain_id") as string) || null,
    title: formData.get("title") as string,
    metric: formData.get("metric") as string,
    target: formData.get("target") as string,
    period: formData.get("period") as string,
    review_cadence: formData.get("review_cadence") as string,
  });

  revalidatePath("/architecture/strategy");
}

export async function updateGoalStatus(goalId: string, status: string) {
  const supabase = await createClient();
  await supabase.from("goals").update({ status }).eq("id", goalId);
  revalidatePath("/architecture/strategy");
}

export async function addKeyResult(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const goalId = formData.get("goal_id") as string;
  const supabase = await createClient();

  await supabase.from("key_results").insert({
    workspace_id: workspaceId,
    goal_id: goalId,
    metric_definition: formData.get("metric_definition") as string,
    baseline: formData.get("baseline") ? Number(formData.get("baseline")) : null,
    target: Number(formData.get("target")),
    current_value: formData.get("current_value") ? Number(formData.get("current_value")) : null,
    data_source: formData.get("data_source") as string,
  });

  revalidatePath("/architecture/strategy");
}
