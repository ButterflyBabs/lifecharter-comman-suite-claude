import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { Card, PageHeader, StatusBadge } from "@/components/ui";

// Two objects already own "agreement" content with real versioning:
// legal_documents (internal policies, master terms — Operations -> Legal
// and Risk, Phase 6) and contracts (signed, opportunity-linked client
// agreements — Revenue -> Contracts, Phase 4). Rather than fork a third
// store for the same concept, this Library section is a combined,
// read-only index linking back to both.

export default async function Page() {
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="p-8">
        <PageHeader title="Agreements" />
        <p className="mt-2 text-sm text-soft-taupe">No workspace yet.</p>
      </div>
    );
  }

  const supabase = await createClient();
  const [{ data: documents }, { data: contracts }] = await Promise.all([
    supabase.from("legal_documents").select("id, name, document_type, status, review_at").eq("workspace_id", workspaceId).order("name"),
    supabase.from("contracts").select("id, status, signatory, effective_at, opportunities(name)").eq("workspace_id", workspaceId).order("created_at", { ascending: false }),
  ]);

  return (
    <div className="p-8">
      <PageHeader
        title="Agreements"
        description="Combined index of internal legal documents and client contracts."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section>
          <h2 className="text-lg font-semibold text-deep-indigo">Legal documents</h2>
          <ul className="mt-3 space-y-2">
            {(documents ?? []).map((d) => (
              <li key={d.id}>
                <Card className="text-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{d.name}</p>
                    <StatusBadge status={d.status} />
                  </div>
                  {d.document_type && <p className="text-soft-taupe">{d.document_type}</p>}
                  {d.review_at && <p className="text-xs text-soft-taupe">Review by {new Date(d.review_at).toLocaleDateString()}</p>}
                </Card>
              </li>
            ))}
            {(!documents || documents.length === 0) && <p className="text-sm text-soft-taupe">No legal documents yet.</p>}
          </ul>
          <p className="mt-3 text-sm">
            <Link href="/operations/legal-risk" className="text-deep-indigo underline">
              Manage legal documents in Operations
            </Link>
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-deep-indigo">Client contracts</h2>
          <ul className="mt-3 space-y-2">
            {(contracts ?? []).map((c) => {
              const opportunity = c.opportunities as unknown as { name: string } | null;
              return (
                <li key={c.id}>
                  <Card className="text-sm">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{opportunity?.name ?? "Untitled opportunity"}</p>
                      <StatusBadge status={c.status} />
                    </div>
                    {c.signatory && <p className="text-soft-taupe">{c.signatory}</p>}
                    {c.effective_at && <p className="text-xs text-soft-taupe">Effective {new Date(c.effective_at).toLocaleDateString()}</p>}
                  </Card>
                </li>
              );
            })}
            {(!contracts || contracts.length === 0) && <p className="text-sm text-soft-taupe">No contracts yet.</p>}
          </ul>
          <p className="mt-3 text-sm">
            <Link href="/revenue/contracts" className="text-deep-indigo underline">
              Manage contracts in Revenue
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
