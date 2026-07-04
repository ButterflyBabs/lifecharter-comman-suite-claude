import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { Card, PageHeader, StatusBadge } from "@/components/ui";
import { approveOutput, rejectOutput, returnForRevision, markExecuted } from "./actions";

export default async function ApprovalsPage() {
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="p-8">
        <PageHeader title="AI Approval Queue" />
        <p className="mt-2 text-sm text-soft-taupe">No workspace yet.</p>
      </div>
    );
  }

  const supabase = await createClient();

  const [{ data: pending }, { data: decided }] = await Promise.all([
    supabase
      .from("ai_outputs")
      .select("id, output_type, content, confidence, risk_level, due_at, status, ai_runs(purpose, action_type, ai_agent_versions(ai_agents(name)))")
      .eq("workspace_id", workspaceId)
      .in("status", ["pending_approval", "draft"])
      .order("due_at"),
    supabase
      .from("ai_outputs")
      .select("id, output_type, status, ai_approvals(status, decision_rationale, decided_at)")
      .eq("workspace_id", workspaceId)
      .eq("status", "approved")
      .order("updated_at", { ascending: false })
      .limit(10),
  ]);

  return (
    <div className="p-8">
      <PageHeader
        title="AI Approval Queue"
        description="Review AI-prepared external or high-impact work before action."
      />

      {pending && pending.length > 0 ? (
        <ul className="mt-6 space-y-3">
          {pending.map((o) => {
            const run = o.ai_runs as unknown as { purpose: string | null; action_type: string | null; ai_agent_versions: { ai_agents: { name: string } | null } | null } | null;
            const agentName = run?.ai_agent_versions?.ai_agents?.name ?? "Unknown agent";
            return (
              <li key={o.id}>
                <Card className="text-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{agentName} {run?.action_type ? `— ${run.action_type}` : ""}</p>
                    <div className="flex items-center gap-2">
                      {o.risk_level && <StatusBadge status={o.risk_level} tone={o.risk_level === "high" ? "warning" : "neutral"} />}
                      <StatusBadge status={o.status} />
                    </div>
                  </div>
                  {run?.purpose && <p className="text-soft-taupe">Request: {run.purpose}</p>}
                  {o.content && <p className="mt-1 rounded bg-soft-lavender/10 p-2 text-xs">{o.content}</p>}
                  <p className="mt-1 text-xs text-soft-taupe">
                    {o.confidence ? `Confidence: ${o.confidence}` : ""}
                    {o.due_at ? ` · Due ${new Date(o.due_at).toLocaleDateString()}` : ""}
                  </p>

                  <div className="mt-2 flex flex-wrap gap-2">
                    <form action={approveOutput} className="flex gap-1">
                      <input type="hidden" name="output_id" value={o.id} />
                      <button type="submit" className="lc-btn-primary text-xs">Approve</button>
                    </form>
                    <form action={rejectOutput}>
                      <input type="hidden" name="output_id" value={o.id} />
                      <button type="submit" className="lc-btn-secondary text-xs">Reject</button>
                    </form>
                    <form action={returnForRevision}>
                      <input type="hidden" name="output_id" value={o.id} />
                      <button type="submit" className="lc-btn-secondary text-xs">Return for revision</button>
                    </form>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-6 text-sm text-soft-taupe">Nothing waiting for approval.</p>
      )}

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-deep-indigo">Recently approved</h2>
        <ul className="mt-3 space-y-2">
          {(decided ?? []).map((o) => (
            <li key={o.id}>
              <Card className="flex items-center justify-between text-sm">
                <span>{o.output_type ?? "Output"}</span>
                <div className="flex items-center gap-2">
                  <StatusBadge status={o.status} />
                  <form action={markExecuted}>
                    <input type="hidden" name="output_id" value={o.id} />
                    <button type="submit" className="lc-btn-secondary text-xs">Mark executed</button>
                  </form>
                </div>
              </Card>
            </li>
          ))}
          {(!decided || decided.length === 0) && <p className="text-sm text-soft-taupe">Nothing approved yet.</p>}
        </ul>
      </section>

      <Card className="mt-8 text-sm text-soft-taupe">
        An output that requires approval can never be marked approved or
        executed without a matching approved decision on record — enforced at
        the database layer (Appendix C&apos;s Human Approval Matrix), not just in
        this UI.
      </Card>
    </div>
  );
}
