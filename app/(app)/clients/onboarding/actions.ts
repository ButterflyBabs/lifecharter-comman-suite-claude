"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";

export async function createOnboardingTemplate(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  await supabase.from("onboarding_templates").insert({
    workspace_id: workspaceId,
    offer_version_id: (formData.get("offer_version_id") as string) || null,
    name: formData.get("name") as string,
    completion_rule: (formData.get("completion_rule") as string) || null,
  });

  revalidatePath("/clients/onboarding");
}

export async function startOnboardingInstance(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  await supabase.from("onboarding_instances").insert({
    workspace_id: workspaceId,
    client_enrollment_id: formData.get("client_enrollment_id") as string,
    template_id: (formData.get("template_id") as string) || null,
    kickoff_date: (formData.get("kickoff_date") as string) || null,
  });

  revalidatePath("/clients/onboarding");
}

export async function addOnboardingItem(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  await supabase.from("onboarding_items").insert({
    workspace_id: workspaceId,
    onboarding_instance_id: formData.get("onboarding_instance_id") as string,
    title: formData.get("title") as string,
    actor_type: (formData.get("actor_type") as string) || "internal",
    due_at: (formData.get("due_at") as string) || null,
  });

  revalidatePath("/clients/onboarding");
}

export async function toggleOnboardingItem(formData: FormData) {
  const itemId = formData.get("item_id") as string;
  const nextStatus = formData.get("next_status") as string;

  const supabase = await createClient();
  await supabase.from("onboarding_items").update({ status: nextStatus }).eq("id", itemId);

  const instanceId = formData.get("onboarding_instance_id") as string;
  const { data: items } = await supabase.from("onboarding_items").select("status").eq("onboarding_instance_id", instanceId);
  const allDone = (items ?? []).every((i) => i.status !== "pending");
  if (allDone && items && items.length > 0) {
    await supabase.from("onboarding_instances").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", instanceId);
  }

  revalidatePath("/clients/onboarding");
}
