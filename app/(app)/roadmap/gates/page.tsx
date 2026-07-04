import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";

export default async function GatesPage() {
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-semibold text-deep-indigo">Stage Gates</h1>
        <p className="mt-2 text-sm text-soft-taupe">No workspace yet.</p>
      </div>
    );
  }

  const supabase = await createClient();
  const { data: gates } = await supabase
    .from("stage_gates")
    .select("id, name, context_type, context_id, rule_mode, status, gate_requirements(requirement_type, blocking)")
    .eq("workspace_id", workspaceId);

  const { data: evidence } = await supabase
    .from("completion_evidence")
    .select("subject_type, subject_id, approved_by")
    .eq("workspace_id", workspaceId);

  const approvedEvidenceSubjects = new Set(
    (evidence ?? []).filter((e) => e.approved_by).map((e) => `${e.subject_type}:${e.subject_id}`),
  );

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-deep-indigo">Stage Gates</h1>
      <p className="mt-2 max-w-2xl text-sm text-soft-taupe">
        Every gate below blocks progression (Section 3: &ldquo;Stage gates have
        meaning&rdquo;) until its requirements are satisfied — enforced at the database
        level, not just in this view.
      </p>
      {gates && gates.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {gates.map((g: any) => {
            const satisfied = approvedEvidenceSubjects.has(`${g.context_type}:${g.context_id}`);
            return (
              <li key={g.id} className="rounded border border-soft-taupe/40 p-3 text-sm">
                <p className="font-medium">{g.name}</p>
                <p className="text-soft-taupe">
                  {g.rule_mode} · {g.status} ·{" "}
                  {g.gate_requirements?.length ?? 0} requirement(s)
                </p>
                <p className={satisfied ? "text-sacred-teal" : "text-warm-gold"}>
                  {satisfied ? "Satisfied" : "Not yet satisfied"}
                </p>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-soft-taupe">
          No gates yet — completing the Business Command Audit generates one per roadmap
          milestone.
        </p>
      )}
    </div>
  );
}
