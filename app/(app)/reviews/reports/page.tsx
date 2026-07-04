import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { Card, PageHeader } from "@/components/ui";

const BENCHMARK_LABELS: Record<string, { label: string; lowerIsBetter?: boolean }> = {
  closed_won_rate: { label: "Closed-won rate" },
  client_at_risk_pct: { label: "Clients at risk", lowerIsBetter: true },
  capacity_utilization: { label: "Capacity utilization (actual vs. planned)" },
  automation_success_rate: { label: "Automation success rate" },
};

function formatPercent(value: number | null): string {
  if (value === null) return "—";
  return `${Math.round(value * 1000) / 10}%`;
}

export default async function ReviewReportsPage() {
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-semibold text-deep-indigo">Reports and Trends</h1>
        <p className="mt-2 text-sm text-soft-taupe">No workspace yet.</p>
      </div>
    );
  }

  const supabase = await createClient();

  const [{ data: recentReviews }, { data: findings }, { data: benchmarks }] = await Promise.all([
    supabase
      .from("review_instances")
      .select("id, status, completed_at, review_templates(cadence, name)")
      .eq("workspace_id", workspaceId)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(10),
    supabase
      .from("review_findings")
      .select("id, category, severity, statement, created_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.rpc("get_workspace_benchmarks", { p_workspace_id: workspaceId }),
  ]);

  return (
    <div className="p-8">
      <PageHeader
        title="Reports and Trends"
        description="A rollup of completed reviews and findings, plus privacy-safe benchmarks
        against other workspaces. Full custom KPIs and forecasting (Section 15) land in a
        later phase."
      />

      <section className="mt-6">
        <h2 className="text-lg font-semibold text-deep-indigo">Benchmarks</h2>
        <p className="mt-1 text-sm text-soft-taupe">
          Your value next to the average of other workspaces &mdash; shown only once at
          least 10 other workspaces have a computable value for that metric, so no single
          workspace&apos;s number is ever identifiable.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {(benchmarks ?? []).map((b) => {
            const meta = BENCHMARK_LABELS[b.metric] ?? { label: b.metric };
            return (
              <Card key={b.metric} className="text-sm">
                <p className="font-medium">{meta.label}</p>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl font-semibold text-deep-indigo">{formatPercent(b.your_value)}</span>
                  <span className="text-xs text-soft-taupe">You</span>
                </div>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-lg text-soft-taupe">
                    {b.benchmark_value !== null ? formatPercent(b.benchmark_value) : "Not enough data yet"}
                  </span>
                  <span className="text-xs text-soft-taupe">
                    {b.benchmark_value !== null ? `Avg. of ${b.contributing_workspaces} others` : `${b.contributing_workspaces}/10 workspaces so far`}
                  </span>
                </div>
              </Card>
            );
          })}
          {(!benchmarks || benchmarks.length === 0) && (
            <p className="text-sm text-soft-taupe">No benchmark data available yet.</p>
          )}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-deep-indigo">Recently completed reviews</h2>
        {recentReviews && recentReviews.length > 0 ? (
          <ul className="mt-2 space-y-2">
            {recentReviews.map((r: any) => (
              <li key={r.id}>
                <Card className="text-sm">
                  {r.review_templates?.name} · completed {new Date(r.completed_at).toLocaleString()}
                </Card>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-soft-taupe">No reviews completed yet.</p>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-deep-indigo">Recent findings</h2>
        {findings && findings.length > 0 ? (
          <ul className="mt-2 space-y-2">
            {findings.map((f) => (
              <li key={f.id}>
                <Card className="text-sm">
                  <p className="font-medium">{f.statement}</p>
                  <p className="text-soft-taupe">
                    {f.category} · {f.severity}
                  </p>
                </Card>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-soft-taupe">No findings recorded yet.</p>
        )}
      </section>
    </div>
  );
}
