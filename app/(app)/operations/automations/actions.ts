"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";

export async function createAutomation(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  await supabase.from("automation_definitions").insert({
    workspace_id: workspaceId,
    name: formData.get("name") as string,
    automation_trigger: (formData.get("automation_trigger") as string) || null,
    risk_level: (formData.get("risk_level") as string) || "low",
    idempotency_strategy: (formData.get("idempotency_strategy") as string) || null,
    sop_id: (formData.get("sop_id") as string) || null,
    exception_note: (formData.get("exception_note") as string) || null,
  });

  revalidatePath("/operations/automations");
}

export async function claimAutomationOwner(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("automation_definitions").update({ owner_user_id: user.id }).eq("id", formData.get("automation_id") as string);

  revalidatePath("/operations/automations");
}

export async function recordTestRun(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  await supabase.from("automation_runs").insert({
    workspace_id: workspaceId,
    automation_id: formData.get("automation_id") as string,
    status: "test_passed",
    completed_at: new Date().toISOString(),
  });

  revalidatePath("/operations/automations");
}

export async function toggleAutomationEnabled(formData: FormData) {
  const supabase = await createClient();
  const automationId = formData.get("automation_id") as string;
  const nextEnabled = formData.get("next_enabled") === "true";

  await supabase.from("automation_definitions").update({ enabled: nextEnabled }).eq("id", automationId);

  revalidatePath("/operations/automations");
}
