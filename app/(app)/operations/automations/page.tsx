import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { Card, PageHeader, StatusBadge } from "@/components/ui";
import { createAutomation, claimAutomationOwner, recordTestRun, toggleAutomationEnabled } from "./actions";

export default async function AutomationsPage() {
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="p-8">
        <PageHeader title="Systems and Automations" />
        <p className="mt-2 text-sm text-soft-taupe">No workspace yet.</p>
      </div>
    );
  }

  const supabase = await createClient();

  const [{ data: automations }, { data: sops }] = await Promise.all([
    supabase
      .from("automation_definitions")
      .select("id, name, automation_trigger, risk_level, enabled, owner_user_id, idempotency_strategy, sop_id, exception_note, automation_runs(id, status)")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false }),
    supabase.from("sops").select("id, name").eq("workspace_id", workspaceId),
  ]);

  return (
    <div className="p-8">
      <PageHeader
        title="Systems and Automations"
        description="Configure automations with triggers, conditions, ownership, approval, run history, and safe recovery."
      />

      {automations && automations.length > 0 ? (
        <div className="mt-6 space-y-4">
          {automations.map((a) => {
            const hasOwner = a.owner_user_id !== null;
            const hasIdempotency = Boolean(a.idempotency_strategy);
            const hasPassingTest = (a.automation_runs ?? []).some((r) => r.status === "test_passed");
            const readyToEnable = hasOwner && hasIdempotency && hasPassingTest;

            return (
              <Card key={a.id}>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-deep-indigo">{a.name}</h2>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={a.risk_level} tone={a.risk_level === "high" ? "warning" : "neutral"} />
                    <StatusBadge status={a.enabled ? "active" : "not_started"} />
                  </div>
                </div>
                {a.automation_trigger && <p className="text-sm text-soft-taupe">Trigger: {a.automation_trigger}</p>}
                {!a.sop_id && !a.exception_note && (
                  <p className="mt-1 text-xs text-soft-taupe">No linked SOP or documented exception yet.</p>
                )}

                <ul className="mt-2 space-y-1 text-xs">
                  <li>{hasOwner ? "✓" : "○"} Owner assigned</li>
                  <li>{hasIdempotency ? "✓" : "○"} Idempotency strategy documented</li>
                  <li>{hasPassingTest ? "✓" : "○"} Passing test run on record</li>
                </ul>

                <div className="mt-2 flex flex-wrap gap-2">
                  {!hasOwner && (
                    <form action={claimAutomationOwner}>
                      <input type="hidden" name="automation_id" value={a.id} />
                      <button type="submit" className="lc-btn-secondary text-xs">Claim ownership</button>
                    </form>
                  )}
                  {!hasPassingTest && (
                    <form action={recordTestRun}>
                      <input type="hidden" name="automation_id" value={a.id} />
                      <button type="submit" className="lc-btn-secondary text-xs">Record passing test run</button>
                    </form>
                  )}
                  {!a.enabled && readyToEnable && (
                    <form action={toggleAutomationEnabled}>
                      <input type="hidden" name="automation_id" value={a.id} />
                      <input type="hidden" name="next_enabled" value="true" />
                      <button type="submit" className="lc-btn-primary text-xs">Enable</button>
                    </form>
                  )}
                  {a.enabled && (
                    <form action={toggleAutomationEnabled}>
                      <input type="hidden" name="automation_id" value={a.id} />
                      <input type="hidden" name="next_enabled" value="false" />
                      <button type="submit" className="lc-btn-secondary text-xs">Pause</button>
                    </form>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <p className="mt-6 text-sm text-soft-taupe">No automations yet.</p>
      )}

      <details className="mt-6">
        <summary className="cursor-pointer text-sm text-deep-indigo underline">Create automation</summary>
        <form action={createAutomation} className="mt-2 max-w-md space-y-2">
          <input type="text" name="name" placeholder="Automation name" required className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <input type="text" name="automation_trigger" placeholder="Trigger" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <select name="risk_level" className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
            <option value="low">Low risk</option>
            <option value="medium">Medium risk</option>
            <option value="high">High risk</option>
          </select>
          <input type="text" name="idempotency_strategy" placeholder="Idempotency strategy (optional now)" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <select name="sop_id" defaultValue="" className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
            <option value="">No linked SOP</option>
            {sops?.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <input type="text" name="exception_note" placeholder="Documented exception (if no SOP)" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <button type="submit" className="lc-btn-primary">Create automation</button>
        </form>
      </details>

      <Card className="mt-6 text-sm text-soft-taupe">
        No automation can be enabled without an owner, a documented idempotency
        strategy, and a passing test run — enforced at the database layer
        (Section 6&apos;s stated gate), not just in this UI.
      </Card>
    </div>
  );
}
