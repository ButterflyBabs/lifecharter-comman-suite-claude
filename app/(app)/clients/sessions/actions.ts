"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";

export async function scheduleSession(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  await supabase.from("sessions").insert({
    workspace_id: workspaceId,
    client_id: formData.get("client_id") as string,
    program_phase_id: (formData.get("program_phase_id") as string) || null,
    session_type: (formData.get("session_type") as string) || null,
    scheduled_at: (formData.get("scheduled_at") as string) || null,
    agenda: (formData.get("agenda") as string) || null,
  });

  revalidatePath("/clients/sessions");
}

export async function completeSession(formData: FormData) {
  const supabase = await createClient();
  await supabase
    .from("sessions")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      internal_notes: (formData.get("internal_notes") as string) || null,
      client_summary: (formData.get("client_summary") as string) || null,
    })
    .eq("id", formData.get("session_id") as string);

  revalidatePath("/clients/sessions");
}

export async function markSummaryReviewed(formData: FormData) {
  const supabase = await createClient();
  await supabase
    .from("sessions")
    .update({ client_summary_status: "reviewed" })
    .eq("id", formData.get("session_id") as string);

  revalidatePath("/clients/sessions");
}

export async function releaseSessionSummary(formData: FormData) {
  const supabase = await createClient();
  await supabase
    .from("sessions")
    .update({ client_summary_status: "released" })
    .eq("id", formData.get("session_id") as string)
    .eq("client_summary_status", "reviewed");

  revalidatePath("/clients/sessions");
}
