import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { Card, PageHeader, StatusBadge } from "@/components/ui";
import { addTechnologyItem } from "./actions";

export default async function TechnologyPage() {
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="p-8">
        <PageHeader title="Technology" />
        <p className="mt-2 text-sm text-soft-taupe">No workspace yet.</p>
      </div>
    );
  }

  const supabase = await createClient();

  const [{ data: items }, { data: vendors }] = await Promise.all([
    supabase.from("technology_items").select("id, product, purpose, cost, cost_cadence, data_classification, renewal_at, vendors(name)").eq("workspace_id", workspaceId).order("product"),
    supabase.from("vendors").select("id, name").eq("workspace_id", workspaceId),
  ]);

  return (
    <div className="p-8">
      <PageHeader
        title="Technology"
        description="Maintain the approved technology stack, ownership, purpose, cost, data role, and retirement plan."
      />

      {items && items.length > 0 ? (
        <ul className="mt-6 space-y-3">
          {items.map((item) => (
            <li key={item.id}>
              <Card className="text-sm">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{item.product}</p>
                  {item.data_classification && <StatusBadge status={item.data_classification} />}
                </div>
                <p className="text-soft-taupe">
                  {(item.vendors as unknown as { name: string } | null)?.name ?? "No vendor"}
                  {item.purpose ? ` · ${item.purpose}` : ""}
                </p>
                <p className="text-xs text-soft-taupe">
                  {item.cost ? `$${item.cost}${item.cost_cadence ? `/${item.cost_cadence}` : ""}` : "No cost recorded"}
                  {item.renewal_at ? ` · renews ${new Date(item.renewal_at).toLocaleDateString()}` : ""}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 text-sm text-soft-taupe">No technology items yet.</p>
      )}

      <details className="mt-6">
        <summary className="cursor-pointer text-sm text-deep-indigo underline">Add technology item</summary>
        <form action={addTechnologyItem} className="mt-2 max-w-md space-y-2">
          <input type="text" name="product" placeholder="Tool or application" required className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <select name="vendor_id" defaultValue="" className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
            <option value="">No vendor</option>
            {vendors?.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
          <input type="text" name="purpose" placeholder="Purpose" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <div className="grid grid-cols-2 gap-2">
            <input type="number" name="cost" placeholder="Cost" step="any" className="rounded border border-soft-taupe px-3 py-2 text-sm" />
            <select name="cost_cadence" defaultValue="" className="rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
              <option value="">Cadence&hellip;</option>
              <option value="monthly">Monthly</option>
              <option value="annual">Annual</option>
            </select>
          </div>
          <select name="data_classification" defaultValue="" className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
            <option value="">Data classification&hellip;</option>
            <option value="public">Public</option>
            <option value="workspace_internal">Workspace internal</option>
            <option value="confidential_business">Confidential business</option>
            <option value="confidential_client">Confidential client</option>
            <option value="restricted_financial_or_legal">Restricted financial or legal</option>
            <option value="restricted_credential_or_secret">Restricted credential or secret</option>
          </select>
          <input type="date" name="renewal_at" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <button type="submit" className="lc-btn-primary">Add item</button>
        </form>
      </details>
    </div>
  );
}
