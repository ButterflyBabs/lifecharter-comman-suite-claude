"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";

export async function recordRunWithOutput(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Usage-limit enforcement (Section 18's "usage limits and billing
  // controls") — only applies when the workspace has an active/trialing
  // subscription with a concrete (non-null) ai_runs_per_month limit; an
  // unlimited entitlement or no subscription at all is not restricted.
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

  const { data: subscription } = await supabase
    .from("workspace_subscriptions")
    .select("plan_id, status")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (subscription && ["active", "trialing"].includes(subscription.status) && subscription.plan_id) {
    const { data: entitlement } = await supabase
      .from("plan_entitlements")
      .select("limit_value")
      .eq("plan_id", subscription.plan_id)
      .eq("entitlement_key", "ai_runs_per_month")
      .maybeSingle();

    if (entitlement?.limit_value != null) {
      const { data: counter } = await supabase
        .from("usage_counters")
        .select("current_value")
        .eq("workspace_id", workspaceId)
        .eq("entitlement_key", "ai_runs_per_month")
        .eq("period_start", periodStart)
        .maybeSingle();

      if ((counter?.current_value ?? 0) >= entitlement.limit_value) {
        redirect(`/ai/runs?error=${encodeURIComponent(`Plan limit of ${entitlement.limit_value} AI runs this month has been reached`)}`);
      }
    }
  }

  const { data: run } = await supabase
    .from("ai_runs")
    .insert({
      workspace_id: workspaceId,
      agent_version_id: formData.get("agent_version_id") as string,
      user_id: user?.id ?? null,
      purpose: (formData.get("purpose") as string) || null,
      action_type: (formData.get("action_type") as string) || null,
      status: "success",
      completed_at: new Date().toISOString(),
      cost: formData.get("cost") ? Number(formData.get("cost")) : null,
    })
    .select("id")
    .single();

  if (!run) return;

  await supabase.rpc("increment_usage_counter", {
    p_workspace_id: workspaceId,
    p_entitlement_key: "ai_runs_per_month",
    p_period_start: periodStart,
    p_period_end: periodEnd,
  });

  const { data: agentVersion } = await supabase
    .from("ai_agent_versions")
    .select("permission_level")
    .eq("id", formData.get("agent_version_id") as string)
    .single();

  const approvalRequired = agentVersion?.permission_level === "human_approval_required" || agentVersion?.permission_level === "prepare_actions";

  await supabase.from("ai_outputs").insert({
    workspace_id: workspaceId,
    ai_run_id: run.id,
    output_type: (formData.get("output_type") as string) || null,
    content: (formData.get("content") as string) || null,
    confidence: (formData.get("confidence") as string) || null,
    approval_required: approvalRequired,
    risk_level: (formData.get("risk_level") as string) || null,
    due_at: (formData.get("due_at") as string) || null,
    status: approvalRequired ? "pending_approval" : "approved",
  });

  revalidatePath("/ai/runs");
  revalidatePath("/ai/approvals");
}
