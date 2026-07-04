"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";

export async function addVendor(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  await supabase.from("vendors").insert({
    workspace_id: workspaceId,
    name: formData.get("name") as string,
    category: (formData.get("category") as string) || null,
    service: (formData.get("service") as string) || null,
    cost: formData.get("cost") ? Number(formData.get("cost")) : null,
    renewal_at: (formData.get("renewal_at") as string) || null,
    risk_rating: (formData.get("risk_rating") as string) || null,
    criticality: (formData.get("criticality") as string) || "standard",
    backup_plan: (formData.get("backup_plan") as string) || null,
  });

  revalidatePath("/operations/vendors");
}

export async function updateVendorStatus(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("vendors").update({ status: formData.get("next_status") as string }).eq("id", formData.get("vendor_id") as string);

  revalidatePath("/operations/vendors");
}
