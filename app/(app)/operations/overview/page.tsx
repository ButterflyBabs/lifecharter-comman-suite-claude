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
  IconUsers,
  IconShieldAlert,
  IconWrench,
  IconFlag,
  IconClock,
  IconPlug,
  IconCalendar,
} from "@/components/ui";

const WIDGETS: WidgetDefinition[] = [
  { key: "team_and_continuity", title: "Team and Continuity" },
  { key: "systems", title: "Systems" },
  { key: "risk_and_vendors", title: "Risk and Vendors" },
];

export default async function OperationsOverviewPage() {
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="p-8">
        <PageHeader title="Operations Overview" />
        <p className="mt-2 text-sm text-soft-taupe">No workspace yet.</p>
      </div>
    );
  }

  const supabase = await createClient();

  const [
    { count: activeTeams },
    { count: criticalResponsibilitiesWithoutBackup },
    { count: automationsNeedingAttention },
    { count: openRisks },
    { count: sopsDueForReview },
    { count: integrationErrors },
    { count: vendorsRenewingSoon },
    savedLayout,
  ] = await Promise.all([
    supabase.from("teams").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("status", "active"),
    supabase.from("responsibilities").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("criticality", "critical").is("backup_member_id", null),
    supabase.from("automation_definitions").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("enabled", false),
    supabase.from("risks").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).neq("status", "closed"),
    supabase.from("sops").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).lte("review_at", new Date().toISOString().slice(0, 10)),
    supabase.from("integration_accounts").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("status", "error"),
    supabase.from("vendors").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).lte("renewal_at", new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)),
    getDashboardLayout("operations_overview"),
  ]);

  const widgetContent: Record<string, ReactNode> = {
    team_and_continuity: (
      <section>
        <h2 className="lc-section-heading text-lg font-semibold text-deep-indigo">
          <IconBadge size="sm"><IconUsers /></IconBadge>
          Team and Continuity
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatTile value={activeTeams ?? 0} label="Active teams" icon={<IconUsers />} />
          <StatTile
            value={criticalResponsibilitiesWithoutBackup ?? 0}
            label="Critical responsibilities without backup"
            tone={(criticalResponsibilitiesWithoutBackup ?? 0) > 0 ? "error" : "neutral"}
            icon={<IconShieldAlert />}
          />
        </div>
      </section>
    ),
    systems: (
      <section>
        <h2 className="lc-section-heading text-lg font-semibold text-deep-indigo">
          <IconBadge size="sm"><IconWrench /></IconBadge>
          Systems
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatTile
            value={automationsNeedingAttention ?? 0}
            label="Automations not yet enabled"
            tone={(automationsNeedingAttention ?? 0) > 0 ? "warning" : "neutral"}
            icon={<IconWrench />}
          />
          <StatTile
            value={sopsDueForReview ?? 0}
            label="SOPs due for review"
            tone={(sopsDueForReview ?? 0) > 0 ? "warning" : "neutral"}
            icon={<IconClock />}
          />
          <StatTile
            value={integrationErrors ?? 0}
            label="Integrations in error state"
            tone={(integrationErrors ?? 0) > 0 ? "error" : "neutral"}
            icon={<IconPlug />}
          />
        </div>
      </section>
    ),
    risk_and_vendors: (
      <section>
        <h2 className="lc-section-heading text-lg font-semibold text-deep-indigo">
          <IconBadge size="sm"><IconFlag /></IconBadge>
          Risk and Vendors
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatTile
            value={openRisks ?? 0}
            label="Open risks"
            tone={(openRisks ?? 0) > 0 ? "error" : "neutral"}
            icon={<IconFlag />}
          />
          <StatTile
            value={vendorsRenewingSoon ?? 0}
            label="Vendor renewals within 30 days"
            tone={(vendorsRenewingSoon ?? 0) > 0 ? "warning" : "neutral"}
            icon={<IconCalendar />}
          />
        </div>
      </section>
    ),
  };

  return (
    <div className="p-8">
      <PageHeader
        title="Operations Overview"
        description="Team, capacity, systems, finance, risk, integrations, and vendors in one action-oriented view."
      />

      <div className="mt-6">
        <DashboardGrid pageKey="operations_overview" widgets={WIDGETS} widgetContent={widgetContent} savedLayout={savedLayout} />
      </div>

      <section className="mt-8">
        <h2 className="lc-section-heading text-lg font-semibold text-deep-indigo">
          <IconBadge size="sm"><IconCompass /></IconBadge>
          Go to
        </h2>
        <div className="mt-2 flex flex-wrap gap-2 text-sm">
          <Link href="/operations/team" className="lc-btn-secondary">Team and Roles</Link>
          <Link href="/operations/capacity" className="lc-btn-secondary">Capacity</Link>
          <Link href="/operations/sops" className="lc-btn-secondary">SOPs</Link>
          <Link href="/operations/automations" className="lc-btn-secondary">Automations</Link>
          <Link href="/operations/finance" className="lc-btn-secondary">Finance</Link>
          <Link href="/operations/legal-risk" className="lc-btn-secondary">Legal and Risk</Link>
          <Link href="/operations/technology" className="lc-btn-secondary">Technology</Link>
          <Link href="/operations/integrations" className="lc-btn-secondary">Integrations</Link>
          <Link href="/operations/vendors" className="lc-btn-secondary">Vendors</Link>
        </div>
      </section>

      <Card className="mt-8 text-sm text-soft-taupe">
        A unified operational action center that assigns an owner, response
        action, and date to every critical alert above (Section 6&apos;s stated
        rule) is deferred — the underlying counts are real and queried live,
        but there is no dedicated action-queue object yet tying an alert to a
        specific follow-up task. Use <Link href="/work" className="underline">Work</Link>{" "}
        for now to track the follow-up itself.
      </Card>
    </div>
  );
}
