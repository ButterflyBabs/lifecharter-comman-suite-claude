import type { SupabaseClient } from "@supabase/supabase-js";

type DomainScore = {
  domain_id: string;
  domain_name: string;
  build_completion_score: number | null;
  operating_health_score: number | null;
};

function severityFor(avg: number): "strength" | "stable" | "needs_attention" | "at_risk" {
  if (avg < 40) return "at_risk";
  if (avg < 60) return "needs_attention";
  if (avg < 80) return "stable";
  return "strength";
}

// Generates a prioritized roadmap from a completed Business Command Audit:
// one finding per domain (Build Completion and Operating Health scored
// independently, per Section 9.6), then one roadmap phase per domain
// sequenced lowest-score-first (the domains most in need of work come first),
// each phase carrying one milestone gated on approved completion evidence —
// reusing the same gate mechanism verified in
// supabase/tests/roadmap_gate_enforcement.sql.
export async function generateRoadmapFromAudit(
  supabase: SupabaseClient,
  workspaceId: string,
  auditInstanceId: string,
  userId: string,
) {
  const { data: scores } = await supabase
    .from("audit_domain_scores")
    .select("domain_id, build_completion_score, operating_health_score, business_command_domains(name)")
    .eq("audit_instance_id", auditInstanceId);

  const domainScores: DomainScore[] = (scores ?? []).map((row: any) => ({
    domain_id: row.domain_id,
    domain_name: row.business_command_domains?.name ?? "Unknown domain",
    build_completion_score: row.build_completion_score,
    operating_health_score: row.operating_health_score,
  }));

  const withAverage = domainScores.map((d) => {
    const build = d.build_completion_score ?? 0;
    const health = d.operating_health_score ?? 0;
    return { ...d, average: (build + health) / 2 };
  });

  // Findings: one per domain, both scores stated independently.
  const findingsToInsert = withAverage.map((d) => ({
    workspace_id: workspaceId,
    audit_instance_id: auditInstanceId,
    domain_id: d.domain_id,
    severity: severityFor(d.average),
    finding: `${d.domain_name}: Build Completion ${Math.round(d.build_completion_score ?? 0)}%, Operating Health ${Math.round(d.operating_health_score ?? 0)}%.`,
  }));

  if (findingsToInsert.length > 0) {
    await supabase.from("audit_findings").insert(findingsToInsert);
  }

  // Prioritize lowest-scoring domains first.
  const prioritized = [...withAverage].sort((a, b) => a.average - b.average);

  const { data: template } = await supabase
    .from("roadmap_templates")
    .select("id")
    .eq("name", "Standard Business Build")
    .single();

  const { data: roadmap } = await supabase
    .from("roadmap_instances")
    .insert({
      workspace_id: workspaceId,
      template_id: template?.id ?? null,
      primary_outcome: "Close the highest-priority gaps identified by the Business Command Audit.",
    })
    .select("id")
    .single();

  if (!roadmap) {
    return null;
  }

  for (const [i, domain] of prioritized.entries()) {
    const { data: phase } = await supabase
      .from("roadmap_phases")
      .insert({
        workspace_id: workspaceId,
        roadmap_instance_id: roadmap.id,
        name: domain.domain_name,
        sequence: i + 1,
        status: i === 0 ? "active" : "not_started",
      })
      .select("id")
      .single();

    if (!phase) continue;

    const { data: milestone } = await supabase
      .from("roadmap_milestones")
      .insert({
        workspace_id: workspaceId,
        phase_id: phase.id,
        title: `Strengthen ${domain.domain_name}`,
        purpose: `Build Completion ${Math.round(domain.build_completion_score ?? 0)}%, Operating Health ${Math.round(domain.operating_health_score ?? 0)}% as of this audit.`,
        owner: userId,
        definition_of_done: "Evidence attached showing the domain's build or health gap has been meaningfully addressed.",
        status: "not_started",
      })
      .select("id")
      .single();

    if (!milestone) continue;

    const { data: gate } = await supabase
      .from("stage_gates")
      .insert({
        workspace_id: workspaceId,
        name: `${domain.domain_name} evidence gate`,
        context_type: "roadmap_milestone",
        context_id: milestone.id,
        rule_mode: "blocking",
      })
      .select("id")
      .single();

    if (gate) {
      await supabase.from("gate_requirements").insert({
        workspace_id: workspaceId,
        stage_gate_id: gate.id,
        requirement_type: "evidence_required",
        blocking: true,
      });
    }
  }

  return roadmap.id as string;
}
