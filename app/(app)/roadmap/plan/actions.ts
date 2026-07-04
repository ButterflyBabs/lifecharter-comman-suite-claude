"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function completeMilestone(milestoneId: string, formData: FormData) {
  const note = formData.get("note") as string;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: milestone } = await supabase
    .from("roadmap_milestones")
    .select("workspace_id")
    .eq("id", milestoneId)
    .single();

  if (!milestone) {
    throw new Error("Milestone not found");
  }

  // Approving your own evidence is a Phase 2 simplification — a separate
  // approval step (someone other than the submitter) is a reasonable later
  // refinement once delivery teams exist to make that distinction meaningful.
  await supabase.from("completion_evidence").insert({
    workspace_id: milestone.workspace_id,
    subject_type: "roadmap_milestone",
    subject_id: milestoneId,
    evidence_type: "note",
    note: note || "Marked done.",
    approved_by: user?.id,
  });

  const { error } = await supabase.from("roadmap_milestones").update({ status: "done" }).eq("id", milestoneId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/roadmap/plan");
  revalidatePath("/roadmap/milestones");
}

export async function completePhase(phaseId: string) {
  const supabase = await createClient();

  const { data: phase, error } = await supabase
    .from("roadmap_phases")
    .update({ status: "complete" })
    .eq("id", phaseId)
    .select("roadmap_instance_id, sequence")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (phase) {
    await supabase
      .from("roadmap_phases")
      .update({ status: "active" })
      .eq("roadmap_instance_id", phase.roadmap_instance_id)
      .eq("sequence", phase.sequence + 1)
      .eq("status", "not_started");
  }

  revalidatePath("/roadmap/plan");
}
