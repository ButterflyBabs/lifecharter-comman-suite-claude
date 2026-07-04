import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { Card, PageHeader, StatusBadge } from "@/components/ui";
import { createProgram, createProgramVersion, publishProgramVersion, addProgramPhase } from "./actions";

export default async function ProgramsPage() {
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="p-8">
        <PageHeader title="Programs and Delivery" />
        <p className="mt-2 text-sm text-soft-taupe">No workspace yet.</p>
      </div>
    );
  }

  const supabase = await createClient();

  const [{ data: programs }, { data: offers }] = await Promise.all([
    supabase
      .from("programs")
      .select("id, name, status, current_version_id, program_versions(id, version, outcome, format, status, effective_at, program_phases(id, name, sequence, objective, completion_rule))")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false }),
    supabase.from("offers").select("id, name").eq("workspace_id", workspaceId),
  ]);

  return (
    <div className="p-8">
      <PageHeader
        title="Programs and Delivery"
        description="Versioned program blueprints and the phases that structure delivery for each cohort."
      />

      {programs && programs.length > 0 ? (
        <div className="mt-6 space-y-4">
          {programs.map((p) => {
            const versions = (p.program_versions ?? []).slice().sort((a, b) => b.version - a.version);
            return (
              <Card key={p.id}>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-deep-indigo">{p.name}</h2>
                  <StatusBadge status={p.status} />
                </div>

                <div className="mt-3 space-y-3">
                  {versions.map((v) => {
                    const phases = (v.program_phases ?? []).slice().sort((a, b) => a.sequence - b.sequence);
                    return (
                      <div key={v.id} className="rounded bg-soft-lavender/10 p-3 text-sm">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">Version {v.version}{v.id === p.current_version_id ? " (current)" : ""}</p>
                          <div className="flex items-center gap-2">
                            <StatusBadge status={v.status} />
                            {v.status !== "published" && (
                              <form action={publishProgramVersion}>
                                <input type="hidden" name="version_id" value={v.id} />
                                <input type="hidden" name="program_id" value={p.id} />
                                <button type="submit" className="lc-btn-secondary text-xs">Publish</button>
                              </form>
                            )}
                          </div>
                        </div>
                        {v.outcome && <p className="text-soft-taupe">{v.outcome}</p>}
                        {v.format && <p className="text-xs text-soft-taupe">Format: {v.format}</p>}

                        <ul className="mt-2 space-y-1">
                          {phases.map((ph) => (
                            <li key={ph.id} className="text-xs">
                              <span className="font-medium">{ph.sequence}. {ph.name}</span>
                              {ph.objective && <span className="text-soft-taupe"> — {ph.objective}</span>}
                            </li>
                          ))}
                        </ul>

                        {v.status !== "published" && (
                          <details className="mt-2">
                            <summary className="cursor-pointer text-xs text-deep-indigo underline">Add phase</summary>
                            <form action={addProgramPhase} className="mt-1 space-y-1">
                              <input type="hidden" name="program_version_id" value={v.id} />
                              <input type="text" name="name" placeholder="Phase name" required className="w-full rounded border border-soft-taupe px-2 py-1 text-xs" />
                              <input type="number" name="sequence" placeholder="Sequence" defaultValue={phases.length + 1} className="w-full rounded border border-soft-taupe px-2 py-1 text-xs" />
                              <input type="text" name="objective" placeholder="Objective" className="w-full rounded border border-soft-taupe px-2 py-1 text-xs" />
                              <input type="text" name="completion_rule" placeholder="Completion rule" className="w-full rounded border border-soft-taupe px-2 py-1 text-xs" />
                              <button type="submit" className="lc-btn-secondary text-xs">Add phase</button>
                            </form>
                          </details>
                        )}
                      </div>
                    );
                  })}
                </div>

                <details className="mt-3">
                  <summary className="cursor-pointer text-sm text-deep-indigo underline">Add new version</summary>
                  <form action={createProgramVersion} className="mt-2 max-w-md space-y-2">
                    <input type="hidden" name="program_id" value={p.id} />
                    <textarea name="outcome" placeholder="Outcome" rows={2} className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
                    <input type="text" name="format" placeholder="Format (cohort, 1:1, hybrid...)" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
                    <button type="submit" className="lc-btn-primary">Add version</button>
                  </form>
                </details>
              </Card>
            );
          })}
        </div>
      ) : (
        <p className="mt-6 text-sm text-soft-taupe">No programs yet.</p>
      )}

      <details className="mt-6">
        <summary className="cursor-pointer text-sm text-deep-indigo underline">Create program</summary>
        <form action={createProgram} className="mt-2 max-w-md space-y-2">
          <input type="text" name="name" placeholder="Program name" required className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <select name="offer_id" defaultValue="" className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
            <option value="">No offer</option>
            {offers?.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
          <button type="submit" className="lc-btn-primary">Create program</button>
        </form>
      </details>
    </div>
  );
}
