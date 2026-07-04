"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";

export async function createRenewalOpportunity(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  await supabase.from("renewal_opportunities").insert({
    workspace_id: workspaceId,
    client_id: formData.get("client_id") as string,
    current_enrollment_id: (formData.get("current_enrollment_id") as string) || null,
    recommended_offer_id: (formData.get("recommended_offer_id") as string) || null,
    contract_end_date: (formData.get("contract_end_date") as string) || null,
    review_at: (formData.get("review_at") as string) || null,
    recommended_path: (formData.get("recommended_path") as string) || null,
  });

  revalidatePath("/clients/renewals");
}

export async function closeRenewalOpportunity(formData: FormData) {
  const supabase = await createClient();
  await supabase
    .from("renewal_opportunities")
    .update({ status: formData.get("next_status") as string, close_reason: (formData.get("close_reason") as string) || null })
    .eq("id", formData.get("renewal_id") as string);

  revalidatePath("/clients/renewals");
}

export async function startOffboarding(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  await supabase.from("offboarding_instances").insert({
    workspace_id: workspaceId,
    client_id: formData.get("client_id") as string,
    reason: (formData.get("reason") as string) || null,
    archive_rules: (formData.get("archive_rules") as string) || null,
  });

  await supabase.from("clients").update({ status: "former", end_at: new Date().toISOString() }).eq("id", formData.get("client_id") as string);

  revalidatePath("/clients/renewals");
}

export async function completeOffboarding(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("offboarding_instances").update({ completed_at: new Date().toISOString() }).eq("id", formData.get("instance_id") as string);

  revalidatePath("/clients/renewals");
}
