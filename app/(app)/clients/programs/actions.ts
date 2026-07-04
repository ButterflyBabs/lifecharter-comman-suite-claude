"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";

export async function createProgram(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  await supabase.from("programs").insert({
    workspace_id: workspaceId,
    name: formData.get("name") as string,
    offer_id: (formData.get("offer_id") as string) || null,
  });

  revalidatePath("/clients/programs");
}

export async function createProgramVersion(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const programId = formData.get("program_id") as string;
  const supabase = await createClient();

  const { count } = await supabase
    .from("program_versions")
    .select("id", { count: "exact", head: true })
    .eq("program_id", programId);

  await supabase.from("program_versions").insert({
    workspace_id: workspaceId,
    program_id: programId,
    version: (count ?? 0) + 1,
    outcome: (formData.get("outcome") as string) || null,
    format: (formData.get("format") as string) || null,
  });

  revalidatePath("/clients/programs");
}

export async function publishProgramVersion(formData: FormData) {
  const versionId = formData.get("version_id") as string;
  const programId = formData.get("program_id") as string;

  const supabase = await createClient();
  await supabase.from("program_versions").update({ status: "published", effective_at: new Date().toISOString() }).eq("id", versionId);
  await supabase.from("programs").update({ current_version_id: versionId, status: "active" }).eq("id", programId);

  revalidatePath("/clients/programs");
}

export async function addProgramPhase(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  await supabase.from("program_phases").insert({
    workspace_id: workspaceId,
    program_version_id: formData.get("program_version_id") as string,
    name: formData.get("name") as string,
    sequence: Number(formData.get("sequence") ?? 0),
    objective: (formData.get("objective") as string) || null,
    completion_rule: (formData.get("completion_rule") as string) || null,
  });

  revalidatePath("/clients/programs");
}
