import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";

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

  const { data: recentReviews } = await supabase
    .from("review_instances")
    .select("id, status, completed_at, review_templates(cadence, name)")
    .eq("workspace_id", workspaceId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(10);

  const { data: findings } = await supabase
    .from("review_findings")
    .select("id, category, severity, statement, created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-deep-indigo">Reports and Trends</h1>
      <p className="mt-2 text-sm text-soft-taupe">
        A rollup of completed reviews and findings. Deeper metrics and forecasting
        (Section 15) land in a later phase.
      </p>

      <section className="mt-6">
        <h2 className="text-lg font-semibold text-deep-indigo">Recently completed reviews</h2>
        {recentReviews && recentReviews.length > 0 ? (
          <ul className="mt-2 space-y-2">
            {recentReviews.map((r: any) => (
              <li key={r.id} className="rounded border border-soft-taupe/40 p-3 text-sm">
                {r.review_templates?.name} · completed {new Date(r.completed_at).toLocaleString()}
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
              <li key={f.id} className="rounded border border-soft-taupe/40 p-3 text-sm">
                <p className="font-medium">{f.statement}</p>
                <p className="text-soft-taupe">
                  {f.category} · {f.severity}
                </p>
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
