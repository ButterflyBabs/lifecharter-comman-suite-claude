"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";

function linesToJson(value: FormDataEntryValue | null): string[] | null {
  const text = (value as string) ?? "";
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  return lines.length > 0 ? lines : null;
}

export async function saveBusinessModel(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: existing } = await supabase
    .from("business_models")
    .select("version")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  await supabase.from("business_models").upsert(
    {
      workspace_id: workspaceId,
      model_types: linesToJson(formData.get("model_types")),
      customer_groups: linesToJson(formData.get("customer_groups")),
      value_exchanges: linesToJson(formData.get("value_exchanges")),
      revenue_streams: linesToJson(formData.get("revenue_streams")),
      delivery_models: linesToJson(formData.get("delivery_models")),
      cost_structure: formData.get("cost_structure") as string,
      key_resources: linesToJson(formData.get("key_resources")),
      key_activities: linesToJson(formData.get("key_activities")),
      partners: linesToJson(formData.get("partners")),
      constraints: formData.get("constraints") as string,
      revenue_concentration: formData.get("revenue_concentration") as string,
      recurring_vs_onetime_mix: formData.get("recurring_vs_onetime_mix") as string,
      version: (existing?.version ?? 0) + 1,
      status: "draft",
      updated_by: user?.id,
    },
    { onConflict: "workspace_id" },
  );

  revalidatePath("/architecture/business-model");
}

export async function approveBusinessModel() {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  await supabase.from("business_models").update({ status: "approved" }).eq("workspace_id", workspaceId);

  revalidatePath("/architecture/business-model");
}
