"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";

export async function createLegalDocument(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  await supabase.from("legal_documents").insert({
    workspace_id: workspaceId,
    name: formData.get("name") as string,
    document_type: (formData.get("document_type") as string) || null,
    review_at: (formData.get("review_at") as string) || null,
  });

  revalidatePath("/operations/legal-risk");
}

export async function createRisk(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  await supabase.from("risks").insert({
    workspace_id: workspaceId,
    category: (formData.get("category") as string) || null,
    title: formData.get("title") as string,
    probability: (formData.get("probability") as string) || null,
    impact: (formData.get("impact") as string) || null,
    severity: (formData.get("severity") as string) || null,
    response_plan: (formData.get("response_plan") as string) || null,
    backup_plan: (formData.get("backup_plan") as string) || null,
    review_at: (formData.get("review_at") as string) || null,
  });

  revalidatePath("/operations/legal-risk");
}

export async function closeRisk(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("risks").update({ status: "closed" }).eq("id", formData.get("risk_id") as string);

  revalidatePath("/operations/legal-risk");
}

export async function logIncident(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  await supabase.from("incidents").insert({
    workspace_id: workspaceId,
    risk_id: (formData.get("risk_id") as string) || null,
    severity: (formData.get("severity") as string) || null,
    summary: formData.get("summary") as string,
    response: (formData.get("response") as string) || null,
  });

  revalidatePath("/operations/legal-risk");
}
