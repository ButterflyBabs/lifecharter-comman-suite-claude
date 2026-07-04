import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import {
  Card,
  PageHeader,
  StatTile,
  IconBadge,
  IconClipboard,
  IconFlag,
  IconDollarSign,
  IconCheckCircle,
  IconHelpCircle,
  IconCpu,
} from "@/components/ui";

export default async function UsagePage() {
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="p-8">
        <PageHeader title="Usage and Cost" />
        <p className="mt-2 text-sm text-soft-taupe">No workspace yet.</p>
      </div>
    );
  }

  const supabase = await createClient();

  const [
    { data: runs },
    { data: outputs },
    { data: costEvents },
    { data: feedback },
  ] = await Promise.all([
    supabase.from("ai_runs").select("id, status, cost, ai_agent_versions(ai_agents(name))").eq("workspace_id", workspaceId),
    supabase.from("ai_outputs").select("id, status").eq("workspace_id", workspaceId),
    supabase.from("ai_cost_events").select("id, provider, model, total_cost").eq("workspace_id", workspaceId),
    supabase.from("ai_feedback").select("rating").eq("workspace_id", workspaceId),
  ]);

  const totalRuns = runs?.length ?? 0;
  const failedRuns = (runs ?? []).filter((r) => r.status === "failed").length;
  const totalCost = (costEvents ?? []).reduce((sum, c) => sum + Number(c.total_cost ?? 0), 0);
  const approvedOutputs = (outputs ?? []).filter((o) => o.status === "approved" || o.status === "executed").length;
  const rejectedOutputs = (outputs ?? []).filter((o) => o.status === "rejected").length;
  const decidedOutputs = approvedOutputs + rejectedOutputs;
  const acceptanceRate = decidedOutputs > 0 ? Math.round((approvedOutputs / decidedOutputs) * 100) : null;
  const avgRating = feedback && feedback.length > 0
    ? (feedback.reduce((sum, f) => sum + (f.rating ?? 0), 0) / feedback.length).toFixed(1)
    : null;

  const runsByAgent = new Map<string, number>();
  for (const r of runs ?? []) {
    const name = (r.ai_agent_versions as unknown as { ai_agents: { name: string } | null } | null)?.ai_agents?.name ?? "Unknown agent";
    runsByAgent.set(name, (runsByAgent.get(name) ?? 0) + 1);
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Usage and Cost"
        description="Runs, cost, acceptance, and error rate across every agent in this workspace."
      />

      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile value={totalRuns} label="Total runs" icon={<IconCpu />} />
        <StatTile value={failedRuns} label="Failed runs" tone={failedRuns > 0 ? "error" : "neutral"} icon={<IconFlag />} />
        <StatTile value={`$${totalCost.toLocaleString()}`} label="Total cost" icon={<IconDollarSign />} />
        <StatTile value={acceptanceRate !== null ? `${acceptanceRate}%` : "—"} label="Acceptance rate" icon={<IconCheckCircle />} />
        <StatTile value={rejectedOutputs} label="Rejected outputs" tone={rejectedOutputs > 0 ? "warning" : "neutral"} icon={<IconFlag />} />
        <StatTile value={avgRating ?? "—"} label="Average feedback rating" icon={<IconHelpCircle />} />
      </section>

      <section className="mt-8">
        <h2 className="lc-section-heading text-lg font-semibold text-deep-indigo">
          <IconBadge size="sm"><IconClipboard /></IconBadge>
          Runs by agent
        </h2>
        <ul className="mt-3 space-y-2">
          {[...runsByAgent.entries()].map(([name, count]) => (
            <li key={name}>
              <Card className="flex items-center justify-between text-sm">
                <span>{name}</span>
                <span className="text-soft-taupe">{count} runs</span>
              </Card>
            </li>
          ))}
          {runsByAgent.size === 0 && <p className="text-sm text-soft-taupe">No runs yet.</p>}
        </ul>
      </section>

      <Card className="mt-8 text-sm text-soft-taupe">
        Time-saved estimates are labeled estimates, not audited savings
        (Section 6&apos;s stated rule) — this build doesn&apos;t compute a
        time-saved figure at all yet, since there&apos;s no baseline
        human-effort measurement to estimate against.
      </Card>
    </div>
  );
}
