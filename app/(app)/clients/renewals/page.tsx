import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { Card, PageHeader, StatusBadge } from "@/components/ui";
import { createRenewalOpportunity, closeRenewalOpportunity, startOffboarding, completeOffboarding } from "./actions";

export default async function RenewalsPage() {
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="p-8">
        <PageHeader title="Renewals" />
        <p className="mt-2 text-sm text-soft-taupe">No workspace yet.</p>
      </div>
    );
  }

  const supabase = await createClient();

  const [{ data: renewals }, { data: offboardings }, { data: clients }, { data: offers }] = await Promise.all([
    supabase.from("renewal_opportunities").select("id, status, recommended_path, contract_end_date, review_at, close_reason, clients(organizations(name))").eq("workspace_id", workspaceId).order("review_at"),
    supabase.from("offboarding_instances").select("id, reason, completed_at, created_at, clients(organizations(name))").eq("workspace_id", workspaceId).order("created_at", { ascending: false }),
    supabase.from("clients").select("id, organizations(name)").eq("workspace_id", workspaceId).neq("status", "former"),
    supabase.from("offers").select("id, name").eq("workspace_id", workspaceId),
  ]);

  const orgName = (c: { organizations: unknown } | null) => (c?.organizations as { name: string } | null)?.name ?? "Untitled client";

  return (
    <div className="p-8">
      <PageHeader
        title="Renewals"
        description="Track upcoming contract ends, recommended paths, and graceful offboarding when a relationship closes."
      />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section>
          <h2 className="text-lg font-semibold text-deep-indigo">Renewal opportunities</h2>
          <ul className="mt-3 space-y-2">
            {(renewals ?? []).map((r) => (
              <li key={r.id}>
                <Card className="text-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{orgName(r.clients as unknown as { organizations: unknown } | null)}</p>
                    <StatusBadge status={r.status} />
                  </div>
                  {r.recommended_path && <p className="text-soft-taupe">Recommended: {r.recommended_path}</p>}
                  {r.contract_end_date && <p className="text-xs text-soft-taupe">Contract ends {new Date(r.contract_end_date).toLocaleDateString()}</p>}
                  {r.status === "pending" || r.status === "in_conversation" ? (
                    <form action={closeRenewalOpportunity} className="mt-1 flex gap-2">
                      <input type="hidden" name="renewal_id" value={r.id} />
                      <button type="submit" name="next_status" value="won" formAction={closeRenewalOpportunity} className="lc-btn-secondary text-xs">Won</button>
                      <button type="submit" name="next_status" value="lost" formAction={closeRenewalOpportunity} className="lc-btn-secondary text-xs">Lost</button>
                    </form>
                  ) : null}
                </Card>
              </li>
            ))}
            {(!renewals || renewals.length === 0) && <p className="text-sm text-soft-taupe">No renewal opportunities yet.</p>}
          </ul>

          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-deep-indigo underline">Create renewal opportunity</summary>
            <form action={createRenewalOpportunity} className="mt-2 max-w-md space-y-2">
              <select name="client_id" required className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
                <option value="">Select client&hellip;</option>
                {clients?.map((c) => (
                  <option key={c.id} value={c.id}>{orgName(c as unknown as { organizations: unknown } | null)}</option>
                ))}
              </select>
              <select name="recommended_offer_id" defaultValue="" className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
                <option value="">No recommended offer</option>
                {offers?.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
              <select name="recommended_path" defaultValue="" className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
                <option value="">No recommendation yet</option>
                <option value="renew">Renew</option>
                <option value="expand">Expand</option>
                <option value="complete">Complete</option>
                <option value="pause">Pause</option>
                <option value="refer">Refer</option>
              </select>
              <input type="date" name="contract_end_date" placeholder="Contract end date" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
              <input type="date" name="review_at" placeholder="Review date" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
              <button type="submit" className="lc-btn-primary">Create</button>
            </form>
          </details>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-deep-indigo">Offboarding</h2>
          <ul className="mt-3 space-y-2">
            {(offboardings ?? []).map((o) => (
              <li key={o.id}>
                <Card className="text-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{orgName(o.clients as unknown as { organizations: unknown } | null)}</p>
                    <StatusBadge status={o.completed_at ? "completed" : "in_progress"} />
                  </div>
                  {o.reason && <p className="text-soft-taupe">{o.reason}</p>}
                  {!o.completed_at && (
                    <form action={completeOffboarding} className="mt-1">
                      <input type="hidden" name="instance_id" value={o.id} />
                      <button type="submit" className="lc-btn-secondary text-xs">Mark complete</button>
                    </form>
                  )}
                </Card>
              </li>
            ))}
            {(!offboardings || offboardings.length === 0) && <p className="text-sm text-soft-taupe">No offboarding in progress.</p>}
          </ul>

          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-deep-indigo underline">Start offboarding</summary>
            <form action={startOffboarding} className="mt-2 max-w-md space-y-2">
              <select name="client_id" required className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
                <option value="">Select client&hellip;</option>
                {clients?.map((c) => (
                  <option key={c.id} value={c.id}>{orgName(c as unknown as { organizations: unknown } | null)}</option>
                ))}
              </select>
              <input type="text" name="reason" placeholder="Reason" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
              <textarea name="archive_rules" placeholder="Archive rules" rows={2} className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
              <button type="submit" className="lc-btn-primary">Start offboarding</button>
            </form>
          </details>
        </section>
      </div>
    </div>
  );
}
