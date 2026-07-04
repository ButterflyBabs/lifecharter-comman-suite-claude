import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { decideApproval, decideApprovalsBatch } from "./actions";
import { Card, PageHeader, StatusBadge } from "@/components/ui";

export default async function ApprovalsPage() {
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-semibold text-deep-indigo">Approvals</h1>
        <p className="mt-2 text-sm text-soft-taupe">
          No workspace yet. The guided setup wizard (Section 18, Phase 2) will create one.
        </p>
      </div>
    );
  }

  const supabase = await createClient();
  const { data: approvals } = await supabase
    .from("approvals")
    .select("id, subject_type, subject_id, approval_type, status, comment, created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  const pending = approvals?.filter((a) => a.status === "pending") ?? [];
  const decided = approvals?.filter((a) => a.status !== "pending") ?? [];

  return (
    <div className="p-8">
      <PageHeader
        title="Approval Queue"
        description="Central review queue for AI drafts, external messages, content, pricing, contracts,
        payments, refunds, and automation changes (Section 14.3). High-risk AI actions always
        land here rather than executing automatically (Appendix C)."
      />

      <section className="mt-6">
        <h2 className="text-lg font-semibold text-deep-indigo">Pending</h2>
        {pending.length > 0 ? (
          <>
            {/* Empty form, referenced by each row's checkbox via the `form`
                attribute below — HTML lets an input outside a <form>'s DOM
                subtree still submit with it by id, which avoids nesting this
                inside each row's own per-row approve/reject forms. */}
            <form id="batch-approvals-form" className="mt-2 flex gap-2">
              <button
                type="submit"
                formAction={decideApprovalsBatch.bind(null, "approved")}
                className="lc-btn-secondary text-xs"
              >
                Approve selected
              </button>
              <button
                type="submit"
                formAction={decideApprovalsBatch.bind(null, "rejected")}
                className="lc-btn-secondary text-xs"
              >
                Reject selected
              </button>
            </form>

            <ul className="mt-2 space-y-2">
              {pending.map((a) => {
                const label = `${a.approval_type} for ${a.subject_type}`;
                return (
                  <li key={a.id}>
                    <Card className="text-sm">
                      <label className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          name="approval_ids"
                          value={a.id}
                          form="batch-approvals-form"
                          aria-label={`Select ${label} for batch decision`}
                          className="mt-1"
                        />
                        <span>
                          <p className="font-medium">{label}</p>
                          {a.comment && <p className="text-soft-taupe">{a.comment}</p>}
                        </span>
                      </label>

                      <div className="mt-2 flex gap-2">
                        <form action={decideApproval.bind(null, a.id, "approved")}>
                          <button
                            type="submit"
                            className="rounded bg-sacred-teal px-3 py-1 text-xs text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-deep-indigo"
                          >
                            Approve {label}
                          </button>
                        </form>
                        <form action={decideApproval.bind(null, a.id, "rejected")}>
                          <button type="submit" className="lc-btn-secondary text-xs">
                            Reject {label}
                          </button>
                        </form>
                      </div>
                    </Card>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <p className="mt-2 text-sm text-soft-taupe">Nothing waiting for a decision.</p>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-deep-indigo">Recently decided</h2>
        {decided.length > 0 ? (
          <ul className="mt-2 space-y-2">
            {decided.map((a) => (
              <li key={a.id}>
                <Card className="flex items-center justify-between text-sm">
                  <p className="font-medium">
                    {a.approval_type} — {a.subject_type}
                  </p>
                  <StatusBadge status={a.status} />
                </Card>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-soft-taupe">No decisions recorded yet.</p>
        )}
      </section>
    </div>
  );
}
