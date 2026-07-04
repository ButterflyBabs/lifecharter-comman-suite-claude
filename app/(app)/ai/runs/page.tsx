import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { Card, PageHeader, StatusBadge } from "@/components/ui";
import { recordRunWithOutput } from "./actions";

export default async function RunsPage() {
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="p-8">
        <PageHeader title="Run History" />
        <p className="mt-2 text-sm text-soft-taupe">No workspace yet.</p>
      </div>
    );
  }

  const supabase = await createClient();

  const [{ data: runs }, { data: agentVersions }] = await Promise.all([
    supabase
      .from("ai_runs")
      .select("id, purpose, action_type, status, cost, started_at, completed_at, error_message, ai_agent_versions(model, provider, permission_level, ai_agents(name)), ai_outputs(id, status, confidence)")
      .eq("workspace_id", workspaceId)
      .order("started_at", { ascending: false })
      .limit(30),
    supabase.from("ai_agent_versions").select("id, version, model, permission_level, ai_agents(name)").eq("workspace_id", workspaceId),
  ]);

  return (
    <div className="p-8">
      <PageHeader
        title="Run History"
        description="Auditability for AI requests, inputs, sources, outputs, cost, latency, errors, and human decisions."
      />

      {runs && runs.length > 0 ? (
        <ul className="mt-6 space-y-3">
          {runs.map((r) => {
            const agentVersion = r.ai_agent_versions as unknown as { model: string | null; provider: string | null; permission_level: string; ai_agents: { name: string } | null } | null;
            const outputs = r.ai_outputs ?? [];
            return (
              <li key={r.id}>
                <Card className="text-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{agentVersion?.ai_agents?.name ?? "Unknown agent"} {r.action_type ? `— ${r.action_type}` : ""}</p>
                    <StatusBadge status={r.status} />
                  </div>
                  {r.purpose && <p className="text-soft-taupe">{r.purpose}</p>}
                  <p className="text-xs text-soft-taupe">
                    {agentVersion?.provider ?? ""} {agentVersion?.model ?? ""} · started {new Date(r.started_at).toLocaleString()}
                    {r.cost ? ` · $${r.cost}` : ""}
                  </p>
                  {r.error_message && <p className="text-xs text-red-700 dark:text-red-200">{r.error_message}</p>}
                  {outputs.length > 0 && (
                    <ul className="mt-1 space-y-1">
                      {outputs.map((o) => (
                        <li key={o.id} className="flex items-center gap-2 text-xs">
                          <StatusBadge status={o.status} />
                          {o.confidence && <span className="text-soft-taupe">confidence: {o.confidence}</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-6 text-sm text-soft-taupe">No runs recorded yet.</p>
      )}

      <details className="mt-6">
        <summary className="cursor-pointer text-sm text-deep-indigo underline">Record AI work for review</summary>
        <form action={recordRunWithOutput} className="mt-2 max-w-md space-y-2">
          <select name="agent_version_id" required className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
            <option value="">Select agent&hellip;</option>
            {agentVersions?.map((v) => (
              <option key={v.id} value={v.id}>
                {(v.ai_agents as unknown as { name: string } | null)?.name ?? "Agent"} (v{v.version}) — {v.permission_level.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <input type="text" name="purpose" placeholder="Purpose / request" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <input type="text" name="action_type" placeholder="Action type" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <select name="output_type" className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
            <option value="draft_message">Draft message</option>
            <option value="summary">Summary</option>
            <option value="recommendation">Recommendation</option>
            <option value="analysis">Analysis</option>
          </select>
          <textarea name="content" placeholder="Output content" rows={3} className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <select name="confidence" defaultValue="" className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
            <option value="">Confidence&hellip;</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <select name="risk_level" defaultValue="" className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
            <option value="">Risk level&hellip;</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <input type="date" name="due_at" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <input type="number" name="cost" placeholder="Cost" step="any" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <button type="submit" className="lc-btn-primary">Record</button>
        </form>
      </details>

      <Card className="mt-6 text-sm text-soft-taupe">
        No live model calls happen in this build — this form records AI work
        manually so it flows through the same run history, output, and
        approval-gate tables a live agent would use, keeping the governance
        layer real and testable ahead of any actual model integration.
      </Card>
    </div>
  );
}
