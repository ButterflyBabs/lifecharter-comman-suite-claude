import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { Card, PageHeader, StatusBadge } from "@/components/ui";
import { addKnowledgeSource, refreshKnowledgeSource, restrictKnowledgeSource, resolveKnowledgeConflict, removeKnowledgeSource } from "./actions";

export default async function KnowledgePage() {
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="p-8">
        <PageHeader title="Knowledge Sources" />
        <p className="mt-2 text-sm text-soft-taupe">No workspace yet.</p>
      </div>
    );
  }

  const supabase = await createClient();

  const [{ data: sources }, { data: agents }] = await Promise.all([
    supabase
      .from("ai_knowledge_sources")
      .select("id, source_type, source_url, visibility, ingestion_status, conflict_status, freshness_at, active, ai_agents(name)")
      .eq("workspace_id", workspaceId)
      .eq("active", true)
      .order("created_at", { ascending: false }),
    supabase.from("ai_agents").select("id, name").eq("workspace_id", workspaceId),
  ]);

  return (
    <div className="p-8">
      <PageHeader
        title="Knowledge Sources"
        description="Govern the Business Brain, assets, records, and sources each agent may use."
      />

      {sources && sources.length > 0 ? (
        <ul className="mt-6 space-y-3">
          {sources.map((s) => (
            <li key={s.id}>
              <Card className="text-sm">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{s.source_type.replace(/_/g, " ")}{s.source_url ? ` — ${s.source_url}` : ""}</p>
                  <div className="flex items-center gap-2">
                    {s.conflict_status !== "none" && <StatusBadge status={s.conflict_status} tone="warning" />}
                    <StatusBadge status={s.ingestion_status} />
                  </div>
                </div>
                <p className="text-soft-taupe">
                  {(s.ai_agents as unknown as { name: string } | null)?.name ?? "No specific agent"} · {s.visibility.replace(/_/g, " ")}
                </p>
                {s.freshness_at && <p className="text-xs text-soft-taupe">Last refreshed {new Date(s.freshness_at).toLocaleDateString()}</p>}
                <div className="mt-1 flex flex-wrap gap-2">
                  <form action={refreshKnowledgeSource}>
                    <input type="hidden" name="source_id" value={s.id} />
                    <button type="submit" className="lc-btn-secondary text-xs">Refresh</button>
                  </form>
                  {s.visibility !== "internal" && (
                    <form action={restrictKnowledgeSource}>
                      <input type="hidden" name="source_id" value={s.id} />
                      <button type="submit" className="lc-btn-secondary text-xs">Restrict</button>
                    </form>
                  )}
                  {s.conflict_status === "flagged" && (
                    <form action={resolveKnowledgeConflict}>
                      <input type="hidden" name="source_id" value={s.id} />
                      <button type="submit" className="lc-btn-secondary text-xs">Resolve conflict</button>
                    </form>
                  )}
                  <form action={removeKnowledgeSource}>
                    <input type="hidden" name="source_id" value={s.id} />
                    <button type="submit" className="lc-btn-secondary text-xs">Remove</button>
                  </form>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 text-sm text-soft-taupe">No knowledge sources yet.</p>
      )}

      <details className="mt-6">
        <summary className="cursor-pointer text-sm text-deep-indigo underline">Add source</summary>
        <form action={addKnowledgeSource} className="mt-2 max-w-md space-y-2">
          <select name="agent_id" defaultValue="" className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
            <option value="">No specific agent</option>
            {agents?.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          <select name="source_type" required className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
            <option value="structured_record">Structured record</option>
            <option value="document">Document</option>
            <option value="url">URL</option>
            <option value="asset">Asset</option>
            <option value="integration">Integration</option>
            <option value="collection">Collection</option>
          </select>
          <input type="text" name="source_url" placeholder="Source URL or reference" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <select name="visibility" className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
            <option value="internal">Internal</option>
            <option value="client_visible">Client visible</option>
            <option value="public">Public</option>
          </select>
          <input type="text" name="access_scope" placeholder="Access scope" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <input type="text" name="freshness_rule" placeholder="Freshness rule" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <input type="text" name="retention_rule" placeholder="Retention rule" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <button type="submit" className="lc-btn-primary">Add source</button>
        </form>
      </details>
    </div>
  );
}
