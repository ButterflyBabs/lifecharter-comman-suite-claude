import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { Card, PageHeader, StatusBadge } from "@/components/ui";
import { recordHealthEvent, createInterventionPlan, resolveInterventionPlan, createSupportRequest, resolveSupportRequest } from "./actions";

export default async function HealthPage() {
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="p-8">
        <PageHeader title="Client Health" />
        <p className="mt-2 text-sm text-soft-taupe">No workspace yet.</p>
      </div>
    );
  }

  const supabase = await createClient();

  const [{ data: healthEvents }, { data: plans }, { data: requests }, { data: clients }] = await Promise.all([
    supabase.from("client_health_events").select("id, score, status, calculated_at, clients(organizations(name))").eq("workspace_id", workspaceId).order("calculated_at", { ascending: false }).limit(20),
    supabase.from("intervention_plans").select("id, status, review_at, outcome, clients(organizations(name))").eq("workspace_id", workspaceId).order("created_at", { ascending: false }),
    supabase.from("support_requests").select("id, category, priority, summary, status, response_due_at, clients(organizations(name))").eq("workspace_id", workspaceId).order("created_at", { ascending: false }),
    supabase.from("clients").select("id, organizations(name)").eq("workspace_id", workspaceId),
  ]);

  const orgName = (c: { organizations: unknown } | null) => (c?.organizations as { name: string } | null)?.name ?? "Untitled client";

  return (
    <div className="p-8">
      <PageHeader
        title="Client Health"
        description="Health signals, active intervention plans, and open support requests across every client."
      />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section>
          <h2 className="text-lg font-semibold text-deep-indigo">Health events</h2>
          <ul className="mt-3 space-y-2">
            {(healthEvents ?? []).map((h) => (
              <li key={h.id}>
                <Card className="text-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{orgName(h.clients as unknown as { organizations: unknown } | null)}</p>
                    <StatusBadge status={h.status} />
                  </div>
                  {h.score !== null && <p className="text-soft-taupe">Score: {h.score}</p>}
                  <p className="text-xs text-soft-taupe">{new Date(h.calculated_at).toLocaleDateString()}</p>
                </Card>
              </li>
            ))}
            {(!healthEvents || healthEvents.length === 0) && <p className="text-sm text-soft-taupe">No health events yet.</p>}
          </ul>

          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-deep-indigo underline">Record health event</summary>
            <form action={recordHealthEvent} className="mt-2 max-w-md space-y-2">
              <select name="client_id" required className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
                <option value="">Select client&hellip;</option>
                {clients?.map((c) => (
                  <option key={c.id} value={c.id}>{orgName(c as unknown as { organizations: unknown } | null)}</option>
                ))}
              </select>
              <select name="status" required className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
                <option value="healthy">Healthy</option>
                <option value="watch">Watch</option>
                <option value="at_risk">At risk</option>
              </select>
              <input type="number" name="score" min="0" max="100" placeholder="Score (0-100)" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
              <input type="text" name="override_reason" placeholder="Override reason (if manual)" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
              <button type="submit" className="lc-btn-primary">Record</button>
            </form>
          </details>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-deep-indigo">Intervention plans</h2>
          <ul className="mt-3 space-y-2">
            {(plans ?? []).map((p) => (
              <li key={p.id}>
                <Card className="text-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{orgName(p.clients as unknown as { organizations: unknown } | null)}</p>
                    <StatusBadge status={p.status} />
                  </div>
                  {p.review_at && <p className="text-xs text-soft-taupe">Review {new Date(p.review_at).toLocaleDateString()}</p>}
                  {p.status === "active" && (
                    <form action={resolveInterventionPlan} className="mt-1 space-y-1">
                      <input type="hidden" name="plan_id" value={p.id} />
                      <input type="text" name="outcome" placeholder="Outcome" className="w-full rounded border border-soft-taupe px-2 py-1 text-xs" />
                      <button type="submit" className="lc-btn-secondary text-xs">Resolve</button>
                    </form>
                  )}
                </Card>
              </li>
            ))}
            {(!plans || plans.length === 0) && <p className="text-sm text-soft-taupe">No intervention plans yet.</p>}
          </ul>

          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-deep-indigo underline">Create intervention plan</summary>
            <form action={createInterventionPlan} className="mt-2 max-w-md space-y-2">
              <select name="client_id" required className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
                <option value="">Select client&hellip;</option>
                {clients?.map((c) => (
                  <option key={c.id} value={c.id}>{orgName(c as unknown as { organizations: unknown } | null)}</option>
                ))}
              </select>
              <select name="trigger_event_id" defaultValue="" className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
                <option value="">No triggering event</option>
                {healthEvents?.filter((h) => h.status === "at_risk").map((h) => (
                  <option key={h.id} value={h.id}>{orgName(h.clients as unknown as { organizations: unknown } | null)} — {new Date(h.calculated_at).toLocaleDateString()}</option>
                ))}
              </select>
              <input type="date" name="review_at" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
              <button type="submit" className="lc-btn-primary">Create plan</button>
            </form>
          </details>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-deep-indigo">Support requests</h2>
          <ul className="mt-3 space-y-2">
            {(requests ?? []).map((r) => (
              <li key={r.id}>
                <Card className="text-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{orgName(r.clients as unknown as { organizations: unknown } | null)}</p>
                    <StatusBadge status={r.priority ?? "normal"} />
                  </div>
                  <p className="text-soft-taupe">{r.summary}</p>
                  <StatusBadge status={r.status} />
                  {r.status !== "resolved" && r.status !== "closed" && (
                    <form action={resolveSupportRequest} className="mt-1">
                      <input type="hidden" name="request_id" value={r.id} />
                      <button type="submit" className="lc-btn-secondary text-xs">Resolve</button>
                    </form>
                  )}
                </Card>
              </li>
            ))}
            {(!requests || requests.length === 0) && <p className="text-sm text-soft-taupe">No support requests yet.</p>}
          </ul>

          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-deep-indigo underline">New support request</summary>
            <form action={createSupportRequest} className="mt-2 max-w-md space-y-2">
              <select name="client_id" required className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
                <option value="">Select client&hellip;</option>
                {clients?.map((c) => (
                  <option key={c.id} value={c.id}>{orgName(c as unknown as { organizations: unknown } | null)}</option>
                ))}
              </select>
              <input type="text" name="category" placeholder="Category" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
              <select name="priority" className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
              <textarea name="summary" placeholder="Summary" rows={2} required className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
              <button type="submit" className="lc-btn-primary">Create request</button>
            </form>
          </details>
        </section>
      </div>
    </div>
  );
}
