"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";

export async function addMarketSegment(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  await supabase.from("market_segments").insert({
    workspace_id: workspaceId,
    name: formData.get("name") as string,
    segment_type: formData.get("segment_type") as string,
    need: formData.get("need") as string,
    evidence: formData.get("evidence") as string,
    geography: formData.get("geography") as string,
    priority: Number(formData.get("priority")) || 0,
  });

  revalidatePath("/architecture/market");
}

export async function addIdealProfile(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  await supabase.from("ideal_profiles").insert({
    workspace_id: workspaceId,
    market_segment_id: (formData.get("market_segment_id") as string) || null,
    profile_name: formData.get("profile_name") as string,
    pathway: formData.get("pathway") as string,
    subject_type: formData.get("subject_type") as string,
    geography: formData.get("geography") as string,
    business_size_or_maturity: formData.get("business_size_or_maturity") as string,
    audiences_served: formData.get("audiences_served") as string,
    disqualifying_characteristics: formData.get("disqualifying_characteristics") as string,
    is_primary: formData.get("is_primary") === "on",
  });

  revalidatePath("/architecture/market");
}

export async function approveIdealProfile(id: string) {
  const supabase = await createClient();
  await supabase.from("ideal_profiles").update({ status: "approved" }).eq("id", id);
  revalidatePath("/architecture/market");
}

export async function addPositioningProfile(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  await supabase.from("positioning_profiles").insert({
    workspace_id: workspaceId,
    ideal_profile_id: (formData.get("ideal_profile_id") as string) || null,
    audience: formData.get("audience") as string,
    category: formData.get("category") as string,
    problem: formData.get("problem") as string,
    promise: formData.get("promise") as string,
    differentiation: formData.get("differentiation") as string,
    alternatives: formData.get("alternatives") as string,
    is_primary: formData.get("is_primary") === "on",
    evidence_last_verified_at: new Date().toISOString(),
  });

  revalidatePath("/architecture/market");
}

export async function approvePositioningProfile(id: string) {
  const supabase = await createClient();
  await supabase.from("positioning_profiles").update({ status: "approved" }).eq("id", id);
  revalidatePath("/architecture/market");
}
