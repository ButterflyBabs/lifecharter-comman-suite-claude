import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";

export default async function DecisionsPage() {
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-semibold text-deep-indigo">Decisions</h1>
        <p className="mt-2 text-sm text-soft-taupe">
          No workspace yet. The guided setup wizard (Section 18, Phase 2) will create one.
        </p>
      </div>
    );
  }

  const supabase = await createClient();
  const { data: decisions } = await supabase
    .from("decisions")
    .select("id, question, status, due_at, final_choice")
    .eq("workspace_id", workspaceId)
    .order("due_at", { nullsFirst: false });

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-deep-indigo">Decision Queue</h1>
      <p className="mt-2 text-sm text-soft-taupe">
        Every open, deferred, and decided question for this workspace (Section 14.2).
      </p>
      {decisions && decisions.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {decisions.map((d) => (
            <li key={d.id} className="rounded border border-soft-taupe/40 p-3 text-sm">
              <p className="font-medium">{d.question}</p>
              <p className="text-soft-taupe">
                {d.status}
                {d.due_at ? ` · due ${new Date(d.due_at).toLocaleDateString()}` : ""}
                {d.final_choice ? ` · chosen: ${d.final_choice}` : ""}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-soft-taupe">No decisions logged yet.</p>
      )}
    </div>
  );
}
