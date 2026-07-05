"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { completeAudit } from "@/lib/audit/flow";
import type { AdaptiveQuestion } from "@/lib/audit/types";

const TEMPLATE_NAME = "Business Command Audit — Standard";

// Resolve the workspace that owns an instance, and assert the caller is a member
// of it (RLS also enforces this; this is defense-in-depth + a clean error).
async function instanceWorkspace(supabase: Awaited<ReturnType<typeof createClient>>, instanceId: string) {
  const { data } = await supabase
    .from("audit_instances")
    .select("workspace_id")
    .eq("id", instanceId)
    .maybeSingle();
  return data?.workspace_id as string | undefined;
}

// Start a fresh audit run (State A "Start My Business Command Audit"). Creates a
// new in_progress instance and hands off to the engine.
export async function startAudit() {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: template } = await supabase
    .from("audit_templates")
    .select("id")
    .eq("name", TEMPLATE_NAME)
    .single();

  if (!template) redirect("/roadmap/audit?error=No+audit+template+available");

  const { data: created } = await supabase
    .from("audit_instances")
    .insert({ workspace_id: workspaceId, template_id: template!.id, owner_id: user!.id, status: "in_progress" })
    .select("id")
    .single();

  if (!created) redirect("/roadmap/audit?error=Could+not+start+audit");
  redirect("/roadmap/audit");
}

// Debounced autosave from the engine. Upserts a single response; workspace is
// derived server-side (never trusted from the client).
export async function saveResponse(input: {
  instanceId: string;
  questionId: string;
  score: number | null;
  responseJson: unknown;
  notes: string | null;
  evidenceRefs: unknown[] | null;
}): Promise<{ ok: boolean; savedAt: string }> {
  const supabase = await createClient();
  const workspaceId = await instanceWorkspace(supabase, input.instanceId);
  if (!workspaceId) return { ok: false, savedAt: "" };

  const { error } = await supabase.from("audit_responses").upsert(
    {
      workspace_id: workspaceId,
      audit_instance_id: input.instanceId,
      question_id: input.questionId,
      score: input.score,
      response_json: input.responseJson ?? null,
      notes: input.notes,
      evidence_refs: input.evidenceRefs ?? null,
    },
    { onConflict: "audit_instance_id,question_id" },
  );

  // Touch the run so its updated_at reflects last activity (State B "last saved").
  await supabase.from("audit_instances").update({ updated_at: new Date().toISOString() }).eq("id", input.instanceId);

  return { ok: !error, savedAt: new Date().toISOString() };
}

// Full completion → deterministic findings + score snapshot + findings_pending,
// then redirect so /roadmap/plan renders State C.
export async function completeAuditAction(instanceId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const workspaceId = await instanceWorkspace(supabase, instanceId);
  if (!workspaceId) redirect("/roadmap/audit?error=Audit+instance+not+found");

  await completeAudit(supabase, workspaceId!, instanceId);

  revalidatePath("/roadmap/plan");
  redirect("/roadmap/plan");
}

// --- Adaptive follow-ups -------------------------------------------------

export async function fetchAdaptive(instanceId: string, domainId: string): Promise<AdaptiveQuestion[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("audit_adaptive_questions")
    .select("id, prompt, rationale, domain_id, response_json, notes, status")
    .eq("audit_instance_id", instanceId)
    .eq("domain_id", domainId)
    .neq("status", "dismissed")
    .order("display_order");

  return (data ?? []).map((r) => ({
    id: r.id,
    prompt: r.prompt,
    rationale: r.rationale,
    domainId: r.domain_id,
    value: (r.response_json as { value?: string } | null)?.value ?? null,
    notes: r.notes,
  }));
}

// Fire the adaptive edge function for a just-completed domain (best-effort;
// no-op without a BYOK credential) and return whatever follow-ups now exist.
export async function runAdaptive(instanceId: string, domainId: string): Promise<AdaptiveQuestion[]> {
  const supabase = await createClient();
  const workspaceId = await instanceWorkspace(supabase, instanceId);
  if (!workspaceId) return [];
  try {
    await supabase.functions.invoke("audit-adaptive", {
      body: { audit_instance_id: instanceId, domain_id: domainId },
    });
  } catch {
    // best-effort; deterministic audit is unaffected
  }
  return fetchAdaptive(instanceId, domainId);
}

export async function saveAdaptiveAnswer(input: {
  adaptiveId: string;
  value: string | null;
  notes: string | null;
}): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const answered = input.value != null && input.value !== "";
  const { error } = await supabase
    .from("audit_adaptive_questions")
    .update({
      response_json: { value: input.value },
      notes: input.notes,
      answered_at: answered ? new Date().toISOString() : null,
      status: answered ? "answered" : "pending",
    })
    .eq("id", input.adaptiveId);
  return { ok: !error };
}
