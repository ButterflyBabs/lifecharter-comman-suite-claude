"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";

export async function addClientAction(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  await supabase.from("client_actions").insert({
    workspace_id: workspaceId,
    client_id: formData.get("client_id") as string,
    title: formData.get("title") as string,
    description: (formData.get("description") as string) || null,
    due_at: (formData.get("due_at") as string) || null,
    client_visible: formData.get("client_visible") === "on",
  });

  revalidatePath("/clients/actions");
}

export async function addCoachAction(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  await supabase.from("coach_actions").insert({
    workspace_id: workspaceId,
    client_id: formData.get("client_id") as string,
    title: formData.get("title") as string,
    due_at: (formData.get("due_at") as string) || null,
  });

  revalidatePath("/clients/actions");
}

export async function updateClientActionStatus(formData: FormData) {
  const supabase = await createClient();
  const id = formData.get("action_id") as string;
  const nextStatus = formData.get("next_status") as string;

  if (nextStatus === "open") {
    const { data: current } = await supabase.from("client_actions").select("reschedule_count").eq("id", id).single();
    await supabase.from("client_actions").update({ status: "open", reschedule_count: (current?.reschedule_count ?? 0) + 1 }).eq("id", id);
  } else {
    await supabase.from("client_actions").update({ status: nextStatus }).eq("id", id);
  }

  revalidatePath("/clients/actions");
}

export async function updateCoachActionStatus(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("coach_actions").update({ status: formData.get("next_status") as string }).eq("id", formData.get("action_id") as string);

  revalidatePath("/clients/actions");
}
