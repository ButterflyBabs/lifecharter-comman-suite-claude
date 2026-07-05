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

// Deeper per-phase AI assessment: generate personalized milestone suggestions
// for one phase. Best-effort (no-op without a BYOK credential); fully traced.
export async function generatePhaseAssessmentAction(instanceId: string, domainId: string) {
  const supabase = await createClient();
  try {
    await supabase.functions.invoke("audit-phase-assessment", {
      body: { audit_instance_id: instanceId, domain_id: domainId },
    });
  } catch {
    // deterministic audit unaffected
  }
  revalidatePath("/roadmap/findings");
}
