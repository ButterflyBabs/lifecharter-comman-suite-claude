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

// Publishing snapshots the template's current version content into
// template_marketplace_listings — a copy, not a live link back to this
// workspace's row. Other workspaces can browse and install the snapshot,
// but never read this workspace's actual templates/template_versions rows
// directly (see the migration's header comment for why).
export async function publishToMarketplace(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const templateId = formData.get("template_id") as string;
  const supabase = await createClient();

  const { data: template } = await supabase
    .from("templates")
    .select("id, name, template_type, template_versions(content, schema_json, version)")
    .eq("id", templateId)
    .eq("workspace_id", workspaceId)
    .single();

  if (!template) redirect("/library/templates?error=Template%20not%20found");

  const versions = (template!.template_versions as unknown as { content: string | null; schema_json: { variables?: string[] } | null; version: number }[]) ?? [];
  const current = versions.slice().sort((a, b) => b.version - a.version)[0];

  await supabase.from("template_marketplace_listings").insert({
    source_workspace_id: workspaceId,
    source_template_id: templateId,
    name: template!.name,
    template_type: template!.template_type,
    description: (formData.get("description") as string) || null,
    content: current?.content ?? null,
    variables_json: current?.schema_json ?? null,
    status: "published",
  });

  revalidatePath("/library/templates");
}

export async function unpublishListing(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  await supabase
    .from("template_marketplace_listings")
    .update({ status: "retired" })
    .eq("id", formData.get("listing_id") as string)
    .eq("source_workspace_id", workspaceId);

  revalidatePath("/library/templates");
}

// Installing copies the listing's snapshot into this workspace's own
// templates/template_versions as a fresh, independent row — never a live
// link back to the publishing workspace. install_count is bumped through a
// SECURITY DEFINER RPC, since this workspace has no general UPDATE right
// on another workspace's listing row.
export async function installListing(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const listingId = formData.get("listing_id") as string;
  const supabase = await createClient();

  const { data: listing } = await supabase
    .from("template_marketplace_listings")
    .select("name, template_type, content, variables_json")
    .eq("id", listingId)
    .eq("status", "published")
    .single();

  if (!listing) redirect("/library/templates?error=Listing%20not%20found%20or%20no%20longer%20published");

  const { data: newTemplate } = await supabase
    .from("templates")
    .insert({ workspace_id: workspaceId, name: listing!.name, template_type: listing!.template_type })
    .select("id")
    .single();

  if (newTemplate) {
    const { data: version } = await supabase
      .from("template_versions")
      .insert({
        workspace_id: workspaceId,
        template_id: newTemplate.id,
        version: 1,
        content: listing!.content,
        schema_json: listing!.variables_json,
        effective_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (version) {
      await supabase.from("templates").update({ current_version_id: version.id, status: "active" }).eq("id", newTemplate.id);
    }
  }

  await supabase.rpc("increment_marketplace_install_count", { p_listing_id: listingId });

  revalidatePath("/library/templates");
}
