import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { Card, PageHeader, StatusBadge, StatTile, IconBuilding, IconGauge } from "@/components/ui";
import { createBusinessUnit, archiveBusinessUnit, reactivateBusinessUnit } from "./actions";

export default async function BusinessUnitsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="p-8">
        <PageHeader title="Business Units" />
        <p className="mt-2 text-sm text-soft-taupe">No workspace yet.</p>
      </div>
    );
  }

  const supabase = await createClient();

  const [{ data: units }, { data: subscription }] = await Promise.all([
    supabase
      .from("business_units")
      .select("id, name, code, type, status, parent_id")
      .eq("workspace_id", workspaceId)
      .order("name"),
    supabase.from("workspace_subscriptions").select("plan_id, status").eq("workspace_id", workspaceId).maybeSingle(),
  ]);

  let unitLimit: number | null | undefined;
  if (subscription && ["active", "trialing"].includes(subscription.status) && subscription.plan_id) {
    const { data: entitlement } = await supabase
      .from("plan_entitlements")
      .select("limit_value")
      .eq("plan_id", subscription.plan_id)
      .eq("entitlement_key", "business_units")
      .maybeSingle();
    unitLimit = entitlement?.limit_value;
  }

  const activeUnits = (units ?? []).filter((u) => u.status === "active");
  const nameById = new Map((units ?? []).map((u) => [u.id, u.name]));

  return (
    <div className="p-8">
      <PageHeader
        title="Business Units"
        description="Brands, divisions, or operating entities inside this workspace."
      />

      {error && (
        <p role="alert" className="mt-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          {decodeURIComponent(error)}
        </p>
      )}

      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatTile value={activeUnits.length} label="Active business units" icon={<IconBuilding />} />
        <StatTile
          value={unitLimit != null ? `${activeUnits.length} / ${unitLimit}` : unitLimit === null ? "Unlimited" : "No plan limit"}
          label="Plan usage"
          tone={unitLimit != null && activeUnits.length >= unitLimit ? "warning" : "neutral"}
          icon={<IconGauge />}
        />
      </section>

      <ul className="mt-6 space-y-3">
        {(units ?? []).map((u) => (
          <li key={u.id}>
            <Card className="text-sm">
              <div className="flex items-center justify-between">
                <p className="font-medium">{u.name} <span className="text-xs text-soft-taupe">({u.code})</span></p>
                <StatusBadge status={u.status} />
              </div>
              <p className="text-xs text-soft-taupe">
                {u.type ?? "No type set"}
                {u.parent_id ? ` · under ${nameById.get(u.parent_id) ?? "unknown"}` : ""}
              </p>

              <div className="mt-2 flex gap-2">
                {u.status === "active" ? (
                  <form action={archiveBusinessUnit}>
                    <input type="hidden" name="business_unit_id" value={u.id} />
                    <button type="submit" className="lc-btn-secondary text-xs">Archive</button>
                  </form>
                ) : (
                  <form action={reactivateBusinessUnit}>
                    <input type="hidden" name="business_unit_id" value={u.id} />
                    <button type="submit" className="lc-btn-secondary text-xs">Reactivate</button>
                  </form>
                )}
              </div>
            </Card>
          </li>
        ))}
        {(!units || units.length === 0) && <p className="text-sm text-soft-taupe">No business units yet.</p>}
      </ul>

      <details className="mt-6">
        <summary className="cursor-pointer text-sm text-deep-indigo underline">Add business unit</summary>
        <form action={createBusinessUnit} className="mt-2 max-w-md space-y-2">
          <input type="text" name="name" placeholder="Name" required className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <input type="text" name="code" placeholder="Short code (e.g. CORE)" required className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <input type="text" name="type" placeholder="Type (e.g. brand, division)" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <select name="parent_id" defaultValue="" className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
            <option value="">No parent</option>
            {units?.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
          <button type="submit" className="lc-btn-primary">Add</button>
        </form>
      </details>

      <Card className="mt-8 text-sm text-soft-taupe">
        If a plan business-unit limit is reached, adding another active unit
        is blocked at the database layer, the same enforcement pattern as
        seat limits on Settings &rarr; Users.
      </Card>
    </div>
  );
}
