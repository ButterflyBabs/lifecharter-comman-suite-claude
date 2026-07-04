"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";

export async function addClient(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  await supabase.from("clients").insert({
    workspace_id: workspaceId,
    organization_id: (formData.get("organization_id") as string) || null,
    source_opportunity_id: (formData.get("source_opportunity_id") as string) || null,
    status: "onboarding",
  });

  revalidatePath("/clients/overview");
}
