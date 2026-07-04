import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { Card, PageHeader } from "@/components/ui";

export default async function RoadmapHistoryPage() {
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-semibold text-deep-indigo">Roadmap History</h1>
        <p className="mt-2 text-sm text-soft-taupe">No workspace yet.</p>
      </div>
    );
  }

  const supabase = await createClient();
  const { data: audits } = await supabase
    .from("audit_instances")
    .select("id, status, period_start, period_end")
    .eq("workspace_id", workspaceId)
    .order("period_start", { ascending: false });

  const { data: roadmaps } = await supabase
    .from("roadmap_instances")
    .select("id, primary_outcome, status, start_date")
    .eq("workspace_id", workspaceId)
    .order("start_date", { ascending: false });

  return (
    <div className="p-8">
      <PageHeader title="Roadmap History" />

      <section className="mt-6">
        <h2 className="text-lg font-semibold text-deep-indigo">Business Command Audits</h2>
        {audits && audits.length > 0 ? (
          <ul className="mt-2 space-y-2">
            {audits.map((a) => (
              <li key={a.id}>
                <Card className="text-sm">
                  {a.period_start} {a.period_end ? `– ${a.period_end}` : ""} · {a.status}
                </Card>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-soft-taupe">No audits yet.</p>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-deep-indigo">Roadmaps Generated</h2>
        {roadmaps && roadmaps.length > 0 ? (
          <ul className="mt-2 space-y-2">
            {roadmaps.map((r) => (
              <li key={r.id}>
                <Card className="text-sm">
                  <p className="font-medium">{r.primary_outcome}</p>
                  <p className="text-soft-taupe">
                    Started {r.start_date} · {r.status}
                  </p>
                </Card>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-soft-taupe">No roadmaps yet.</p>
        )}
      </section>
    </div>
  );
}
