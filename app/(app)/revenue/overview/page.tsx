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
  IconTrendingUp,
  IconCheckCircle,
  IconDollarSign,
  IconReceipt,
  IconClipboard,
  IconCalendar,
} from "@/components/ui";

const WIDGETS: WidgetDefinition[] = [
  { key: "demand", title: "Demand" },
  { key: "pipeline", title: "Pipeline" },
  { key: "cash_and_forecast", title: "Cash and Forecast" },
  { key: "action_queues", title: "Action Queues" },
];

export default async function RevenueOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ business_unit?: string }>;
}) {
  const { business_unit: businessUnitFilter } = await searchParams;
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="p-8">
        <PageHeader title="Revenue Overview" />
        <p className="mt-2 text-sm text-soft-taupe">No workspace yet.</p>
      </div>
    );
  }

  const supabase = await createClient();

  let newLeadsQuery = supabase.from("leads").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("status", "new");
  let qualifiedLeadsQuery = supabase.from("leads").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("status", "qualified");
  let openOpportunitiesQuery = supabase.from("opportunities").select("id, expected_value, weighted_value").eq("workspace_id", workspaceId).eq("status", "open");
  let unpaidInvoicesQuery = supabase.from("invoices").select("id, amount_due, status").eq("workspace_id", workspaceId).neq("status", "paid");

  if (businessUnitFilter) {
    newLeadsQuery = newLeadsQuery.eq("business_unit_id", businessUnitFilter);
    qualifiedLeadsQuery = qualifiedLeadsQuery.eq("business_unit_id", businessUnitFilter);
    openOpportunitiesQuery = openOpportunitiesQuery.eq("business_unit_id", businessUnitFilter);
    unpaidInvoicesQuery = unpaidInvoicesQuery.eq("business_unit_id", businessUnitFilter);
  }

  const [
    { count: newLeadsCount },
    { count: qualifiedLeadsCount },
    { data: openOpportunities },
    { count: proposalsNeedingAction },
    { count: contractsNeedingAction },
    { data: unpaidInvoices },
    { data: latestForecast },
    { data: businessUnits },
    savedLayout,
  ] = await Promise.all([
    newLeadsQuery,
    qualifiedLeadsQuery,
    openOpportunitiesQuery,
    supabase.from("proposals").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).in("status", ["draft", "sent", "viewed"]),
    supabase.from("contracts").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).in("status", ["draft", "sent"]),
    unpaidInvoicesQuery,
    supabase.from("revenue_forecasts").select("id, period, scenario").eq("workspace_id", workspaceId).order("generated_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("business_units").select("id, name").eq("workspace_id", workspaceId).eq("status", "active").order("name"),
    getDashboardLayout("revenue_overview"),
  ]);

  const pipelineValue = (openOpportunities ?? []).reduce((sum, o) => sum + Number(o.expected_value ?? 0), 0);
  const weightedValue = (openOpportunities ?? []).reduce((sum, o) => sum + Number(o.weighted_value ?? 0), 0);
  const receivables = (unpaidInvoices ?? []).reduce((sum, i) => sum + Number(i.amount_due ?? 0), 0);

  const widgetContent: Record<string, ReactNode> = {
    demand: (
      <section>
        <h2 className="lc-section-heading text-lg font-semibold text-deep-indigo">
          <IconBadge size="sm"><IconTrendingUp /></IconBadge>
          Demand
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatTile value={newLeadsCount ?? 0} label="New leads" icon={<IconTrendingUp />} />
          <StatTile value={qualifiedLeadsCount ?? 0} label="Qualified leads" icon={<IconCheckCircle />} />
        </div>
      </section>
    ),
    pipeline: (
      <section>
        <h2 className="lc-section-heading text-lg font-semibold text-deep-indigo">
          <IconBadge size="sm"><IconDollarSign /></IconBadge>
          Pipeline
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatTile value={(openOpportunities ?? []).length} label="Open opportunities" icon={<IconTrendingUp />} />
          <StatTile value={`$${pipelineValue.toLocaleString()}`} label="Pipeline value" icon={<IconDollarSign />} />
          <StatTile value={`$${weightedValue.toLocaleString()}`} label="Weighted pipeline" icon={<IconDollarSign />} />
        </div>
      </section>
    ),
    cash_and_forecast: (
      <section>
        <h2 className="lc-section-heading text-lg font-semibold text-deep-indigo">
          <IconBadge size="sm"><IconReceipt /></IconBadge>
          Cash and Forecast
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatTile value={`$${receivables.toLocaleString()}`} label="Outstanding receivables" icon={<IconReceipt />} />
          <StatTile
            value={latestForecast?.period ?? "—"}
            label={latestForecast ? `Latest forecast (${latestForecast.scenario.replace("_", " ")})` : "No forecast yet"}
            icon={<IconCalendar />}
          />
        </div>
      </section>
    ),
    action_queues: (
      <section>
        <h2 className="lc-section-heading text-lg font-semibold text-deep-indigo">
          <IconBadge size="sm"><IconClipboard /></IconBadge>
          Action Queues
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatTile
            value={proposalsNeedingAction ?? 0}
            label="Proposals needing action"
            tone={(proposalsNeedingAction ?? 0) > 0 ? "warning" : "neutral"}
            icon={<IconClipboard />}
          />
          <StatTile
            value={contractsNeedingAction ?? 0}
            label="Contracts needing action"
            tone={(contractsNeedingAction ?? 0) > 0 ? "warning" : "neutral"}
            icon={<IconClipboard />}
          />
        </div>
      </section>
    ),
  };

  return (
    <div className="p-8">
      <PageHeader
        title="Revenue Overview"
        description="One view of demand, pipeline, contracts, cash, forecast, attribution, and action queues."
      />

      {businessUnits && businessUnits.length > 0 && (
        <form method="get" className="mt-4 flex items-center gap-2 text-sm">
          <label htmlFor="business_unit" className="text-soft-taupe">Business unit</label>
          <select
            id="business_unit"
            name="business_unit"
            defaultValue={businessUnitFilter ?? ""}
            className="rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm"
          >
            <option value="">All (leads, opportunities, invoices)</option>
            {businessUnits.map((bu) => (
              <option key={bu.id} value={bu.id}>{bu.name}</option>
            ))}
          </select>
          <button type="submit" className="lc-btn-secondary text-xs">Filter</button>
        </form>
      )}

      <div className="mt-6">
        <DashboardGrid pageKey="revenue_overview" widgets={WIDGETS} widgetContent={widgetContent} savedLayout={savedLayout} />
      </div>

      <section className="mt-8">
        <h2 className="lc-section-heading text-lg font-semibold text-deep-indigo">
          <IconBadge size="sm"><IconCompass /></IconBadge>
          Go to
        </h2>
        <div className="mt-2 flex flex-wrap gap-2 text-sm">
          <Link href="/revenue/pipeline" className="lc-btn-secondary">Sales Pipeline</Link>
          <Link href="/revenue/outreach" className="lc-btn-secondary">Outreach</Link>
          <Link href="/revenue/proposals" className="lc-btn-secondary">Proposals</Link>
          <Link href="/revenue/contracts" className="lc-btn-secondary">Contracts</Link>
          <Link href="/revenue/payments" className="lc-btn-secondary">Payments</Link>
          <Link href="/revenue/forecast" className="lc-btn-secondary">Forecast</Link>
        </div>
      </section>

      <Card className="mt-8 text-sm text-soft-taupe">
        Attribution, stalled-opportunity detection, and AI-drafted next-best-actions
        (Section 6) are deferred — they depend on campaign/source data volume this
        workspace doesn&apos;t have yet, and on the AI action layer, which per the
        standing instruction is built once human-approval gating exists.
      </Card>
    </div>
  );
}
