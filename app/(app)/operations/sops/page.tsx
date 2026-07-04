import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { Card, PageHeader, StatusBadge } from "@/components/ui";
import { createSop, addSopVersion } from "./actions";

export default async function SopsPage() {
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="p-8">
        <PageHeader title="SOPs" />
        <p className="mt-2 text-sm text-soft-taupe">No workspace yet.</p>
      </div>
    );
  }

  const supabase = await createClient();

  const { data: sops } = await supabase
    .from("sops")
    .select("id, name, business_area, status, review_at, current_version_id, sop_versions(id, version, purpose, trigger_description, steps_json, effective_at)")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  return (
    <div className="p-8">
      <PageHeader
        title="SOPs"
        description="Versioned, findable, owned operating procedures with QA and review dates."
      />

      {sops && sops.length > 0 ? (
        <div className="mt-6 space-y-4">
          {sops.map((s) => {
            const versions = (s.sop_versions ?? []).slice().sort((a, b) => b.version - a.version);
            const current = versions.find((v) => v.id === s.current_version_id);
            return (
              <Card key={s.id}>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-deep-indigo">{s.name}</h2>
                  <StatusBadge status={s.status} />
                </div>
                {s.business_area && <p className="text-sm text-soft-taupe">{s.business_area}</p>}
                {s.review_at && <p className="text-xs text-soft-taupe">Review by {new Date(s.review_at).toLocaleDateString()}</p>}

                {current && (
                  <div className="mt-2 rounded bg-soft-lavender/10 p-2 text-sm">
                    <p className="font-medium">Version {current.version}{current.purpose ? ` — ${current.purpose}` : ""}</p>
                    {current.trigger_description && <p className="text-soft-taupe">Trigger: {current.trigger_description}</p>}
                    {Array.isArray(current.steps_json) && current.steps_json.length > 0 && (
                      <ol className="mt-1 list-decimal pl-4 text-xs text-soft-taupe">
                        {(current.steps_json as string[]).map((step, i) => (
                          <li key={i}>{step}</li>
                        ))}
                      </ol>
                    )}
                  </div>
                )}

                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-deep-indigo underline">Add version</summary>
                  <form action={addSopVersion} className="mt-1 space-y-1">
                    <input type="hidden" name="sop_id" value={s.id} />
                    <input type="text" name="purpose" placeholder="Purpose" className="w-full rounded border border-soft-taupe px-2 py-1 text-xs" />
                    <input type="text" name="trigger_description" placeholder="Trigger" className="w-full rounded border border-soft-taupe px-2 py-1 text-xs" />
                    <input type="text" name="preconditions" placeholder="Preconditions" className="w-full rounded border border-soft-taupe px-2 py-1 text-xs" />
                    <textarea name="steps" placeholder={"Ordered steps, one per line"} rows={4} className="w-full rounded border border-soft-taupe px-2 py-1 text-xs" />
                    <input type="text" name="escalation" placeholder="Escalation rule" className="w-full rounded border border-soft-taupe px-2 py-1 text-xs" />
                    <button type="submit" className="lc-btn-secondary text-xs">Add version</button>
                  </form>
                </details>
              </Card>
            );
          })}
        </div>
      ) : (
        <p className="mt-6 text-sm text-soft-taupe">No SOPs yet.</p>
      )}

      <details className="mt-6">
        <summary className="cursor-pointer text-sm text-deep-indigo underline">Create SOP</summary>
        <form action={createSop} className="mt-2 max-w-md space-y-2">
          <input type="text" name="name" placeholder="SOP name" required className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <input type="text" name="business_area" placeholder="Business area" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <input type="date" name="review_at" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <button type="submit" className="lc-btn-primary">Create SOP</button>
        </form>
      </details>
    </div>
  );
}
