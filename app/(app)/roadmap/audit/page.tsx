import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { AuditEngine, type EngineDomain } from "@/components/roadmap/AuditEngine";
import type { AdaptiveQuestion } from "@/lib/audit/types";

// The authenticated audit engine. mode is 'full' here; the same component takes
// mode='snapshot' for the (not-built-this-session) public lead-magnet route,
// which filters to include_in_snapshot questions only.
const MODE: "full" | "snapshot" = "full";

export default async function AuditPage() {
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-semibold text-deep-indigo">Business Command Audit</h1>
        <p className="mt-2 text-sm text-soft-taupe">
          <Link href="/roadmap/setup" className="underline">
            Set up your workspace
          </Link>{" "}
          first.
        </p>
      </div>
    );
  }

  const supabase = await createClient();

  const { data: template } = await supabase
    .from("audit_templates")
    .select("id")
    .eq("name", "Business Command Audit — Standard")
    .single();

  // The engine only runs against an in-progress instance. Starting and
  // reassessing are driven from /roadmap/plan (State A / State D), so if there is
  // nothing in progress, send the user back there to derive the right state.
  const { data: instance } = await supabase
    .from("audit_instances")
    .select("id, status, updated_at")
    .eq("workspace_id", workspaceId)
    .eq("status", "in_progress")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!instance) {
    redirect("/roadmap/plan");
  }

  let questionQuery = supabase
    .from("audit_questions")
    .select(
      "id, prompt, response_type, score_category, include_in_snapshot, domain_id, business_command_domains(id, name, description, display_order)",
    )
    .eq("audit_template_id", template!.id);

  if (MODE === "snapshot") {
    questionQuery = questionQuery.eq("include_in_snapshot", true);
  }

  const { data: questions } = await questionQuery;

  const { data: responses } = await supabase
    .from("audit_responses")
    .select("question_id, score, response_json, notes, evidence_refs")
    .eq("audit_instance_id", instance!.id);

  const responseByQuestion = new Map((responses ?? []).map((r) => [r.question_id, r]));

  // Existing adaptive follow-ups (AI-generated, tenant-scoped), grouped by domain.
  const { data: adaptiveRows } = await supabase
    .from("audit_adaptive_questions")
    .select("id, prompt, rationale, domain_id, response_json, notes, status")
    .eq("audit_instance_id", instance!.id)
    .neq("status", "dismissed")
    .order("display_order");

  const initialAdaptive: Record<string, AdaptiveQuestion[]> = {};
  for (const r of adaptiveRows ?? []) {
    (initialAdaptive[r.domain_id] ??= []).push({
      id: r.id,
      prompt: r.prompt,
      rationale: r.rationale,
      domainId: r.domain_id,
      value: (r.response_json as { value?: string } | null)?.value ?? null,
      notes: r.notes,
    });
  }

  type QuestionRow = {
    id: string;
    prompt: string;
    response_type: string;
    score_category: string;
    domain_id: string;
    business_command_domains: { id: string; name: string; description: string | null; display_order: number } | null;
  };

  const byDomain = new Map<string, EngineDomain>();
  for (const q of (questions ?? []) as unknown as QuestionRow[]) {
    const domain = q.business_command_domains;
    if (!domain) continue;
    if (!byDomain.has(domain.id)) {
      byDomain.set(domain.id, {
        id: domain.id,
        name: domain.name,
        description: domain.description,
        order: domain.display_order,
        questions: [],
      });
    }
    const existing = responseByQuestion.get(q.id);
    byDomain.get(domain.id)!.questions.push({
      id: q.id,
      prompt: q.prompt,
      responseType: q.response_type,
      scoreCategory: q.score_category,
      existing: existing
        ? {
            score: existing.score,
            responseJson: existing.response_json,
            notes: existing.notes,
            evidenceRefs: (existing.evidence_refs as unknown[]) ?? [],
          }
        : null,
    });
  }

  const domains = [...byDomain.values()].sort((a, b) => a.order - b.order);

  return (
    <AuditEngine
      instanceId={instance!.id}
      workspaceId={workspaceId}
      mode={MODE}
      domains={domains}
      initialSavedAt={instance!.updated_at}
      initialAdaptive={initialAdaptive}
    />
  );
}
