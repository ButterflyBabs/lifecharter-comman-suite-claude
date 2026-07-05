import type { SupabaseClient } from "@supabase/supabase-js";
import { readDomainScores } from "@/lib/audit/scoring";

// Generates a prioritized roadmap from an APPROVED Business Command Audit:
// one roadmap phase per domain sequenced lowest-score-first (the domains most
// in need of work come first), each phase carrying one milestone gated on
// approved completion evidence — reusing the same gate mechanism verified in
// supabase/tests/roadmap_gate_enforcement.sql.
//
// Per-domain findings and the deterministic score snapshot are written earlier,
// at audit completion (see lib/audit/flow.ts). Roadmap generation only runs
// after a human approves the findings (status -> findings_approved), so this is
// intentionally the approval-time half of the split.
export async function generateRoadmapFromAudit(
  supabase: SupabaseClient,
  workspaceId: string,
  auditInstanceId: string,
  userId: string,
) {
  const withAverage = await readDomainScores(supabase, auditInstanceId);

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
