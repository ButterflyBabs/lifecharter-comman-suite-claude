import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { Card, PageHeader, StatusBadge } from "@/components/ui";
import { createProposal, sendProposal, setProposalStatus } from "./actions";

export default async function ProposalsPage() {
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="p-8">
        <PageHeader title="Proposals" />
        <p className="mt-2 text-sm text-soft-taupe">No workspace yet.</p>
      </div>
    );
  }

  const supabase = await createClient();

  const [{ data: proposals }, { data: opportunities }] = await Promise.all([
    supabase
      .from("proposals")
      .select("id, status, sent_at, expires_at, opportunities(name), proposal_versions!proposals_current_version_id_fkey(version, terms_summary)")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false }),
    supabase.from("opportunities").select("id, name").eq("workspace_id", workspaceId).eq("status", "open"),
  ]);

  return (
    <div className="p-8">
      <PageHeader
        title="Proposals"
        description="Versioned commercial proposals tied to approved offers and discovery records. Sent proposals are immutable — revisions create new versions."
      />

      {proposals && proposals.length > 0 && (
        <ul className="mt-6 space-y-3">
          {proposals.map((p) => {
            const version = p.proposal_versions as unknown as { version: number; terms_summary: string } | null;
            return (
              <li key={p.id}>
                <Card className="text-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">
                      {(p.opportunities as unknown as { name: string } | null)?.name ?? "Untitled opportunity"}
                      {version ? ` · v${version.version}` : ""}
                    </p>
                    <StatusBadge status={p.status} />
                  </div>
                  {version?.terms_summary && <p className="text-soft-taupe">{version.terms_summary}</p>}
                  {p.expires_at && <p className="text-soft-taupe">Expires {new Date(p.expires_at).toLocaleDateString()}</p>}

                  <div className="mt-2 flex gap-2">
                    {p.status === "draft" && (
                      <form action={sendProposal}>
                        <input type="hidden" name="proposal_id" value={p.id} />
                        <button type="submit" className="lc-btn-secondary text-xs">Send</button>
                      </form>
                    )}
                    {(p.status === "sent" || p.status === "viewed") && (
                      <>
                        <form action={setProposalStatus}>
                          <input type="hidden" name="proposal_id" value={p.id} />
                          <input type="hidden" name="status" value="accepted" />
                          <button type="submit" className="lc-btn-secondary text-xs">Mark accepted</button>
                        </form>
                        <form action={setProposalStatus}>
                          <input type="hidden" name="proposal_id" value={p.id} />
                          <input type="hidden" name="status" value="declined" />
                          <button type="submit" className="lc-btn-secondary text-xs">Mark declined</button>
                        </form>
                      </>
                    )}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <details className="mt-6">
        <summary className="cursor-pointer text-sm text-deep-indigo underline">Create proposal</summary>
        <form action={createProposal} className="mt-2 max-w-md space-y-2">
          <select name="opportunity_id" required className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
            <option value="">Select opportunity</option>
            {opportunities?.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
          <textarea name="terms_summary" placeholder="Terms summary" rows={3} className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <input type="date" name="expires_at" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <button type="submit" className="lc-btn-primary">Create proposal</button>
        </form>
      </details>
    </div>
  );
}
