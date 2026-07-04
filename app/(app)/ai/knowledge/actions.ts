"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";

export async function addKnowledgeSource(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  await supabase.from("ai_knowledge_sources").insert({
    workspace_id: workspaceId,
    agent_id: (formData.get("agent_id") as string) || null,
    source_type: formData.get("source_type") as string,
    source_url: (formData.get("source_url") as string) || null,
    visibility: (formData.get("visibility") as string) || "internal",
    access_scope: (formData.get("access_scope") as string) || null,
    freshness_rule: (formData.get("freshness_rule") as string) || null,
    retention_rule: (formData.get("retention_rule") as string) || null,
  });

  revalidatePath("/ai/knowledge");
}

export async function refreshKnowledgeSource(formData: FormData) {
  const supabase = await createClient();
  await supabase
    .from("ai_knowledge_sources")
    .update({ ingestion_status: "ingested", freshness_at: new Date().toISOString() })
    .eq("id", formData.get("source_id") as string);

  revalidatePath("/ai/knowledge");
}

export async function restrictKnowledgeSource(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("ai_knowledge_sources").update({ visibility: "internal" }).eq("id", formData.get("source_id") as string);

  revalidatePath("/ai/knowledge");
}

export async function resolveKnowledgeConflict(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("ai_knowledge_sources").update({ conflict_status: "resolved" }).eq("id", formData.get("source_id") as string);

  revalidatePath("/ai/knowledge");
}

export async function removeKnowledgeSource(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("ai_knowledge_sources").update({ active: false }).eq("id", formData.get("source_id") as string);

  revalidatePath("/ai/knowledge");
}
