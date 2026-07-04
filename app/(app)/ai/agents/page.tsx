import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { Card, PageHeader, StatusBadge } from "@/components/ui";
import { seedRecommendedAgents, createAgent, addAgentVersion, updateAgentStatus } from "./actions";

export default async function AgentsPage() {
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="p-8">
        <PageHeader title="Agent Roster" />
        <p className="mt-2 text-sm text-soft-taupe">No workspace yet.</p>
      </div>
    );
  }

  const supabase = await createClient();

  const { data: agents } = await supabase
    .from("ai_agents")
    .select("id, name, purpose, status, current_version_id, ai_agent_versions(id, version, model, provider, permission_level, capabilities, allowed_data, prohibited_actions, retention_policy)")
    .eq("workspace_id", workspaceId)
    .order("created_at");

  return (
    <div className="p-8">
      <PageHeader
        title="Agent Roster"
        description="Each agent&rsquo;s instructions, capabilities, allowed data, prohibited actions, and approval policy."
      />

      {(!agents || agents.length === 0) && (
        <details className="mt-4" open>
          <summary className="cursor-pointer text-sm text-deep-indigo underline">Seed the 10 recommended agents</summary>
          <form action={seedRecommendedAgents} className="mt-2">
            <button type="submit" className="lc-btn-primary">Seed recommended agents</button>
          </form>
        </details>
      )}

      {agents && agents.length > 0 ? (
        <div className="mt-6 space-y-4">
          {agents.map((a) => {
            const versions = (a.ai_agent_versions ?? []).slice().sort((v1, v2) => v2.version - v1.version);
            const current = versions.find((v) => v.id === a.current_version_id) ?? versions[0];
            return (
              <Card key={a.id}>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-deep-indigo">{a.name}</h2>
                  <div className="flex items-center gap-2">
                    {current && <StatusBadge status={current.permission_level} />}
                    <StatusBadge status={a.status} />
                  </div>
                </div>
                {a.purpose && <p className="text-sm text-soft-taupe">{a.purpose}</p>}

                {current && (
                  <div className="mt-2 rounded bg-soft-lavender/10 p-2 text-xs text-soft-taupe">
                    <p>Version {current.version}{current.model ? ` — ${current.provider ?? ""} ${current.model}` : ""}</p>
                    {current.capabilities && <p>Capabilities: {current.capabilities}</p>}
                    {current.allowed_data && <p>Allowed data: {current.allowed_data}</p>}
                    {current.prohibited_actions && <p>Prohibited: {current.prohibited_actions}</p>}
                    {current.retention_policy && <p>Retention: {current.retention_policy}</p>}
                  </div>
                )}

                <div className="mt-2 flex flex-wrap gap-2">
                  {a.status === "draft" && (
                    <form action={updateAgentStatus}>
                      <input type="hidden" name="agent_id" value={a.id} />
                      <input type="hidden" name="next_status" value="active" />
                      <button type="submit" className="lc-btn-secondary text-xs">Activate</button>
                    </form>
                  )}
                  {a.status === "active" && (
                    <form action={updateAgentStatus}>
                      <input type="hidden" name="agent_id" value={a.id} />
                      <input type="hidden" name="next_status" value="paused" />
                      <button type="submit" className="lc-btn-secondary text-xs">Pause</button>
                    </form>
                  )}
                </div>

                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-deep-indigo underline">Configure new version</summary>
                  <form action={addAgentVersion} className="mt-1 max-w-md space-y-1">
                    <input type="hidden" name="agent_id" value={a.id} />
                    <input type="text" name="model" placeholder="Model" className="w-full rounded border border-soft-taupe px-2 py-1 text-xs" />
                    <input type="text" name="provider" placeholder="Provider" className="w-full rounded border border-soft-taupe px-2 py-1 text-xs" />
                    <textarea name="system_prompt" placeholder="Instructions" rows={2} className="w-full rounded border border-soft-taupe px-2 py-1 text-xs" />
                    <input type="text" name="capabilities" placeholder="Capabilities" className="w-full rounded border border-soft-taupe px-2 py-1 text-xs" />
                    <input type="text" name="allowed_data" placeholder="Allowed data" className="w-full rounded border border-soft-taupe px-2 py-1 text-xs" />
                    <input type="text" name="prohibited_actions" placeholder="Prohibited actions" className="w-full rounded border border-soft-taupe px-2 py-1 text-xs" />
                    <select name="permission_level" className="w-full rounded border border-soft-taupe bg-ivory-light px-2 py-1 text-xs">
                      <option value="read_and_analyze">Read and Analyze</option>
                      <option value="draft">Draft</option>
                      <option value="prepare_actions">Prepare Actions</option>
                      <option value="execute_low_risk_internal">Execute Low-Risk Internal Actions</option>
                      <option value="human_approval_required">Human Approval Required</option>
                    </select>
                    <input type="text" name="retention_policy" placeholder="Retention policy" className="w-full rounded border border-soft-taupe px-2 py-1 text-xs" />
                    <button type="submit" className="lc-btn-secondary text-xs">Save new version</button>
                  </form>
                </details>
              </Card>
            );
          })}
        </div>
      ) : (
        <p className="mt-6 text-sm text-soft-taupe">No agents configured yet.</p>
      )}

      <details className="mt-6">
        <summary className="cursor-pointer text-sm text-deep-indigo underline">Create custom agent</summary>
        <form action={createAgent} className="mt-2 max-w-md space-y-2">
          <input type="text" name="name" placeholder="Agent name" required className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <textarea name="purpose" placeholder="Purpose" rows={2} className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <button type="submit" className="lc-btn-primary">Create agent</button>
        </form>
      </details>
    </div>
  );
}
