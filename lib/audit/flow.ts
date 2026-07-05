import type { SupabaseClient } from "@supabase/supabase-js";
import { readDomainScores, overallScore, severityFor } from "@/lib/audit/scoring";
import { generateRoadmapFromAudit } from "@/lib/roadmap/generate";

// Audit completion (deterministic half): compute per-domain scores from the
// audit_domain_scores view, write one audit_findings row per domain, and persist
// an immutable score snapshot into audit_findings_summary. Then land on
// findings_pending so /roadmap/plan renders State C, and best-effort trigger the
// AI findings edge function to enrich the narrative. The numbers here are never
// AI-invented — the AI only interprets them.
export async function completeAudit(
  supabase: SupabaseClient,
  workspaceId: string,
  auditInstanceId: string,
) {
  const domainScores = await readDomainScores(supabase, auditInstanceId);

  // Per-domain findings — replace any prior rows for this instance so a
  // re-completion doesn't duplicate (soft-delete keeps history elsewhere).
  await supabase
    .from("audit_findings")
    .delete()
    .eq("audit_instance_id", auditInstanceId)
    .is("approved_by", null);

  const findingsToInsert = domainScores.map((d) => ({
    workspace_id: workspaceId,
    audit_instance_id: auditInstanceId,
    domain_id: d.domain_id,
    severity: severityFor(d.average),
    finding: `${d.domain_name}: Build Completion ${Math.round(
      d.build_completion_score ?? 0,
    )}%, Operating Health ${Math.round(d.operating_health_score ?? 0)}%.`,
  }));

  if (findingsToInsert.length > 0) {
    await supabase.from("audit_findings").insert(findingsToInsert);
  }

  // Immutable deterministic score snapshot (the view shifts as answers change;
  // this captures the numbers at completion time).
  const perDomain = domainScores.map((d) => ({
    domain_id: d.domain_id,
    domain_name: d.domain_name,
    build_completion: Math.round(d.build_completion_score ?? 0),
    operating_health: Math.round(d.operating_health_score ?? 0),
    average: Math.round(d.average),
    severity: severityFor(d.average),
  }));

  await supabase.from("audit_findings_summary").upsert(
    {
      workspace_id: workspaceId,
      audit_instance_id: auditInstanceId,
      overall_score: overallScore(domainScores),
      per_domain_scores: perDomain,
    },
    { onConflict: "audit_instance_id" },
  );

  await supabase
    .from("audit_instances")
    .update({ status: "findings_pending", period_end: new Date().toISOString().slice(0, 10) })
    .eq("id", auditInstanceId);

  // Best-effort AI enrichment — never blocks reaching findings_pending. Requires
  // a workspace BYOK credential; degrades gracefully when none is configured.
  try {
    await supabase.functions.invoke("audit-findings", {
      body: { audit_instance_id: auditInstanceId },
    });
  } catch {
    // Deterministic findings already written; narrative enrichment is optional.
  }
}

// Findings approval (human gate): stamp approval on the summary, move to
// findings_approved (State D), and generate the roadmap from the approved audit.
export async function approveFindings(
  supabase: SupabaseClient,
  workspaceId: string,
  auditInstanceId: string,
  userId: string,
) {
  await supabase
    .from("audit_findings_summary")
    .update({ approved_by: userId, approved_at: new Date().toISOString() })
    .eq("audit_instance_id", auditInstanceId);

  await supabase
    .from("audit_instances")
    .update({ status: "findings_approved" })
    .eq("id", auditInstanceId);

  return generateRoadmapFromAudit(supabase, workspaceId, auditInstanceId, userId);
}
