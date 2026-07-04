"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";

function linesToJson(value: FormDataEntryValue | null): string[] | null {
  const text = (value as string) ?? "";
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  return lines.length > 0 ? lines : null;
}

export async function saveBrandProfile(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: existing } = await supabase
    .from("brand_profiles")
    .select("version")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  await supabase.from("brand_profiles").upsert(
    {
      workspace_id: workspaceId,
      brand_identity_description: formData.get("brand_identity_description") as string,
      voice_traits: linesToJson(formData.get("voice_traits")),
      formality: formData.get("formality") as string,
      average_length: formData.get("average_length") as string,
      preferred_vocabulary: linesToJson(formData.get("preferred_vocabulary")),
      avoid_list: linesToJson(formData.get("avoid_list")),
      core_promise: formData.get("core_promise") as string,
      compliance_language: formData.get("compliance_language") as string,
      calls_to_action: linesToJson(formData.get("calls_to_action")),
      signoff: formData.get("signoff") as string,
      version: (existing?.version ?? 0) + 1,
      status: "draft",
      updated_by: user?.id,
    },
    { onConflict: "workspace_id" },
  );

  revalidatePath("/architecture/brand");
}

export async function approveBrandProfile() {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  await supabase.from("brand_profiles").update({ status: "approved" }).eq("workspace_id", workspaceId);

  revalidatePath("/architecture/brand");
}

export async function addMessagePillar(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const brandProfileId = formData.get("brand_profile_id") as string;
  const supabase = await createClient();
  await supabase.from("message_pillars").insert({
    workspace_id: workspaceId,
    brand_profile_id: brandProfileId,
    title: formData.get("title") as string,
    message: formData.get("message") as string,
    audience: formData.get("audience") as string,
    proof_required: formData.get("proof_required") === "on",
  });

  revalidatePath("/architecture/brand");
}

export async function addClaimRule(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const brandProfileId = formData.get("brand_profile_id") as string;
  const supabase = await createClient();
  await supabase.from("claim_rules").insert({
    workspace_id: workspaceId,
    brand_profile_id: brandProfileId,
    claim_text: formData.get("claim_text") as string,
    status: formData.get("status") as string,
    scope: formData.get("scope") as string,
    required_disclaimer: formData.get("required_disclaimer") as string,
  });

  revalidatePath("/architecture/brand");
}

export async function addProofItem(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  await supabase.from("proof_items").insert({
    workspace_id: workspaceId,
    proof_type: formData.get("proof_type") as string,
    title: formData.get("title") as string,
    statement: formData.get("statement") as string,
    source: formData.get("source") as string,
    consent_status: formData.get("consent_status") as string,
  });

  revalidatePath("/architecture/brand");
}
