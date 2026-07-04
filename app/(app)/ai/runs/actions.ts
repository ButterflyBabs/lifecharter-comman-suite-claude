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
