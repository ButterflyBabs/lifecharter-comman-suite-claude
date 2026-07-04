import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { getMode } from "@/lib/mode/actions";
import { Card, PageHeader, StatTile } from "@/components/ui";

export default async function CommandTodayPage() {
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-semibold text-deep-indigo">Today</h1>
        <p className="mt-2 max-w-md text-sm text-soft-taupe">
          Welcome. The first correct step is setting up your workspace.
        </p>
        <Link
          href="/roadmap/setup"
          className="lc-btn-primary mt-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sacred-teal"
        >
          Start setup
        </Link>
      </div>
    );
  }

  const supabase = await createClient();
  const mode = await getMode();

  const { data: roadmap } = await supabase
    .from("roadmap_instances")
    .select("id")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!roadmap) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-semibold text-deep-indigo">Today</h1>
        <p className="mt-2 max-w-md text-sm text-soft-taupe">
          Your workspace is set up. The next correct step is the Business Command Audit
          — it scores the Twelve Business Command Domains and generates your
          prioritized roadmap.
        </p>
        <Link
          href="/roadmap/audit"
          className="lc-btn-primary mt-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sacred-teal"
        >
          Start the audit
        </Link>
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);

  const [{ data: overdueTasks }, { data: blockers }, { count: pendingApprovals }, { data: activePhase }] =
    await Promise.all([
      supabase
        .from("tasks")
        .select("id, title, due_at, status")
        .eq("workspace_id", workspaceId)
        .not("status", "in", "(done,cancelled)")
        .lte("due_at", `${today}T23:59:59`)
        .order("due_at"),
      supabase
        .from("blockers")
        .select("id, reason")
        .eq("workspace_id", workspaceId)
        .eq("status", "active"),
      supabase
        .from("approvals")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .eq("status", "pending"),
      supabase
        .from("roadmap_phases")
        .select("id, name, roadmap_milestones(id, title, status)")
        .eq("roadmap_instance_id", roadmap.id)
        .eq("status", "active")
        .maybeSingle(),
    ]);

  return (
    <div className="p-8">
      <PageHeader
        title="Today"
        description={mode === "build" ? "Build Mode — emphasizing roadmap progress" : "Run Mode — emphasizing today's operating cadence"}
      />

      {mode === "run" && (
        <section className="mt-6">
          <h2 className="text-lg font-semibold text-deep-indigo">Due today or overdue</h2>
          {overdueTasks && overdueTasks.length > 0 ? (
            <ul className="mt-2 space-y-2">
              {overdueTasks.map((t) => (
                <li key={t.id}>
                  <Card className="text-sm">{t.title}</Card>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-soft-taupe">Nothing due or overdue.</p>
          )}
        </section>
      )}

      {mode === "build" && activePhase && (
        <section className="mt-6">
          <h2 className="text-lg font-semibold text-deep-indigo">Active roadmap phase: {activePhase.name}</h2>
          <ul className="mt-2 space-y-2">
            {(activePhase.roadmap_milestones as any[])?.map((m) => (
              <li key={m.id}>
                <Card className="text-sm">
                  {m.title} · {m.status}
                </Card>
              </li>
            ))}
          </ul>
          <Link href="/roadmap/plan" className="mt-2 inline-block text-sm underline">
            View full roadmap
          </Link>
        </section>
      )}

      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile value={blockers?.length ?? 0} label="Active blockers" />
        <StatTile value={pendingApprovals ?? 0} label="Pending approvals" />
        <div className="lc-card flex items-center p-4 text-sm">
          <Link href="/reviews/daily" className="text-deep-indigo underline">
            Open today&apos;s review
          </Link>
        </div>
      </section>
    </div>
  );
}
