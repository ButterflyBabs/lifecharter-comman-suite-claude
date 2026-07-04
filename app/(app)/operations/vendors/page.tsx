import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { Card, PageHeader, StatusBadge } from "@/components/ui";
import { addVendor, updateVendorStatus } from "./actions";

export default async function VendorsPage() {
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="p-8">
        <PageHeader title="Vendors" />
        <p className="mt-2 text-sm text-soft-taupe">No workspace yet.</p>
      </div>
    );
  }

  const supabase = await createClient();

  const { data: vendors } = await supabase
    .from("vendors")
    .select("id, name, category, service, cost, renewal_at, risk_rating, criticality, backup_plan, status")
    .eq("workspace_id", workspaceId)
    .order("renewal_at");

  return (
    <div className="p-8">
      <PageHeader
        title="Vendors"
        description="Manage external providers, agreements, contacts, costs, renewals, service quality, and dependencies."
      />

      {vendors && vendors.length > 0 ? (
        <ul className="mt-6 space-y-3">
          {vendors.map((v) => (
            <li key={v.id}>
              <Card className="text-sm">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{v.name}</p>
                  <div className="flex items-center gap-2">
                    {v.criticality === "critical" && <StatusBadge status="critical" tone="warning" />}
                    <StatusBadge status={v.status} />
                  </div>
                </div>
                <p className="text-soft-taupe">{v.category} {v.service ? `· ${v.service}` : ""}</p>
                <p className="text-xs text-soft-taupe">
                  {v.cost ? `$${v.cost}` : "No cost recorded"}
                  {v.renewal_at ? ` · renews ${new Date(v.renewal_at).toLocaleDateString()}` : ""}
                  {v.risk_rating ? ` · risk: ${v.risk_rating}` : ""}
                </p>
                {v.criticality === "critical" && !v.backup_plan && (
                  <p className="text-xs text-soft-taupe">No backup or contingency plan documented.</p>
                )}
                {v.status === "active" && (
                  <form action={updateVendorStatus} className="mt-1">
                    <input type="hidden" name="vendor_id" value={v.id} />
                    <input type="hidden" name="next_status" value="under_review" />
                    <button type="submit" className="lc-btn-secondary text-xs">Flag for review</button>
                  </form>
                )}
              </Card>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 text-sm text-soft-taupe">No vendors yet.</p>
      )}

      <details className="mt-6">
        <summary className="cursor-pointer text-sm text-deep-indigo underline">Add vendor</summary>
        <form action={addVendor} className="mt-2 max-w-md space-y-2">
          <input type="text" name="name" placeholder="Vendor name" required className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <input type="text" name="category" placeholder="Category" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <input type="text" name="service" placeholder="Service" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <input type="number" name="cost" placeholder="Cost" step="any" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <input type="date" name="renewal_at" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <select name="risk_rating" defaultValue="" className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
            <option value="">Risk rating&hellip;</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <select name="criticality" className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
            <option value="standard">Standard</option>
            <option value="important">Important</option>
            <option value="critical">Critical</option>
          </select>
          <textarea name="backup_plan" placeholder="Backup or contingency plan" rows={2} className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <button type="submit" className="lc-btn-primary">Add vendor</button>
        </form>
      </details>
    </div>
  );
}
