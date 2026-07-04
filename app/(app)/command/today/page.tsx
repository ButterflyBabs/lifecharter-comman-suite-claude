import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { getMode } from "@/lib/mode/actions";
import {
  Card,
  PageHeader,
  StatTile,
  IconBadge,
  IconCompass,
  IconClipboard,
  IconCheckCircle,
  IconHelpCircle,
  IconUsers,
  IconReceipt,
  IconCreditCard,
  IconMap,
  IconGauge,
  IconFlag,
  IconClock,
} from "@/components/ui";

// Section 16.4 (Responsive requirements) names an explicit mobile priority
// order: current priority, today's work, decisions and approvals, client
// and revenue alerts, roadmap progress, capacity, then secondary metrics
// and history. This page follows that order top to bottom (Tailwind's
// mobile-first stacking means the DOM order below is the actual mobile
// reading order, not just a desktop grid that happens to reflow) and
// collapses the least-urgent items into a single <details> per Section
// 16.3's "one primary action per page state, avoid decorative metric
// clutter" guidance.
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

  const [
    { data: subscription },
    { data: overdueTasks },
    { data: blockers },
    { count: pendingApprovals },
    { count: openDecisions },
    { data: activePhase },
    { data: recentHealthEvents },
    { count: overdueInvoices },
    { count: failedPayments },
    { data: capacityAllocations },
  ] = await Promise.all([
    supabase.from("workspace_subscriptions").select("status").eq("workspace_id", workspaceId).maybeSingle(),
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
      .eq("status", "active")
      .order("created_at"),
    supabase
      .from("approvals")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("status", "pending"),
    supabase
      .from("decisions")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("status", "open"),
    supabase
      .from("roadmap_phases")
      .select("id, name, roadmap_milestones(id, title, status)")
      .eq("roadmap_instance_id", roadmap.id)
      .eq("status", "active")
      .maybeSingle(),
    supabase
      .from("client_health_events")
      .select("client_id, status, calculated_at")
      .eq("workspace_id", workspaceId)
      .order("calculated_at", { ascending: false })
      .limit(300),
    supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("status", "overdue"),
    supabase
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("status", "failed"),
    supabase
      .from("capacity_allocations")
      .select("planned_hours, actual_hours")
      .eq("workspace_id", workspaceId),
  ]);

  const needsActivation = !subscription || !["active", "trialing", "past_due"].includes(subscription.status);

  const latestHealthByClient = new Map<string, string>();
  for (const event of recentHealthEvents ?? []) {
    if (!latestHealthByClient.has(event.client_id)) latestHealthByClient.set(event.client_id, event.status ?? "");
  }
  const atRiskClientCount = Array.from(latestHealthByClient.values()).filter((status) => status === "at_risk").length;

  const plannedHours = (capacityAllocations ?? []).reduce((sum, a) => sum + Number(a.planned_hours ?? 0), 0);
  const actualHours = (capacityAllocations ?? []).reduce((sum, a) => sum + Number(a.actual_hours ?? 0), 0);
  const capacityLabel = plannedHours > 0 ? `${Math.round((actualHours / plannedHours) * 100)}%` : "No data";

  const oldestBlocker = (blockers ?? [])[0];
  const mostOverdueTask = (overdueTasks ?? [])[0];
  const currentPriority = oldestBlocker
    ? `Blocked: ${oldestBlocker.reason}`
    : mostOverdueTask
      ? `${mostOverdueTask.title} was due ${new Date(mostOverdueTask.due_at).toLocaleDateString()}`
      : "Nothing urgent right now.";

  return (
    <div className="p-8">
      <PageHeader
        title="Today"
        description={mode === "build" ? "Build Mode — emphasizing roadmap progress" : "Run Mode — emphasizing today's operating cadence"}
      />

      {/* 1. Current priority */}
      <Card className="mt-4 flex items-center gap-4 text-sm">
        <IconBadge tone={oldestBlocker ? "error" : mostOverdueTask ? "warning" : "neutral"}>
          {oldestBlocker ? <IconFlag /> : mostOverdueTask ? <IconClipboard /> : <IconCompass />}
        </IconBadge>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-soft-taupe">Current priority</p>
          <p className="mt-1 text-base font-medium">{currentPriority}</p>
        </div>
      </Card>

      {needsActivation && (
        <Card className="mt-4 flex items-center justify-between text-sm">
          <span>This workspace has no active subscription yet — choose a plan to unlock full usage limits.</span>
          <Link href="/settings/billing" className="lc-btn-secondary text-xs">Choose a plan</Link>
        </Card>
      )}

      {/* 2. Today's work */}
      {mode === "run" && (
        <section className="mt-6">
          <h2 className="lc-section-heading text-lg font-semibold text-deep-indigo">
            <IconBadge size="sm"><IconClipboard /></IconBadge>
            Due today or overdue
          </h2>
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
          <h2 className="lc-section-heading text-lg font-semibold text-deep-indigo">
            <IconBadge size="sm"><IconMap /></IconBadge>
            Active roadmap phase: {activePhase.name}
          </h2>
          <ul className="mt-2 space-y-2">
            {(activePhase.roadmap_milestones as unknown as { id: string; title: string; status: string }[])?.map((m) => (
              <li key={m.id}>
                <Card className="text-sm">
                  {m.title} · {m.status}
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 3. Decisions and approvals */}
      <section className="mt-6">
        <h2 className="lc-section-heading text-lg font-semibold text-deep-indigo">
          <IconBadge size="sm"><IconCheckCircle /></IconBadge>
          Decisions and approvals
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link href="/decisions">
            <StatTile
              value={openDecisions ?? 0}
              label="Open decisions"
              tone={(openDecisions ?? 0) > 0 ? "warning" : "neutral"}
              icon={<IconHelpCircle />}
            />
          </Link>
          <Link href="/approvals">
            <StatTile
              value={pendingApprovals ?? 0}
              label="Pending approvals"
              tone={(pendingApprovals ?? 0) > 0 ? "warning" : "neutral"}
              icon={<IconCheckCircle />}
            />
          </Link>
        </div>
      </section>

      {/* 4. Client and revenue alerts */}
      <section className="mt-6">
        <h2 className="lc-section-heading text-lg font-semibold text-deep-indigo">
          <IconBadge size="sm"><IconUsers /></IconBadge>
          Client and revenue alerts
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Link href="/clients/health">
            <StatTile
              value={atRiskClientCount}
              label="Clients at risk"
              tone={atRiskClientCount > 0 ? "error" : "neutral"}
              icon={<IconUsers />}
            />
          </Link>
          <Link href="/revenue/payments">
            <StatTile
              value={overdueInvoices ?? 0}
              label="Overdue invoices"
              tone={(overdueInvoices ?? 0) > 0 ? "error" : "neutral"}
              icon={<IconReceipt />}
            />
          </Link>
          <Link href="/revenue/payments">
            <StatTile
              value={failedPayments ?? 0}
              label="Failed payments"
              tone={(failedPayments ?? 0) > 0 ? "error" : "neutral"}
              icon={<IconCreditCard />}
            />
          </Link>
        </div>
      </section>

      {/* 5. Roadmap progress */}
      <section className="mt-6">
        <h2 className="lc-section-heading text-lg font-semibold text-deep-indigo">
          <IconBadge size="sm"><IconMap /></IconBadge>
          Roadmap progress
        </h2>
        <Card className="mt-3 flex items-center gap-4 text-sm">
          <IconBadge><IconMap /></IconBadge>
          <div>
            {activePhase ? (
              <p>
                Active phase: <span className="font-medium">{activePhase.name}</span>
              </p>
            ) : (
              <p className="text-soft-taupe">No active roadmap phase.</p>
            )}
            <Link href="/roadmap/plan" className="mt-1 inline-block text-sm underline">
              View full roadmap
            </Link>
          </div>
        </Card>
      </section>

      {/* 6. Capacity */}
      <section className="mt-6">
        <h2 className="lc-section-heading text-lg font-semibold text-deep-indigo">
          <IconBadge size="sm"><IconGauge /></IconBadge>
          Capacity
        </h2>
        <div className="mt-3">
          <Link href="/operations/capacity">
            <StatTile value={capacityLabel} label="Actual vs. planned hours logged" icon={<IconGauge />} />
          </Link>
        </div>
      </section>

      {/* 7. Secondary metrics and history */}
      <details className="mt-8">
        <summary className="flex cursor-pointer items-center gap-2 text-sm text-deep-indigo underline">
          <IconBadge size="sm"><IconClock /></IconBadge>
          Secondary metrics and history
        </summary>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatTile
            value={blockers?.length ?? 0}
            label="Active blockers"
            tone={(blockers?.length ?? 0) > 0 ? "error" : "neutral"}
            icon={<IconFlag />}
          />
          <Card hover className="flex items-center gap-3 text-sm">
            <IconBadge><IconClock /></IconBadge>
            <Link href="/reviews/daily" className="text-deep-indigo underline">
              Open today&apos;s review
            </Link>
          </Card>
        </div>
      </details>
    </div>
  );
}
