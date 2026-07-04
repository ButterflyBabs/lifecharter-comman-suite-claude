"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function approveOutput(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const outputId = formData.get("output_id") as string;

  const { data: output } = await supabase.from("ai_outputs").select("workspace_id").eq("id", outputId).single();
  if (!output) return;

  await supabase.from("ai_approvals").insert({
    workspace_id: output.workspace_id,
    ai_output_id: outputId,
    reviewer_id: user?.id ?? null,
    status: "approved",
    edits_summary: (formData.get("edits_summary") as string) || null,
    decision_rationale: (formData.get("decision_rationale") as string) || null,
  });

  await supabase.from("ai_outputs").update({ status: "approved" }).eq("id", outputId);

  revalidatePath("/ai/approvals");
  revalidatePath("/ai/runs");
}

export async function rejectOutput(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const outputId = formData.get("output_id") as string;

  const { data: output } = await supabase.from("ai_outputs").select("workspace_id").eq("id", outputId).single();
  if (!output) return;

  await supabase.from("ai_approvals").insert({
    workspace_id: output.workspace_id,
    ai_output_id: outputId,
    reviewer_id: user?.id ?? null,
    status: "rejected",
    decision_rationale: (formData.get("decision_rationale") as string) || null,
  });

  await supabase.from("ai_outputs").update({ status: "rejected" }).eq("id", outputId);

  revalidatePath("/ai/approvals");
}

export async function returnForRevision(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const outputId = formData.get("output_id") as string;

  const { data: output } = await supabase.from("ai_outputs").select("workspace_id").eq("id", outputId).single();
  if (!output) return;

  await supabase.from("ai_approvals").insert({
    workspace_id: output.workspace_id,
    ai_output_id: outputId,
    reviewer_id: user?.id ?? null,
    status: "returned_for_revision",
    decision_rationale: (formData.get("decision_rationale") as string) || null,
  });

  await supabase.from("ai_outputs").update({ status: "draft" }).eq("id", outputId);

  revalidatePath("/ai/approvals");
}

export async function markExecuted(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("ai_outputs").update({ status: "executed" }).eq("id", formData.get("output_id") as string);

  revalidatePath("/ai/approvals");
  revalidatePath("/ai/runs");
}
