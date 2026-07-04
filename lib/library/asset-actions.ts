"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";

// Shared by every /library/* asset-based section (brand, offers,
// client-resources, content, recordings, research) — same assets/
// asset_versions/tags schema (Phase 1), differing only by asset_type and
// which route to revalidate, both passed through hidden form fields rather
// than baked into six near-identical action modules.

export async function createLibraryAsset(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const libraryPath = formData.get("library_path") as string;
  const assetType = formData.get("asset_type") as string;
  const tagNames = ((formData.get("tags") as string) ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const supabase = await createClient();

  const { data: asset } = await supabase
    .from("assets")
    .insert({
      workspace_id: workspaceId,
      title: formData.get("title") as string,
      asset_type: assetType,
      visibility: (formData.get("visibility") as string) || "internal",
    })
    .select("id")
    .single();

  if (asset) {
    for (const name of tagNames) {
      const { data: tag } = await supabase
        .from("tags")
        .upsert({ workspace_id: workspaceId, category: assetType, name }, { onConflict: "workspace_id,category,name" })
        .select("id")
        .single();
      if (tag) {
        await supabase.from("asset_tags").insert({ workspace_id: workspaceId, asset_id: asset.id, tag_id: tag.id });
      }
    }
  }

  revalidatePath(libraryPath);
}

export async function addAssetVersion(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const libraryPath = formData.get("library_path") as string;
  const assetId = formData.get("asset_id") as string;
  const supabase = await createClient();

  const { count } = await supabase
    .from("asset_versions")
    .select("id", { count: "exact", head: true })
    .eq("asset_id", assetId);

  const { data: version } = await supabase
    .from("asset_versions")
    .insert({
      workspace_id: workspaceId,
      asset_id: assetId,
      version: (count ?? 0) + 1,
      storage_path: (formData.get("external_url") as string) || null,
      mime_type: (formData.get("mime_type") as string) || null,
      checksum: (formData.get("checksum") as string) || null,
    })
    .select("id")
    .single();

  if (version) {
    await supabase.from("assets").update({ current_version_id: version.id, status: "approved" }).eq("id", assetId);
  }

  revalidatePath(libraryPath);
}

export async function archiveAsset(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const libraryPath = formData.get("library_path") as string;
  const supabase = await createClient();
  await supabase
    .from("assets")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", formData.get("asset_id") as string);

  revalidatePath(libraryPath);
}
