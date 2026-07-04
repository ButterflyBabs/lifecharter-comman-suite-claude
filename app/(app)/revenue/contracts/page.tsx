import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { Card, PageHeader, StatusBadge } from "@/components/ui";
import { createContract, markContractSigned } from "./actions";

export default async function ContractsPage() {
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="p-8">
        <PageHeader title="Contracts" />
        <p className="mt-2 text-sm text-soft-taupe">No workspace yet.</p>
      </div>
    );
  }

  const supabase = await createClient();

  const [{ data: contracts }, { data: opportunities }] = await Promise.all([
    supabase
      .from("contracts")
      .select("id, status, signatory, effective_at, current_version_id, opportunities(name)")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false }),
    supabase.from("opportunities").select("id, name").eq("workspace_id", workspaceId).eq("status", "open"),
  ]);

  return (
    <div className="p-8">
      <PageHeader
        title="Contracts"
        description="Manage agreement templates, versions, signatures, obligations, and renewal dates."
      />

      {contracts && contracts.length > 0 && (
        <ul className="mt-6 space-y-3">
          {contracts.map((c) => (
            <li key={c.id}>
              <Card className="text-sm">
                <div className="flex items-center justify-between">
                  <p className="font-medium">
                    {(c.opportunities as unknown as { name: string } | null)?.name ?? "Untitled opportunity"}
                  </p>
                  <StatusBadge status={c.status} />
                </div>
                {c.signatory && <p className="text-soft-taupe">Signatory: {c.signatory}</p>}
                {c.effective_at && <p className="text-soft-taupe">Effective {new Date(c.effective_at).toLocaleDateString()}</p>}

                {c.status !== "signed" && c.current_version_id && (
                  <form action={markContractSigned} className="mt-2">
                    <input type="hidden" name="contract_id" value={c.id} />
                    <input type="hidden" name="version_id" value={c.current_version_id} />
                    <button type="submit" className="lc-btn-secondary text-xs">Mark signed</button>
                  </form>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}

      <details className="mt-6">
        <summary className="cursor-pointer text-sm text-deep-indigo underline">Create contract</summary>
        <form action={createContract} className="mt-2 max-w-md space-y-2">
          <select name="opportunity_id" className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm" defaultValue="">
            <option value="">No linked opportunity</option>
            {opportunities?.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
          <input type="text" name="signatory" placeholder="Signatory" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <input type="text" name="payment_terms" placeholder="Payment terms" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <textarea name="obligations" placeholder="Obligations" rows={2} className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <button type="submit" className="lc-btn-primary">Create contract</button>
        </form>
      </details>
    </div>
  );
}
