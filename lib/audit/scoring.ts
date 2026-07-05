import type { SupabaseClient } from "@supabase/supabase-js";

// Deterministic scoring shared by audit completion (findings snapshot) and
// roadmap generation. Numbers always come from audit_domain_scores — the
// security_invoker VIEW derived from actual audit_responses — so the AI never
// invents the math; it only interprets these values.

export type DomainScore = {
  domain_id: string;
  domain_name: string;
  build_completion_score: number | null;
  operating_health_score: number | null;
  average: number;
};

export function severityFor(avg: number): "strength" | "stable" | "needs_attention" | "at_risk" {
  if (avg < 40) return "at_risk";
  if (avg < 60) return "needs_attention";
  if (avg < 80) return "stable";
  return "strength";
}

export async function readDomainScores(
  supabase: SupabaseClient,
  auditInstanceId: string,
): Promise<DomainScore[]> {
  const { data: scores } = await supabase
    .from("audit_domain_scores")
    .select("domain_id, build_completion_score, operating_health_score, business_command_domains(name)")
    .eq("audit_instance_id", auditInstanceId);

  return (scores ?? []).map((row: any) => {
    const build = row.build_completion_score ?? 0;
    const health = row.operating_health_score ?? 0;
    return {
      domain_id: row.domain_id,
      domain_name: row.business_command_domains?.name ?? "Unknown domain",
      build_completion_score: row.build_completion_score,
      operating_health_score: row.operating_health_score,
      average: (build + health) / 2,
    };
  });
}

// Overall score = the mean of each domain's (build + health)/2 average.
export function overallScore(domainScores: DomainScore[]): number {
  if (domainScores.length === 0) return 0;
  const sum = domainScores.reduce((acc, d) => acc + d.average, 0);
  return Math.round(sum / domainScores.length);
}
