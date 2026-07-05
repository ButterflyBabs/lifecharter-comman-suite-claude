"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { approveFindings } from "@/lib/audit/flow";

// Approve findings → findings_approved + generate the roadmap from the approved
// audit. Workspace is derived server-side; RLS enforces membership.
export async function approveFindingsAction(instanceId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: instance } = await supabase
    .from("audit_instances")
    .select("workspace_id")
    .eq("id", instanceId)
    .maybeSingle();

  if (!instance) redirect("/roadmap/plan");

  await approveFindings(supabase, instance!.workspace_id, instanceId, user!.id);

  revalidatePath("/roadmap/plan");
  redirect("/roadmap/plan");
}
