import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { completeMilestone, completePhase } from "./actions";
import {
  Card,
  PageHeader,
  PathwayRow,
  StatusBadge,
  IconCheckCircle,
  IconClock,
  IconCircle,
  IconLock,
} from "@/components/ui";
import type { PathwayItem } from "@/components/ui";

function MilestoneIcon({ status }: { status: string }) {
  if (status === "done") return <IconCheckCircle />;
  if (status === "in_progress") return <IconClock />;
  return <IconCircle />;
}

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

  const activePhase = phases?.find((p) => p.status === "active");
  const otherPhases = phases?.filter((p) => p.status !== "active") ?? [];
  const nextPhase = activePhase ? phases?.find((p) => p.sequence === activePhase.sequence + 1) : undefined;

  const activeMilestones = activePhase ? (milestonesByPhase.get(activePhase.id) ?? []) : [];
  const doneCount = activeMilestones.filter((m) => m.status === "done").length;
  const totalCount = activeMilestones.length;
  const percentDone = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const allDone = totalCount > 0 && doneCount === totalCount;

  return (
    <div className="max-w-5xl p-8">
      <PageHeader
        title="Your Roadmap"
        description={
          <>
            {roadmap.primary_outcome}
            {activePhase && (
              <span className="mt-1 block text-[var(--text-muted)]">
                Phase {activePhase.sequence} of {phases?.length ?? 0} &middot; {doneCount} of {totalCount} milestones
                complete in this phase
              </span>
            )}
          </>
        }
      />

      <div className="mt-6">
        <PathwayRow items={pathwayItems} />
      </div>

      {activePhase ? (
        <Card className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-deep-indigo">
              {activePhase.sequence}. {activePhase.name}
            </h2>
            <StatusBadge status={activePhase.status} />
          </div>

          {totalCount > 0 && (
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--card-bg-hover)]">
              <div
                className="h-full rounded-full bg-warm-gold transition-[width]"
                style={{ width: `${percentDone}%` }}
              />
            </div>
          )}

          <ul className="mt-3">
            {activeMilestones.map((m) => (
              <li key={m.id} className="flex items-start gap-3 border-t border-[var(--card-border)] py-3 first:border-t-0">
                <span
                  className={
                    m.status === "done"
                      ? "mt-0.5 shrink-0 text-[var(--success)]"
                      : m.status === "in_progress"
                        ? "mt-0.5 shrink-0 text-warm-gold"
                        : "mt-0.5 shrink-0 text-soft-taupe"
                  }
                >
                  <MilestoneIcon status={m.status} />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-deep-indigo">{m.title}</p>
                  {m.purpose && <p className="text-sm text-soft-taupe">{m.purpose}</p>}
                  <p className="text-sm text-soft-taupe">Done when: {m.definition_of_done}</p>
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
                </div>
              </li>
            ))}
          </ul>

          {!allDone && totalCount > 0 && (
            <p className="mt-3 flex items-center gap-1.5 border-t border-[var(--card-border)] pt-3 text-xs text-soft-taupe">
              <IconLock />
              Complete all {totalCount} milestone{totalCount === 1 ? "" : "s"} to unlock
              {nextPhase ? ` phase ${nextPhase.sequence}: ${nextPhase.name}` : " the next phase"}.
            </p>
          )}
          {allDone && (
            <form action={completePhase.bind(null, activePhase.id)} className="mt-3">
              <button
                type="submit"
                className="lc-btn-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sacred-teal"
              >
                Close phase and start the next one
              </button>
            </form>
          )}
        </Card>
      ) : (
        (phases?.length ?? 0) > 0 && (
          <Card className="mt-6">
            <p className="text-sm text-deep-indigo">Every phase in this roadmap is complete.</p>
          </Card>
        )
      )}

      {otherPhases.length > 0 && (
        <ol className="mt-6 space-y-2">
          {otherPhases.map((phase) => {
            const phaseMilestones = milestonesByPhase.get(phase.id) ?? [];
            const doneOfPhase = phaseMilestones.filter((m) => m.status === "done").length;
            return (
              <li key={phase.id}>
                <details className="lc-card overflow-hidden rounded-2xl p-0">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-sm [&::-webkit-details-marker]:hidden">
                    <span className="font-medium text-deep-indigo">
                      {phase.sequence}. {phase.name}
                    </span>
                    <span className="flex items-center gap-3 text-[var(--text-muted)]">
                      {phaseMilestones.length > 0 && (
                        <span>
                          {doneOfPhase} of {phaseMilestones.length} milestones complete
                        </span>
                      )}
                      <StatusBadge status={phase.status} />
                    </span>
                  </summary>
                  <ul className="border-t border-[var(--card-border)] px-4">
                    {phaseMilestones.map((m) => (
                      <li key={m.id} className="flex items-start gap-3 border-t border-[var(--card-border)] py-3 first:border-t-0">
                        <span
                          className={
                            m.status === "done"
                              ? "mt-0.5 shrink-0 text-[var(--success)]"
                              : m.status === "in_progress"
                                ? "mt-0.5 shrink-0 text-warm-gold"
                                : "mt-0.5 shrink-0 text-soft-taupe"
                          }
                        >
                          <MilestoneIcon status={m.status} />
                        </span>
                        <div>
                          <p className="text-sm font-medium text-deep-indigo">{m.title}</p>
                          <p className="text-sm text-soft-taupe">Done when: {m.definition_of_done}</p>
                        </div>
                      </li>
                    ))}
                    {phaseMilestones.length === 0 && (
                      <li className="py-3 text-sm text-soft-taupe">No milestones defined yet.</li>
                    )}
                  </ul>
                </details>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
