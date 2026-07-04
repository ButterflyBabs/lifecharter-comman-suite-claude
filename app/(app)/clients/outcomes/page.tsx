import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { Card, PageHeader, StatusBadge } from "@/components/ui";
import { createMetric, recordMetricValue, addMilestone, achieveMilestone, createAssessment, assignAssessment } from "./actions";

export default async function OutcomesPage() {
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="p-8">
        <PageHeader title="Outcomes and Progress" />
        <p className="mt-2 text-sm text-soft-taupe">No workspace yet.</p>
      </div>
    );
  }

  const supabase = await createClient();

  const [{ data: metrics }, { data: recentValues }, { data: milestones }, { data: assessments }, { data: instances }, { data: clients }] = await Promise.all([
    supabase.from("metrics").select("id, name, unit, direction").eq("workspace_id", workspaceId),
    supabase.from("client_metric_values").select("id, value, source, measured_at, metrics(name, unit), clients(organizations(name))").eq("workspace_id", workspaceId).order("measured_at", { ascending: false }).limit(20),
    supabase.from("client_milestones").select("id, title, target_at, achieved_at, status, clients(organizations(name))").eq("workspace_id", workspaceId).order("target_at"),
    supabase.from("assessments").select("id, name").eq("workspace_id", workspaceId),
    supabase.from("assessment_instances").select("id, opened_at, completed_at, assessments(name), clients(organizations(name))").eq("workspace_id", workspaceId).order("opened_at", { ascending: false }),
    supabase.from("clients").select("id, organizations(name)").eq("workspace_id", workspaceId),
  ]);

  const orgName = (c: { organizations: unknown } | null) => (c?.organizations as { name: string } | null)?.name ?? "Untitled client";

  return (
    <div className="p-8">
      <PageHeader
        title="Outcomes and Progress"
        description="Metrics, milestones, and assessments — each value tagged with its evidence source."
      />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section>
          <h2 className="text-lg font-semibold text-deep-indigo">Recent metric values</h2>
          <ul className="mt-3 space-y-2">
            {(recentValues ?? []).map((v) => (
              <li key={v.id}>
                <Card className="text-sm">
                  <p className="font-medium">
                    {(v.metrics as unknown as { name: string; unit: string | null } | null)?.name}: {v.value}
                    {(v.metrics as unknown as { name: string; unit: string | null } | null)?.unit ?? ""}
                  </p>
                  <p className="text-soft-taupe">{orgName(v.clients as unknown as { organizations: unknown } | null)} · {v.source.replace(/_/g, " ")}</p>
                  <p className="text-xs text-soft-taupe">{new Date(v.measured_at).toLocaleDateString()}</p>
                </Card>
              </li>
            ))}
            {(!recentValues || recentValues.length === 0) && <p className="text-sm text-soft-taupe">No metric values yet.</p>}
          </ul>

          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-deep-indigo underline">Record metric value</summary>
            <form action={recordMetricValue} className="mt-2 max-w-md space-y-2">
              <select name="client_id" required className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
                <option value="">Select client&hellip;</option>
                {clients?.map((c) => (
                  <option key={c.id} value={c.id}>{orgName(c as unknown as { organizations: unknown } | null)}</option>
                ))}
              </select>
              <select name="metric_id" required className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
                <option value="">Select metric&hellip;</option>
                {metrics?.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              <input type="number" name="value" step="any" placeholder="Value" required className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
              <select name="source" className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
                <option value="client_report">Client report</option>
                <option value="coach_observation">Coach observation</option>
                <option value="system_record">System record</option>
                <option value="assessment">Assessment</option>
              </select>
              <input type="text" name="notes" placeholder="Notes" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
              <button type="submit" className="lc-btn-primary">Record</button>
            </form>
          </details>

          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-deep-indigo underline">Create metric</summary>
            <form action={createMetric} className="mt-2 max-w-md space-y-2">
              <input type="text" name="name" placeholder="Metric name" required className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
              <input type="text" name="unit" placeholder="Unit" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
              <select name="direction" defaultValue="" className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
                <option value="">No direction</option>
                <option value="increase">Increase is good</option>
                <option value="decrease">Decrease is good</option>
              </select>
              <input type="text" name="collection_method" placeholder="Collection method" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
              <button type="submit" className="lc-btn-primary">Create metric</button>
            </form>
          </details>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-deep-indigo">Milestones</h2>
          <ul className="mt-3 space-y-2">
            {(milestones ?? []).map((m) => (
              <li key={m.id}>
                <Card className="text-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{m.title}</p>
                    <StatusBadge status={m.status} />
                  </div>
                  <p className="text-soft-taupe">{orgName(m.clients as unknown as { organizations: unknown } | null)}</p>
                  {m.target_at && <p className="text-xs text-soft-taupe">Target {new Date(m.target_at).toLocaleDateString()}</p>}
                  {m.status === "planned" || m.status === "in_progress" ? (
                    <form action={achieveMilestone} className="mt-1">
                      <input type="hidden" name="milestone_id" value={m.id} />
                      <button type="submit" className="lc-btn-secondary text-xs">Mark achieved</button>
                    </form>
                  ) : null}
                </Card>
              </li>
            ))}
            {(!milestones || milestones.length === 0) && <p className="text-sm text-soft-taupe">No milestones yet.</p>}
          </ul>

          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-deep-indigo underline">Add milestone</summary>
            <form action={addMilestone} className="mt-2 max-w-md space-y-2">
              <select name="client_id" required className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
                <option value="">Select client&hellip;</option>
                {clients?.map((c) => (
                  <option key={c.id} value={c.id}>{orgName(c as unknown as { organizations: unknown } | null)}</option>
                ))}
              </select>
              <input type="text" name="title" placeholder="Milestone title" required className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
              <input type="date" name="target_at" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
              <button type="submit" className="lc-btn-primary">Add milestone</button>
            </form>
          </details>

          <h2 className="mt-6 text-lg font-semibold text-deep-indigo">Assessments</h2>
          <ul className="mt-3 space-y-2">
            {(instances ?? []).map((i) => (
              <li key={i.id}>
                <Card className="text-sm">
                  <p className="font-medium">{(i.assessments as unknown as { name: string } | null)?.name}</p>
                  <p className="text-soft-taupe">{orgName(i.clients as unknown as { organizations: unknown } | null)}</p>
                  <StatusBadge status={i.completed_at ? "completed" : "in_progress"} />
                </Card>
              </li>
            ))}
            {(!instances || instances.length === 0) && <p className="text-sm text-soft-taupe">No assessments assigned yet.</p>}
          </ul>

          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-deep-indigo underline">Assign assessment</summary>
            <form action={assignAssessment} className="mt-2 max-w-md space-y-2">
              <select name="client_id" required className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
                <option value="">Select client&hellip;</option>
                {clients?.map((c) => (
                  <option key={c.id} value={c.id}>{orgName(c as unknown as { organizations: unknown } | null)}</option>
                ))}
              </select>
              <select name="assessment_id" required className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
                <option value="">Select assessment&hellip;</option>
                {assessments?.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              <button type="submit" className="lc-btn-primary">Assign</button>
            </form>
          </details>

          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-deep-indigo underline">Create assessment</summary>
            <form action={createAssessment} className="mt-2 max-w-md space-y-2">
              <input type="text" name="name" placeholder="Assessment name" required className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
              <textarea name="scoring_rule" placeholder="Scoring rule" rows={2} className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
              <button type="submit" className="lc-btn-primary">Create assessment</button>
            </form>
          </details>
        </section>
      </div>
    </div>
  );
}
