import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { Card, PageHeader } from "@/components/ui";
import { createPipeline, addOpportunity, moveOpportunityStage } from "./actions";

export default async function PipelinePage() {
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="p-8">
        <PageHeader title="Sales Pipeline" />
        <p className="mt-2 text-sm text-soft-taupe">No workspace yet.</p>
      </div>
    );
  }

  const supabase = await createClient();

  const { data: pipeline } = await supabase
    .from("pipeline_definitions")
    .select("id, name")
    .eq("workspace_id", workspaceId)
    .order("created_at")
    .limit(1)
    .maybeSingle();

  if (!pipeline) {
    return (
      <div className="p-8">
        <PageHeader
          title="Sales Pipeline"
          description="Move qualified opportunities through validated stages with transparent ownership and forecasting."
        />
        <Card className="mt-6 max-w-md">
          <form action={createPipeline} className="space-y-2">
            <input type="text" name="name" placeholder="Pipeline name" required className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
            <select name="pathway" defaultValue="" className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
              <option value="">No pathway</option>
              <option value="b2b">B2B</option>
              <option value="b2c">B2C</option>
              <option value="partner">Partner</option>
            </select>
            <textarea
              name="stages"
              placeholder={"Stage names, one per line, in order\ne.g.\nTarget Identified\nDiscovery Completed\nProposal Sent\nContract Signed"}
              rows={5}
              className="w-full rounded border border-soft-taupe px-3 py-2 text-sm"
            />
            <button type="submit" className="lc-btn-primary">Create pipeline</button>
          </form>
        </Card>
      </div>
    );
  }

  const [{ data: stages }, { data: organizations }, { data: offers }] = await Promise.all([
    supabase.from("pipeline_stages").select("id, name, sequence").eq("pipeline_id", pipeline.id).order("sequence"),
    supabase.from("organizations").select("id, name").eq("workspace_id", workspaceId),
    supabase.from("offers").select("id, name").eq("workspace_id", workspaceId),
  ]);

  const { data: opportunities } = await supabase
    .from("opportunities")
    .select("id, name, stage_id, expected_value, target_close_date, status, organizations(name)")
    .eq("pipeline_id", pipeline.id)
    .eq("status", "open")
    .order("created_at", { ascending: false });

  const opportunitiesByStage = new Map<string, typeof opportunities>();
  for (const o of opportunities ?? []) {
    if (!o.stage_id) continue;
    if (!opportunitiesByStage.has(o.stage_id)) opportunitiesByStage.set(o.stage_id, []);
    opportunitiesByStage.get(o.stage_id)!.push(o);
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Sales Pipeline"
        description="Move qualified opportunities through validated stages with transparent ownership and forecasting."
      />

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {stages?.map((stage) => (
          <Card key={stage.id}>
            <h2 className="text-lg font-semibold text-deep-indigo">{stage.name}</h2>
            <ul className="mt-2 space-y-2">
              {(opportunitiesByStage.get(stage.id) ?? []).map((o) => (
                <li key={o.id} className="rounded bg-soft-lavender/10 p-3 text-sm">
                  <p className="font-medium">{o.name}</p>
                  <p className="text-soft-taupe">
                    {(o.organizations as unknown as { name: string } | null)?.name ?? "—"}
                    {o.expected_value ? ` · $${o.expected_value}` : ""}
                    {o.target_close_date ? ` · closes ${o.target_close_date}` : ""}
                  </p>
                  <form action={moveOpportunityStage} className="mt-1 flex items-center gap-2">
                    <input type="hidden" name="opportunity_id" value={o.id} />
                    <select
                      name="stage_id"
                      defaultValue={stage.id}
                      className="rounded border border-soft-taupe px-2 py-1 text-xs"
                    >
                      {stages.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    <button type="submit" className="lc-btn-secondary text-xs">
                      Move
                    </button>
                  </form>
                </li>
              ))}
              {(opportunitiesByStage.get(stage.id) ?? []).length === 0 && (
                <p className="text-xs text-soft-taupe">Nothing in this stage.</p>
              )}
            </ul>
          </Card>
        ))}
      </div>

      <details className="mt-6">
        <summary className="cursor-pointer text-sm text-deep-indigo underline">Add opportunity</summary>
        <form action={addOpportunity} className="mt-2 max-w-md space-y-2">
          <input type="hidden" name="pipeline_id" value={pipeline.id} />
          <input type="text" name="name" placeholder="Opportunity name" required className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <select name="organization_id" defaultValue="" className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
            <option value="">No organization</option>
            {organizations?.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
          <select name="offer_id" defaultValue="" className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
            <option value="">No offer</option>
            {offers?.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
          <select name="stage_id" required className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
            {stages?.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <input type="number" name="expected_value" placeholder="Expected value" step="any" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <input type="date" name="target_close_date" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <button type="submit" className="lc-btn-primary">Add opportunity</button>
        </form>
      </details>
    </div>
  );
}
