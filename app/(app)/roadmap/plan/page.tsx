import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { completeMilestone, completePhase } from "./actions";
import { Card, PageHeader, PathwayRow, StatusBadge } from "@/components/ui";
import type { PathwayItem } from "@/components/ui";

export default async function RoadmapPlanPage() {
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-semibold text-deep-indigo">Roadmap</h1>
        <p className="mt-2 text-sm text-soft-taupe">
          <Link href="/roadmap/setup" className="underline">
            Set up your workspace
          </Link>{" "}
          first.
        </p>
      </div>
    );
  }

  const supabase = await createClient();

  const { data: roadmap } = await supabase
    .from("roadmap_instances")
    .select("id, primary_outcome, status")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!roadmap) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-semibold text-deep-indigo">Roadmap</h1>
        <p className="mt-2 text-sm text-soft-taupe">
          No roadmap yet. Complete the{" "}
          <Link href="/roadmap/audit" className="underline">
            Business Command Audit
          </Link>{" "}
          to generate a prioritized one.
        </p>
      </div>
    );
  }

  const { data: phases } = await supabase
    .from("roadmap_phases")
    .select("id, name, sequence, status")
    .eq("roadmap_instance_id", roadmap.id)
    .order("sequence");

  const { data: milestones } = await supabase
    .from("roadmap_milestones")
    .select("id, phase_id, title, purpose, definition_of_done, status")
    .eq("workspace_id", workspaceId)
    .is("archived_at", null);

  const milestonesByPhase = new Map<string, typeof milestones>();
  for (const m of milestones ?? []) {
    if (!milestonesByPhase.has(m.phase_id)) milestonesByPhase.set(m.phase_id, []);
    milestonesByPhase.get(m.phase_id)!.push(m);
  }

  const pathwayItems: PathwayItem[] =
    phases?.map((phase) => ({
      id: phase.id,
      label: phase.name,
      sequence: phase.sequence,
      status: phase.status === "complete" ? "complete" : phase.status === "active" ? "active" : "pending",
    })) ?? [];

  return (
    <div className="p-8">
      <PageHeader title="Your Roadmap" description={roadmap.primary_outcome} />

      <div className="mt-6">
        <PathwayRow items={pathwayItems} />
      </div>

      <ol className="mt-6 space-y-4">
        {phases?.map((phase) => {
          const phaseMilestones = milestonesByPhase.get(phase.id) ?? [];
          const allDone = phaseMilestones.length > 0 && phaseMilestones.every((m) => m.status === "done");
          return (
            <li key={phase.id}>
              <Card>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-deep-indigo">
                    {phase.sequence}. {phase.name}
                  </h2>
                  <StatusBadge status={phase.status} />
                </div>

                <ul className="mt-3 space-y-2">
                  {phaseMilestones.map((m) => (
                    <li key={m.id} className="rounded bg-soft-lavender/10 p-3 text-sm">
                      <p className="font-medium">{m.title}</p>
                      {m.purpose && <p className="text-soft-taupe">{m.purpose}</p>}
                      <p className="text-soft-taupe">Done when: {m.definition_of_done}</p>
                      <p className="mt-1">Status: {m.status}</p>
                      {m.status !== "done" && (
                        <form action={completeMilestone.bind(null, m.id)} className="mt-2 flex gap-2">
                          <label htmlFor={`note-${m.id}`} className="sr-only">
                            Completion evidence for {m.title}
                          </label>
                          <input
                            id={`note-${m.id}`}
                            name="note"
                            type="text"
                            placeholder="Evidence note (required to mark done)"
                            className="flex-1 rounded border border-soft-taupe px-2 py-1 text-sm"
                          />
                          <button
                            type="submit"
                            className="rounded bg-sacred-teal px-3 py-1 text-sm text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-deep-indigo"
                          >
                            Mark done
                          </button>
                        </form>
                      )}
                    </li>
                  ))}
                </ul>

                {phase.status === "active" && !allDone && (
                  <p className="mt-3 text-xs text-soft-taupe">
                    Complete every milestone above before this phase can close.
                  </p>
                )}
                {phase.status === "active" && allDone && (
                  <form action={completePhase.bind(null, phase.id)} className="mt-3">
                    <button
                      type="submit"
                      className="lc-btn-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sacred-teal"
                    >
                      Close phase and start the next one
                    </button>
                  </form>
                )}
              </Card>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
