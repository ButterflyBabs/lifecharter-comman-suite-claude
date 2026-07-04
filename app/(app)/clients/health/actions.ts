"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";

export async function recordHealthEvent(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  await supabase.from("client_health_events").insert({
    workspace_id: workspaceId,
    client_id: formData.get("client_id") as string,
    score: formData.get("score") ? Number(formData.get("score")) : null,
    status: formData.get("status") as string,
    override_reason: (formData.get("override_reason") as string) || null,
  });

  revalidatePath("/clients/health");
}

export async function createInterventionPlan(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  await supabase.from("intervention_plans").insert({
    workspace_id: workspaceId,
    client_id: formData.get("client_id") as string,
    trigger_event_id: (formData.get("trigger_event_id") as string) || null,
    review_at: (formData.get("review_at") as string) || null,
  });

  revalidatePath("/clients/health");
}

export async function resolveInterventionPlan(formData: FormData) {
  const supabase = await createClient();
  await supabase
    .from("intervention_plans")
    .update({ status: "resolved", outcome: (formData.get("outcome") as string) || null })
    .eq("id", formData.get("plan_id") as string);

  revalidatePath("/clients/health");
}

export async function createSupportRequest(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  await supabase.from("support_requests").insert({
    workspace_id: workspaceId,
    client_id: formData.get("client_id") as string,
    category: (formData.get("category") as string) || null,
    priority: (formData.get("priority") as string) || "normal",
    summary: formData.get("summary") as string,
  });

  revalidatePath("/clients/health");
}

export async function resolveSupportRequest(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("support_requests").update({ status: "resolved" }).eq("id", formData.get("request_id") as string);

  revalidatePath("/clients/health");
}
