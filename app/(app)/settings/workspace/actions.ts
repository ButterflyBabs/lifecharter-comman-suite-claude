"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { isWorkspaceAdmin } from "@/lib/data/workspace";

export async function updateWorkspace(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  if (!(await isWorkspaceAdmin(workspaceId))) {
    redirect("/settings/workspace?error=Only%20the%20Workspace%20Owner%20or%20Administrator%20can%20change%20workspace%20settings");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("workspaces")
    .update({
      name: formData.get("name") as string,
      timezone: formData.get("timezone") as string,
      currency: formData.get("currency") as string,
      locale: formData.get("locale") as string,
    })
    .eq("id", workspaceId);

  if (error) {
    redirect(`/settings/workspace?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/settings/workspace");
}
