import type { ReactNode } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { getDashboardLayout } from "@/lib/dashboard/get-layout";
import { DashboardGrid } from "@/components/dashboard/DashboardGrid";
import type { WidgetDefinition } from "@/lib/dashboard/types";
import {
  Card,
  PageHeader,
  StatTile,
  IconBadge,
  IconCompass,
  IconCpu,
  IconCheckCircle,
  IconClipboard,
  IconFlag,
  IconBookOpen,
  IconShieldAlert,
  IconDollarSign,
} from "@/components/ui";

const WIDGETS: WidgetDefinition[] = [
  { key: "agents_and_approvals", title: "Agents and Approvals" },
  { key: "activity", title: "Activity" },
  { key: "knowledge_and_policy", title: "Knowledge and Policy" },
  { key: "cost", title: "Cost" },
];

export default async function AiOverviewPage() {
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="p-8">
        <PageHeader title="AI Overview" />
        <p className="mt-2 text-sm text-soft-taupe">No workspace yet.</p>
      </div>
    );
  }

  const supabase = await createClient();

  const [
    { count: activeAgents },
    { count: pendingApprovals },
    { count: recentOutputs },
    { count: failedRuns },
    { count: staleKnowledge },
    { count: policyExceptions },
    { data: costEvents },
    savedLayout,
  ] = await Promise.all([
    supabase.from("ai_agents").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("status", "active"),
    supabase.from("ai_outputs").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("status", "pending_approval"),
    supabase.from("ai_outputs").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    supabase.from("ai_runs").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("status", "failed"),
    supabase.from("ai_knowledge_sources").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("conflict_status", "flagged"),
    supabase.from("ai_knowledge_sources").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("active", true).lt("freshness_at", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()),
    supabase.from("ai_cost_events").select("total_cost").eq("workspace_id", workspaceId),
    getDashboardLayout("ai_overview"),
  ]);

  const totalCost = (costEvents ?? []).reduce((sum, c) => sum + Number(c.total_cost ?? 0), 0);

  const widgetContent: Record<string, ReactNode> = {
    agents_and_approvals: (
      <section>
        <h2 className="lc-section-heading text-lg font-semibold text-deep-indigo">
          <IconBadge size="sm"><IconCpu /></IconBadge>
          Agents and Approvals
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatTile value={activeAgents ?? 0} label="Active agents" icon={<IconCpu />} />
          <StatTile
            value={pendingApprovals ?? 0}
            label="Pending approvals"
            tone={(pendingApprovals ?? 0) > 0 ? "warning" : "neutral"}
            icon={<IconCheckCircle />}
          />
        </div>
      </section>
    ),
    activity: (
      <section>
        <h2 className="lc-section-heading text-lg font-semibold text-deep-indigo">
          <IconBadge size="sm"><IconClipboard /></IconBadge>
          Activity
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatTile value={recentOutputs ?? 0} label="Outputs this week" icon={<IconClipboard />} />
          <StatTile
            value={failedRuns ?? 0}
            label="Failed runs"
            tone={(failedRuns ?? 0) > 0 ? "error" : "neutral"}
            icon={<IconFlag />}
          />
        </div>
      </section>
    ),
    knowledge_and_policy: (
      <section>
        <h2 className="lc-section-heading text-lg font-semibold text-deep-indigo">
          <IconBadge size="sm"><IconBookOpen /></IconBadge>
          Knowledge and Policy
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatTile
            value={staleKnowledge ?? 0}
            label="Knowledge sources overdue for refresh"
            tone={(staleKnowledge ?? 0) > 0 ? "warning" : "neutral"}
            icon={<IconBookOpen />}
          />
          <StatTile
            value={policyExceptions ?? 0}
            label="Flagged knowledge conflicts"
            tone={(policyExceptions ?? 0) > 0 ? "error" : "neutral"}
            icon={<IconShieldAlert />}
          />
        </div>
      </section>
    ),
    cost: (
      <section>
        <h2 className="lc-section-heading text-lg font-semibold text-deep-indigo">
          <IconBadge size="sm"><IconDollarSign /></IconBadge>
          Cost
        </h2>
        <div className="mt-3">
          <StatTile value={`$${totalCost.toLocaleString()}`} label="Total AI cost" icon={<IconDollarSign />} />
        </div>
      </section>
    ),
  };

  return (
    <div className="p-8">
      <PageHeader
        title="AI Overview"
        description="Active agents, pending approvals, recent work, failures, usage, cost, and policy exceptions."
      />

      <div className="mt-6">
        <DashboardGrid pageKey="ai_overview" widgets={WIDGETS} widgetContent={widgetContent} savedLayout={savedLayout} />
      </div>

      <section className="mt-8">
        <h2 className="lc-section-heading text-lg font-semibold text-deep-indigo">
          <IconBadge size="sm"><IconCompass /></IconBadge>
          Go to
        </h2>
        <div className="mt-2 flex flex-wrap gap-2 text-sm">
          <Link href="/ai/agents" className="lc-btn-secondary">Agent Roster</Link>
          <Link href="/ai/knowledge" className="lc-btn-secondary">Knowledge Sources</Link>
          <Link href="/ai/approvals" className="lc-btn-secondary">Approval Queue</Link>
          <Link href="/ai/runs" className="lc-btn-secondary">Run History</Link>
          <Link href="/ai/policies" className="lc-btn-secondary">Policies</Link>
          <Link href="/ai/usage" className="lc-btn-secondary">Usage and Cost</Link>
        </div>
      </section>

      <Card className="mt-8 text-sm text-soft-taupe">
        No live model calls happen in this build (per the standing decision
        for this phase) — agents, runs, and outputs are recorded manually so
        the approval-gate, run-history, and cost-tracking tables are real and
        enforced ahead of any future live AI integration.
      </Card>
    </div>
  );
}
