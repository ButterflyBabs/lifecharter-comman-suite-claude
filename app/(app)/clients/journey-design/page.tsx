import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { Card, PageHeader, StatusBadge } from "@/components/ui";
import { createJourneyTemplate, publishJourneyTemplate, addJourneyStage, addJourneyTouchpoint } from "./actions";

export default async function JourneyDesignPage() {
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="p-8">
        <PageHeader title="Journey Design" />
        <p className="mt-2 text-sm text-soft-taupe">No workspace yet.</p>
      </div>
    );
  }

  const supabase = await createClient();

  const [{ data: templates }, { data: offerVersions }] = await Promise.all([
    supabase
      .from("journey_templates")
      .select("id, name, status, success_definition, journey_stages(id, name, sequence, entry_criteria, exit_criteria, journey_touchpoints(id, title, touchpoint_type, client_visible))")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false }),
    supabase.from("offer_versions").select("id, problem, offer_id").eq("workspace_id", workspaceId),
  ]);

  return (
    <div className="p-8">
      <PageHeader
        title="Journey Design"
        description="Define the stages and touchpoints every client moves through for a given offer."
      />

      {templates && templates.length > 0 ? (
        <div className="mt-6 space-y-4">
          {templates.map((t) => {
            const stages = (t.journey_stages ?? []).slice().sort((a, b) => a.sequence - b.sequence);
            return (
              <Card key={t.id}>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-deep-indigo">{t.name}</h2>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={t.status} />
                    {t.status !== "published" && (
                      <form action={publishJourneyTemplate}>
                        <input type="hidden" name="template_id" value={t.id} />
                        <button type="submit" className="lc-btn-secondary text-xs">Publish</button>
                      </form>
                    )}
                  </div>
                </div>
                {t.success_definition && <p className="mt-1 text-sm text-soft-taupe">{t.success_definition}</p>}

                <ul className="mt-3 space-y-2">
                  {stages.map((s) => (
                    <li key={s.id} className="rounded bg-soft-lavender/10 p-3 text-sm">
                      <p className="font-medium">{s.sequence}. {s.name}</p>
                      {s.entry_criteria && <p className="text-soft-taupe">Entry: {s.entry_criteria}</p>}
                      {s.exit_criteria && <p className="text-soft-taupe">Exit: {s.exit_criteria}</p>}
                      <ul className="mt-1 space-y-1">
                        {(s.journey_touchpoints ?? []).map((tp) => (
                          <li key={tp.id} className="text-xs text-soft-taupe">
                            &bull; {tp.title} {tp.touchpoint_type ? `(${tp.touchpoint_type})` : ""} {tp.client_visible ? "· client-visible" : ""}
                          </li>
                        ))}
                      </ul>
                      <details className="mt-1">
                        <summary className="cursor-pointer text-xs text-deep-indigo underline">Add touchpoint</summary>
                        <form action={addJourneyTouchpoint} className="mt-1 space-y-1">
                          <input type="hidden" name="journey_stage_id" value={s.id} />
                          <input type="text" name="title" placeholder="Touchpoint title" required className="w-full rounded border border-soft-taupe px-2 py-1 text-xs" />
                          <input type="text" name="touchpoint_type" placeholder="Type (email, call, form...)" className="w-full rounded border border-soft-taupe px-2 py-1 text-xs" />
                          <input type="text" name="owner_role" placeholder="Owner role" className="w-full rounded border border-soft-taupe px-2 py-1 text-xs" />
                          <input type="text" name="timing_rule" placeholder="Timing rule" className="w-full rounded border border-soft-taupe px-2 py-1 text-xs" />
                          <label className="flex items-center gap-1 text-xs">
                            <input type="checkbox" name="client_visible" /> Client visible
                          </label>
                          <button type="submit" className="lc-btn-secondary text-xs">Add</button>
                        </form>
                      </details>
                    </li>
                  ))}
                </ul>

                <details className="mt-3">
                  <summary className="cursor-pointer text-sm text-deep-indigo underline">Add stage</summary>
                  <form action={addJourneyStage} className="mt-2 max-w-md space-y-2">
                    <input type="hidden" name="journey_template_id" value={t.id} />
                    <input type="text" name="name" placeholder="Stage name" required className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
                    <input type="number" name="sequence" placeholder="Sequence" defaultValue={stages.length + 1} className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
                    <input type="text" name="entry_criteria" placeholder="Entry criteria" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
                    <input type="text" name="exit_criteria" placeholder="Exit criteria" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
                    <button type="submit" className="lc-btn-primary">Add stage</button>
                  </form>
                </details>
              </Card>
            );
          })}
        </div>
      ) : (
        <p className="mt-6 text-sm text-soft-taupe">No journey templates yet.</p>
      )}

      <details className="mt-6">
        <summary className="cursor-pointer text-sm text-deep-indigo underline">Create journey template</summary>
        <form action={createJourneyTemplate} className="mt-2 max-w-md space-y-2">
          <input type="text" name="name" placeholder="Template name" required className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <select name="offer_version_id" defaultValue="" className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
            <option value="">No offer version</option>
            {offerVersions?.map((v) => (
              <option key={v.id} value={v.id}>{v.problem ?? v.id}</option>
            ))}
          </select>
          <textarea name="success_definition" placeholder="Success definition" rows={2} className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <button type="submit" className="lc-btn-primary">Create template</button>
        </form>
      </details>
    </div>
  );
}
