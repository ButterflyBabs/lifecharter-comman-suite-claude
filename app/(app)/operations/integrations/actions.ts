"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";

export async function connectProvider(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  await supabase.from("integration_accounts").insert({
    workspace_id: workspaceId,
    provider_id: formData.get("provider_id") as string,
    connected_user: (formData.get("connected_user") as string) || null,
    sync_direction: (formData.get("sync_direction") as string) || null,
    status: "connected",
    connected_at: new Date().toISOString(),
    last_success_at: new Date().toISOString(),
  });

  revalidatePath("/operations/integrations");
}

export async function disconnectAccount(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("integration_accounts").update({ status: "disconnected" }).eq("id", formData.get("account_id") as string);

  revalidatePath("/operations/integrations");
}

export async function testConnection(formData: FormData) {
  const supabase = await createClient();
  await supabase
    .from("integration_accounts")
    .update({ status: "connected", last_success_at: new Date().toISOString() })
    .eq("id", formData.get("account_id") as string);

  revalidatePath("/operations/integrations");
}
