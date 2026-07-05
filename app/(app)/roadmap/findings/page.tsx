import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { approveFindingsAction, generatePhaseAssessmentAction } from "./actions";
import { Card, PageHeader, StatusBadge } from "@/components/ui";

type PerDomainScore = {
  domain_id: string;
  domain_name: string;
  build_completion: number;
  operating_health: number;
  average: number;
  severity: string;
};

type Gap = {
  domain_id?: string;
  domain_name?: string;
  rationale?: string;
  recommended_action?: string;
  impact?: string;
  risk?: string;
  effort?: string;
};

export default async function FindingsPage() {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-semibold text-deep-indigo">Findings</h1>
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

  const { data: instance } = await supabase
    .from("audit_instances")
    .select("id, status")
    .eq("workspace_id", workspaceId)
    .in("status", ["findings_pending", "findings_approved", "completed"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!instance) {
    return (
      <div className="max-w-3xl p-8">
        <PageHeader title="Findings" description="No findings yet." />
        <p className="mt-4 text-sm text-soft-taupe">
          <Link href="/roadmap/audit" className="underline">
            Complete your Business Command Audit
          </Link>{" "}
          to generate findings.
        </p>
      </div>
    );
  }

  const { data: summary } = await supabase
    .from("audit_findings_summary")
    .select(
      "overall_score, per_domain_scores, top_gaps, strengths, contradictions, missing_evidence, ninety_day_priorities, narrative, approved_at",
    )
    .eq("audit_instance_id", instance.id)
    .maybeSingle();

  const perDomain = (summary?.per_domain_scores as PerDomainScore[] | null) ?? [];
  const overall = summary?.overall_score ?? 0;
  const topGaps = (summary?.top_gaps as Gap[] | null) ?? null;
  const strengths = (summary?.strengths as unknown[] | null) ?? null;
  const approved = instance.status === "findings_approved" || Boolean(summary?.approved_at);

  const sorted = [...perDomain].sort((a, b) => a.average - b.average);

  const { data: phaseRows } = await supabase
    .from("audit_phase_assessments")
    .select("domain_id, narrative, generated_milestones, status")
    .eq("audit_instance_id", instance.id);
  const assessmentByDomain = new Map((phaseRows ?? []).map((r) => [r.domain_id, r]));

  return (
    <div className="max-w-3xl p-8">
      <PageHeader
        title="Your Business Command Audit — Findings"
        description="Scores are computed directly from your answers. The narrative below interprets them; it does not change the numbers."
        actions={<StatusBadge status={instance.status} />}
      />

      <Card className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-deep-indigo">Overall score</h2>
          <span className="text-2xl font-semibold text-deep-indigo">{overall}%</span>
        </div>
      </Card>

      <h2 className="mt-8 text-lg font-semibold text-deep-indigo">By area</h2>
      <div className="mt-3 overflow-hidden rounded-2xl border border-[var(--card-border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--card-bg-hover)] text-left text-xs uppercase tracking-wide text-[var(--text-muted)]">
            <tr>
              <th className="px-4 py-2">Area</th>
              <th className="px-4 py-2">Build</th>
              <th className="px-4 py-2">Health</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((d) => (
              <tr key={d.domain_id} className="border-t border-[var(--card-border)]">
                <td className="px-4 py-2 font-medium text-deep-indigo">{d.domain_name}</td>
                <td className="px-4 py-2 text-soft-taupe">{d.build_completion}%</td>
                <td className="px-4 py-2 text-soft-taupe">{d.operating_health}%</td>
                <td className="px-4 py-2">
                  <StatusBadge status={d.severity} />
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-3 text-soft-taupe">
                  Scores are being prepared.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-deep-indigo">Phase deep-dives</h2>
        <p className="mt-1 text-sm text-soft-taupe">
          Generate a personalized milestone plan for any phase. Uses your workspace AI key; the plan is AI-generated and
          traced.
        </p>
        <ul className="mt-3 space-y-3">
          {sorted.map((d) => {
            const a = assessmentByDomain.get(d.domain_id) as
              | { narrative?: string | null; generated_milestones?: unknown }
              | undefined;
            const ms = (a?.generated_milestones as { title?: string; definition_of_done?: string }[] | null) ?? [];
            return (
              <li key={d.domain_id} className="lc-card p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-deep-indigo">{d.domain_name}</p>
                  <form action={generatePhaseAssessmentAction.bind(null, instance.id, d.domain_id)}>
                    <button
                      type="submit"
                      className="rounded border border-soft-taupe px-3 py-1 text-xs text-deep-indigo focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-deep-indigo"
                    >
                      {a ? "Regenerate plan" : "Generate milestone plan"}
                    </button>
                  </form>
                </div>
                {a?.narrative && <p className="mt-2 text-sm text-soft-taupe">{a.narrative}</p>}
                {ms.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {ms.map((m, i) => (
                      <li key={i} className="text-sm text-deep-indigo">
                        • {m.title}
                        {m.definition_of_done ? ` — done when: ${m.definition_of_done}` : ""}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
          {sorted.length === 0 && <li className="text-sm text-soft-taupe">Scores are being prepared.</li>}
        </ul>
      </section>

      {summary?.narrative ? (
        <Card className="mt-6">
          <h2 className="text-lg font-semibold text-deep-indigo">Summary</h2>
          <p className="mt-2 whitespace-pre-line text-sm text-soft-taupe">{summary.narrative}</p>
        </Card>
      ) : (
        <Card className="mt-6">
          <p className="text-sm text-soft-taupe">
            Your scores above are ready. To add an AI-written interpretation (top gaps, strengths, and 90-day
            priorities), connect an API key in{" "}
            <Link href="/settings/ai-credentials" className="underline">
              Settings → AI Keys
            </Link>
            , then re-open your audit and complete it again.
          </p>
        </Card>
      )}

      {topGaps && topGaps.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold text-deep-indigo">Top gaps</h2>
          <ul className="mt-2 space-y-2">
            {topGaps.map((g, i) => (
              <li key={i} className="lc-card p-4">
                <p className="text-sm font-medium text-deep-indigo">{g.domain_name ?? "Gap"}</p>
                {g.rationale && <p className="mt-1 text-sm text-soft-taupe">{g.rationale}</p>}
                {g.recommended_action && (
                  <p className="mt-1 text-sm text-deep-indigo">Recommended: {g.recommended_action}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {strengths && strengths.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold text-deep-indigo">Strengths</h2>
          <ul className="mt-2 list-disc pl-5 text-sm text-soft-taupe">
            {strengths.map((s, i) => (
              <li key={i}>{typeof s === "string" ? s : JSON.stringify(s)}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8 flex flex-wrap gap-2 border-t border-[var(--card-border)] pt-5">
        {approved ? (
          <Link
            href="/roadmap/plan#phases"
            className="lc-btn-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sacred-teal"
          >
            View My Roadmap
          </Link>
        ) : (
          <>
            <form action={approveFindingsAction.bind(null, instance.id)}>
              <button
                type="submit"
                className="lc-btn-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sacred-teal"
              >
                Approve findings and build my Roadmap
              </button>
            </form>
            <Link
              href="/roadmap/plan"
              className="rounded border border-soft-taupe px-4 py-2 text-sm text-deep-indigo focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-deep-indigo"
            >
              Back
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
