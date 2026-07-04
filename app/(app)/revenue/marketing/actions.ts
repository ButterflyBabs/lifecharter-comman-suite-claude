"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";

export async function createNurtureSequence(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  await supabase.from("nurture_sequences").insert({
    workspace_id: workspaceId,
    name: formData.get("name") as string,
    audience: formData.get("audience") as string,
    trigger_rule: formData.get("trigger_rule") as string,
    stop_conditions: formData.get("stop_conditions") as string,
  });

  revalidatePath("/revenue/marketing");
}

export async function addNurtureStep(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  await supabase.from("nurture_steps").insert({
    workspace_id: workspaceId,
    sequence_id: formData.get("sequence_id") as string,
    step_order: Number(formData.get("step_order")) || 0,
    delay_period: formData.get("delay_period") as string,
    channel: formData.get("channel") as string,
    owner_rule: formData.get("owner_rule") as string,
  });

  revalidatePath("/revenue/marketing");
}
