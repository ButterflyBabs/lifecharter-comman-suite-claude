"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { isWorkspaceAdmin } from "@/lib/data/workspace";

// Store a BYOK key. The plaintext key goes straight into Vault via the
// set_workspace_ai_key RPC and is never persisted or echoed by the app.
export async function saveAiKey(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  if (!(await isWorkspaceAdmin(workspaceId))) {
    redirect("/settings/ai-credentials?error=Only%20the%20Workspace%20Owner%20or%20Administrator%20can%20manage%20AI%20keys");
  }

  const apiKey = ((formData.get("api_key") as string) ?? "").trim();
  const provider = ((formData.get("provider") as string) || "anthropic").trim();
  const model = ((formData.get("model") as string) || "").trim() || null;
  const label = ((formData.get("label") as string) || "").trim() || null;

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_workspace_ai_key", {
    p_workspace_id: workspaceId,
    p_api_key: apiKey,
    p_provider: provider,
    p_model: model,
    p_label: label,
  });

  if (error) {
    redirect(`/settings/ai-credentials?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/settings/ai-credentials");
}

export async function revokeAiKey(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  if (!(await isWorkspaceAdmin(workspaceId))) {
    redirect("/settings/ai-credentials?error=Only%20the%20Workspace%20Owner%20or%20Administrator%20can%20manage%20AI%20keys");
  }

  const supabase = await createClient();
  await supabase
    .from("workspace_ai_credentials")
    .update({ status: "revoked", archived_at: new Date().toISOString() })
    .eq("id", formData.get("credential_id") as string);

  revalidatePath("/settings/ai-credentials");
}
