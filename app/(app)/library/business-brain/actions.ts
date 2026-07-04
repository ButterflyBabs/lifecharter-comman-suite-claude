"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";

export async function createKnowledgeEntry(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.from("knowledge_entries").insert({
    workspace_id: workspaceId,
    knowledge_type: formData.get("knowledge_type") as string,
    title: formData.get("title") as string,
    structured_content: { body: (formData.get("body") as string) || "" },
    owner: user?.id ?? null,
    effective_at: (formData.get("effective_at") as string) || null,
    review_at: (formData.get("review_at") as string) || null,
    visibility: (formData.get("visibility") as string) || "internal",
  });

  revalidatePath("/library/business-brain");
}

// Editing a knowledge entry bumps its version and resets status to draft,
// the same "living document, re-approved after every edit" pattern Phase 3
// established for founder_profiles/brand_profiles/strategy_profiles.
export async function updateKnowledgeEntry(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const entryId = formData.get("entry_id") as string;
  const currentVersion = Number(formData.get("current_version"));
  const supabase = await createClient();

  await supabase
    .from("knowledge_entries")
    .update({
      title: formData.get("title") as string,
      structured_content: { body: (formData.get("body") as string) || "" },
      effective_at: (formData.get("effective_at") as string) || null,
      review_at: (formData.get("review_at") as string) || null,
      visibility: (formData.get("visibility") as string) || "internal",
      version: currentVersion + 1,
      status: "draft",
    })
    .eq("id", entryId);

  revalidatePath("/library/business-brain");
}

export async function approveKnowledgeEntry(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  await supabase
    .from("knowledge_entries")
    .update({ status: "approved" })
    .eq("id", formData.get("entry_id") as string);

  revalidatePath("/library/business-brain");
}

export async function retireKnowledgeEntry(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  await supabase
    .from("knowledge_entries")
    .update({ status: "retired", archived_at: new Date().toISOString() })
    .eq("id", formData.get("entry_id") as string);

  revalidatePath("/library/business-brain");
}
