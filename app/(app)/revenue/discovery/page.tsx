import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { Card, PageHeader, StatusBadge } from "@/components/ui";
import { scheduleDiscoverySession, completeDiscoverySession } from "./actions";

export default async function DiscoveryPage() {
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="p-8">
        <PageHeader title="Discovery" />
        <p className="mt-2 text-sm text-soft-taupe">No workspace yet.</p>
      </div>
    );
  }

  const supabase = await createClient();

  const [{ data: sessions }, { data: opportunities }] = await Promise.all([
    supabase
      .from("discovery_sessions")
      .select("id, opportunity_id, appointment_at, current_state, desired_state, fit_status, next_action, status, opportunities(name)")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false }),
    supabase.from("opportunities").select("id, name").eq("workspace_id", workspaceId).eq("status", "open"),
  ]);

  return (
    <div className="p-8">
      <PageHeader
        title="Discovery"
        description="Prepare, conduct, document, and qualify sales conversations without delivering the full paid work before commitment."
      />

      {sessions && sessions.length > 0 && (
        <ul className="mt-6 space-y-3">
          {sessions.map((s) => (
            <li key={s.id}>
              <Card className="text-sm">
                <div className="flex items-center justify-between">
                  <p className="font-medium">
                    {(s.opportunities as unknown as { name: string } | null)?.name ?? "Untitled opportunity"}
                  </p>
                  <StatusBadge status={s.status} />
                </div>
                <p className="text-soft-taupe">
                  {s.appointment_at ? new Date(s.appointment_at).toLocaleString() : "Not scheduled"}
                </p>
                {s.current_state && <p className="mt-1">Current: {s.current_state}</p>}
                {s.desired_state && <p>Desired: {s.desired_state}</p>}
                {s.fit_status && <p className="mt-1">Fit: {s.fit_status.replace("_", " ")}</p>}
                {s.next_action && <p>Next: {s.next_action}</p>}

                {s.status !== "completed" && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-deep-indigo underline">Complete session</summary>
                    <form action={completeDiscoverySession} className="mt-2 space-y-2">
                      <input type="hidden" name="session_id" value={s.id} />
                      <select name="fit_status" required className="w-full rounded border border-soft-taupe bg-ivory-light px-2 py-1 text-xs">
                        <option value="fit">Fit</option>
                        <option value="not_fit">Not fit</option>
                        <option value="undetermined">Undetermined</option>
                      </select>
                      <input type="text" name="next_action" placeholder="Next action" required className="w-full rounded border border-soft-taupe px-2 py-1 text-xs" />
                      <button type="submit" className="lc-btn-secondary text-xs">Mark complete</button>
                    </form>
                  </details>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}

      <details className="mt-6">
        <summary className="cursor-pointer text-sm text-deep-indigo underline">Schedule discovery session</summary>
        <form action={scheduleDiscoverySession} className="mt-2 max-w-md space-y-2">
          <select name="opportunity_id" required className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
            <option value="">Select opportunity</option>
            {opportunities?.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
          <input type="datetime-local" name="appointment_at" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <textarea name="preparation_brief" placeholder="Preparation brief" rows={2} className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <textarea name="current_state" placeholder="Current situation" rows={2} className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <textarea name="desired_state" placeholder="Desired outcome" rows={2} className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <input type="text" name="timing" placeholder="Timeline" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <input type="text" name="budget_status" placeholder="Budget status" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <button type="submit" className="lc-btn-primary">Schedule session</button>
        </form>
      </details>
    </div>
  );
}
