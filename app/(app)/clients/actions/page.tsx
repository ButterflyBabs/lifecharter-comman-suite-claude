import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { Card, PageHeader, StatusBadge } from "@/components/ui";
import { addClientAction, addCoachAction, updateClientActionStatus, updateCoachActionStatus } from "./actions";

export default async function ActionsPage() {
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="p-8">
        <PageHeader title="Actions and Accountability" />
        <p className="mt-2 text-sm text-soft-taupe">No workspace yet.</p>
      </div>
    );
  }

  const supabase = await createClient();

  const [{ data: clientActions }, { data: coachActions }, { data: clients }] = await Promise.all([
    supabase
      .from("client_actions")
      .select("id, title, due_at, status, client_visible, reschedule_count, clients(organizations(name))")
      .eq("workspace_id", workspaceId)
      .order("due_at", { ascending: true }),
    supabase
      .from("coach_actions")
      .select("id, title, due_at, status, clients(organizations(name))")
      .eq("workspace_id", workspaceId)
      .order("due_at", { ascending: true }),
    supabase.from("clients").select("id, organizations(name)").eq("workspace_id", workspaceId),
  ]);

  const orgName = (c: { organizations: unknown } | null) => (c?.organizations as { name: string } | null)?.name ?? "Untitled client";

  return (
    <div className="p-8">
      <PageHeader
        title="Actions and Accountability"
        description="Client-facing commitments and internal coach follow-ups, with visible reschedule history."
      />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section>
          <h2 className="text-lg font-semibold text-deep-indigo">Client actions</h2>
          <ul className="mt-3 space-y-2">
            {(clientActions ?? []).map((a) => (
              <li key={a.id}>
                <Card className="text-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{a.title}</p>
                    <StatusBadge status={a.status} />
                  </div>
                  <p className="text-soft-taupe">{orgName(a.clients as unknown as { organizations: unknown } | null)}</p>
                  {a.due_at && <p className="text-xs text-soft-taupe">Due {new Date(a.due_at).toLocaleDateString()}{a.reschedule_count > 0 ? ` · rescheduled ${a.reschedule_count}x` : ""}</p>}
                  {a.status === "open" && (
                    <form action={updateClientActionStatus} className="mt-1 flex gap-2">
                      <input type="hidden" name="action_id" value={a.id} />
                      <button type="submit" name="next_status" value="done" formAction={updateClientActionStatus} className="lc-btn-secondary text-xs">Done</button>
                      <button type="submit" name="next_status" value="skipped" formAction={updateClientActionStatus} className="lc-btn-secondary text-xs">Skip</button>
                    </form>
                  )}
                </Card>
              </li>
            ))}
            {(!clientActions || clientActions.length === 0) && <p className="text-sm text-soft-taupe">No client actions yet.</p>}
          </ul>

          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-deep-indigo underline">Add client action</summary>
            <form action={addClientAction} className="mt-2 max-w-md space-y-2">
              <select name="client_id" required className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
                <option value="">Select client&hellip;</option>
                {clients?.map((c) => (
                  <option key={c.id} value={c.id}>{orgName(c as unknown as { organizations: unknown } | null)}</option>
                ))}
              </select>
              <input type="text" name="title" placeholder="Action title" required className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
              <textarea name="description" placeholder="Description" rows={2} className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
              <input type="date" name="due_at" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
              <label className="flex items-center gap-1 text-xs">
                <input type="checkbox" name="client_visible" defaultChecked /> Client visible
              </label>
              <button type="submit" className="lc-btn-primary">Add action</button>
            </form>
          </details>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-deep-indigo">Coach actions</h2>
          <ul className="mt-3 space-y-2">
            {(coachActions ?? []).map((a) => (
              <li key={a.id}>
                <Card className="text-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{a.title}</p>
                    <StatusBadge status={a.status} />
                  </div>
                  <p className="text-soft-taupe">{orgName(a.clients as unknown as { organizations: unknown } | null)}</p>
                  {a.due_at && <p className="text-xs text-soft-taupe">Due {new Date(a.due_at).toLocaleDateString()}</p>}
                  {a.status === "open" && (
                    <form action={updateCoachActionStatus} className="mt-1">
                      <input type="hidden" name="action_id" value={a.id} />
                      <input type="hidden" name="next_status" value="done" />
                      <button type="submit" className="lc-btn-secondary text-xs">Done</button>
                    </form>
                  )}
                </Card>
              </li>
            ))}
            {(!coachActions || coachActions.length === 0) && <p className="text-sm text-soft-taupe">No coach actions yet.</p>}
          </ul>

          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-deep-indigo underline">Add coach action</summary>
            <form action={addCoachAction} className="mt-2 max-w-md space-y-2">
              <select name="client_id" required className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
                <option value="">Select client&hellip;</option>
                {clients?.map((c) => (
                  <option key={c.id} value={c.id}>{orgName(c as unknown as { organizations: unknown } | null)}</option>
                ))}
              </select>
              <input type="text" name="title" placeholder="Action title" required className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
              <input type="date" name="due_at" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
              <button type="submit" className="lc-btn-primary">Add action</button>
            </form>
          </details>
        </section>
      </div>
    </div>
  );
}
