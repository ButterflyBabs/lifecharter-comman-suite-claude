"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";

export async function createSop(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  await supabase.from("sops").insert({
    workspace_id: workspaceId,
    name: formData.get("name") as string,
    business_area: (formData.get("business_area") as string) || null,
    review_at: (formData.get("review_at") as string) || null,
  });

  revalidatePath("/operations/sops");
}

export async function addSopVersion(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const sopId = formData.get("sop_id") as string;
  const supabase = await createClient();

  const { count } = await supabase.from("sop_versions").select("id", { count: "exact", head: true }).eq("sop_id", sopId);

  const { data: version } = await supabase
    .from("sop_versions")
    .insert({
      workspace_id: workspaceId,
      sop_id: sopId,
      version: (count ?? 0) + 1,
      purpose: (formData.get("purpose") as string) || null,
      trigger_description: (formData.get("trigger_description") as string) || null,
      preconditions: (formData.get("preconditions") as string) || null,
      steps_json: (formData.get("steps") as string)
        ? (formData.get("steps") as string).split("\n").map((s) => s.trim()).filter(Boolean)
        : null,
      escalation_json: (formData.get("escalation") as string) ? { rule: formData.get("escalation") } : null,
      effective_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (version) {
    await supabase.from("sops").update({ current_version_id: version.id, status: "active" }).eq("id", sopId);
  }

  revalidatePath("/operations/sops");
}
