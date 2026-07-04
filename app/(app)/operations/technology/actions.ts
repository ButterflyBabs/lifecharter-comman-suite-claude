"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";

export async function addTechnologyItem(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  await supabase.from("technology_items").insert({
    workspace_id: workspaceId,
    vendor_id: (formData.get("vendor_id") as string) || null,
    product: formData.get("product") as string,
    purpose: (formData.get("purpose") as string) || null,
    cost: formData.get("cost") ? Number(formData.get("cost")) : null,
    cost_cadence: (formData.get("cost_cadence") as string) || null,
    data_classification: (formData.get("data_classification") as string) || null,
    renewal_at: (formData.get("renewal_at") as string) || null,
  });

  revalidatePath("/operations/technology");
}
