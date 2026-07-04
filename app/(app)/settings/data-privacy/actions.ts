"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { isWorkspaceAdmin } from "@/lib/data/workspace";

const EXPORT_TABLES = [
  "clients", "opportunities", "offers", "sessions", "client_actions",
  "invoices", "payments", "tasks", "decisions", "approvals",
] as const;

export async function requestDataExport() {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: request } = await supabase
    .from("data_export_requests")
    .insert({ workspace_id: workspaceId, requested_by: user?.id ?? null, status: "processing" })
    .select("id")
    .single();

  if (!request) return;

  // Aggregated directly here rather than via a queued job — this build has
  // no background-job runner and no file-storage bucket configured, so the
  // bundle is stored inline as jsonb and served through /api/data-export
  // rather than pretending to be a stored file. Each table is scoped to one
  // workspace, so the export is small enough to build synchronously.
  const bundle: Record<string, unknown> = {};
  for (const table of EXPORT_TABLES) {
    const { data } = await supabase.from(table).select("*").eq("workspace_id", workspaceId);
    bundle[table] = data ?? [];
  }

  await supabase
    .from("data_export_requests")
    .update({ status: "completed", completed_at: new Date().toISOString(), export_data: bundle })
    .eq("id", request.id);

  revalidatePath("/settings/data-privacy");
}

export async function requestDataDeletion(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  if (!(await isWorkspaceAdmin(workspaceId))) {
    redirect("/settings/data-privacy?error=Only%20the%20Workspace%20Owner%20or%20Administrator%20can%20request%20deletion");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const scheduledFor = new Date();
  scheduledFor.setDate(scheduledFor.getDate() + 30);

  await supabase.from("data_deletion_requests").insert({
    workspace_id: workspaceId,
    requested_by: user?.id ?? null,
    reason: (formData.get("reason") as string) || null,
    status: "scheduled",
    scheduled_for: scheduledFor.toISOString().slice(0, 10),
  });

  revalidatePath("/settings/data-privacy");
}

export async function cancelDataDeletion(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  if (!(await isWorkspaceAdmin(workspaceId))) {
    redirect("/settings/data-privacy?error=Only%20the%20Workspace%20Owner%20or%20Administrator%20can%20cancel%20deletion");
  }

  const supabase = await createClient();
  await supabase
    .from("data_deletion_requests")
    .update({ status: "canceled", canceled_at: new Date().toISOString() })
    .eq("id", formData.get("request_id") as string);

  revalidatePath("/settings/data-privacy");
}
