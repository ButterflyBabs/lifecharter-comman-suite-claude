"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";

export async function scheduleDiscoverySession(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  await supabase.from("discovery_sessions").insert({
    workspace_id: workspaceId,
    opportunity_id: formData.get("opportunity_id") as string,
    appointment_at: (formData.get("appointment_at") as string) || null,
    preparation_brief: formData.get("preparation_brief") as string,
    current_state: formData.get("current_state") as string,
    desired_state: formData.get("desired_state") as string,
    timing: formData.get("timing") as string,
    budget_status: formData.get("budget_status") as string,
  });

  revalidatePath("/revenue/discovery");
}

export async function completeDiscoverySession(formData: FormData) {
  const sessionId = formData.get("session_id") as string;

  const supabase = await createClient();
  await supabase
    .from("discovery_sessions")
    .update({
      status: "completed",
      fit_status: formData.get("fit_status") as string,
      next_action: formData.get("next_action") as string,
      occurred_at: new Date().toISOString(),
    })
    .eq("id", sessionId);

  revalidatePath("/revenue/discovery");
}
