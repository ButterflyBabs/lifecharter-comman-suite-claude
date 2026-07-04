"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";

export async function createTemplate(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  await supabase.from("templates").insert({
    workspace_id: workspaceId,
    name: formData.get("name") as string,
    template_type: formData.get("template_type") as string,
  });

  revalidatePath("/library/templates");
}

export async function addTemplateVersion(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const templateId = formData.get("template_id") as string;
  const supabase = await createClient();

  const { count } = await supabase
    .from("template_versions")
    .select("id", { count: "exact", head: true })
    .eq("template_id", templateId);

  const variableNames = ((formData.get("variables") as string) ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

  const { data: version } = await supabase
    .from("template_versions")
    .insert({
      workspace_id: workspaceId,
      template_id: templateId,
      version: (count ?? 0) + 1,
      content: (formData.get("content") as string) || null,
      schema_json: variableNames.length > 0 ? { variables: variableNames } : null,
      effective_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (version) {
    await supabase.from("templates").update({ current_version_id: version.id, status: "active" }).eq("id", templateId);
  }

  revalidatePath("/library/templates");
}

export async function archiveTemplate(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  await supabase
    .from("templates")
    .update({ archived_at: new Date().toISOString(), status: "archived" })
    .eq("id", formData.get("template_id") as string);

  revalidatePath("/library/templates");
}
