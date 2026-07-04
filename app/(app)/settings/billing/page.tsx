import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { Card, PageHeader, StatusBadge, StatTile, IconBadge, IconUsers, IconBuilding, IconCpu, IconWrench, IconDollarSign } from "@/components/ui";
import { startCheckout, openBillingPortal } from "./actions";
import type { ReactNode } from "react";

const ENTITLEMENT_LABELS: Record<string, string> = {
  seats: "Seats",
  business_units: "Business units",
  ai_runs_per_month: "AI runs / month",
  automations_enabled: "Automations enabled",
};

const ENTITLEMENT_ICONS: Record<string, ReactNode> = {
  seats: <IconUsers />,
  business_units: <IconBuilding />,
  ai_runs_per_month: <IconCpu />,
  automations_enabled: <IconWrench />,
};

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; checkout?: string }>;
}) {
  const { error, checkout } = await searchParams;
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="p-8">
        <PageHeader title="Billing" />
        <p className="mt-2 text-sm text-soft-taupe">No workspace yet.</p>
      </div>
    );
  }

  const supabase = await createClient();

  const [{ data: subscription }, { data: plans }] = await Promise.all([
    supabase
      .from("workspace_subscriptions")
      .select("status, current_period_end, cancel_at_period_end, plan_id, subscription_plans(name, code)")
      .eq("workspace_id", workspaceId)
      .maybeSingle(),
    supabase
      .from("subscription_plans")
      .select("id, code, name, description, plan_prices(stripe_price_id, billing_interval, amount_cents), plan_entitlements(entitlement_key, limit_value, unit)")
      .eq("status", "active")
      .order("sort_order"),
  ]);

  const isActive = subscription && ["active", "trialing", "past_due"].includes(subscription.status);
  const currentPlan = subscription?.subscription_plans as unknown as { name: string; code: string } | null;

  let usage: { entitlement_key: string; current_value: number }[] = [];
  let entitlements: { entitlement_key: string; limit_value: number | null; unit: string | null }[] = [];

  if (isActive && subscription?.plan_id) {
    const [seatsCount, businessUnitsCount, automationsCount, entitlementRows] = await Promise.all([
      supabase.from("workspace_members").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("status", "active"),
      supabase.from("business_units").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId),
      supabase.from("automation_definitions").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("enabled", true),
      supabase.from("plan_entitlements").select("entitlement_key, limit_value, unit").eq("plan_id", subscription.plan_id),
    ]);

    usage = [
      { entitlement_key: "seats", current_value: seatsCount.count ?? 0 },
      { entitlement_key: "business_units", current_value: businessUnitsCount.count ?? 0 },
      { entitlement_key: "automations_enabled", current_value: automationsCount.count ?? 0 },
    ];
    entitlements = entitlementRows.data ?? [];
  }

  const usageByKey = new Map(usage.map((u) => [u.entitlement_key, u.current_value]));
  const entitlementByKey = new Map(entitlements.map((e) => [e.entitlement_key, e]));

  return (
    <div className="p-8">
      <PageHeader
        title="Billing"
        description="Subscription plan, seats, and usage limits for this workspace."
      />

      {error && (
        <p role="alert" className="mt-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          {decodeURIComponent(error)}
        </p>
      )}
      {checkout === "success" && (
        <p className="mt-4 rounded border border-soft-taupe bg-soft-lavender/10 p-3 text-sm">
          Subscription confirmed. It may take a few seconds for the plan to appear below.
        </p>
      )}

      {isActive ? (
        <Card className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="lc-section-heading text-lg font-semibold text-deep-indigo">
              <IconBadge size="sm"><IconDollarSign /></IconBadge>
              {currentPlan?.name ?? "Current plan"}
            </h2>
            <StatusBadge status={subscription!.status} />
          </div>
          {subscription!.current_period_end && (
            <p className="mt-1 text-sm text-soft-taupe">
              {subscription!.cancel_at_period_end ? "Cancels" : "Renews"} {new Date(subscription!.current_period_end).toLocaleDateString()}
            </p>
          )}

          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {["seats", "business_units", "ai_runs_per_month", "automations_enabled"].map((key) => {
              const entitlement = entitlementByKey.get(key);
              const current = usageByKey.get(key);
              const limit = entitlement?.limit_value;
              const atLimit = current !== undefined && limit != null && current >= limit;
              return (
                <StatTile
                  key={key}
                  value={current !== undefined ? `${current}${limit != null ? ` / ${limit}` : ""}` : limit != null ? `${limit}` : "Unlimited"}
                  label={ENTITLEMENT_LABELS[key] ?? key}
                  tone={atLimit ? "warning" : "neutral"}
                  icon={ENTITLEMENT_ICONS[key]}
                />
              );
            })}
          </div>

          <form action={openBillingPortal} className="mt-4">
            <button type="submit" className="lc-btn-secondary">Manage billing</button>
          </form>
        </Card>
      ) : (
        <>
          <p className="mt-6 text-sm text-soft-taupe">No active subscription yet. Choose a plan to activate this workspace.</p>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {plans?.map((plan) => {
              const price = (plan.plan_prices as unknown as { stripe_price_id: string | null; billing_interval: string; amount_cents: number | null }[])[0];
              return (
                <Card key={plan.id}>
                  <h3 className="text-lg font-semibold text-deep-indigo">{plan.name}</h3>
                  {plan.description && <p className="mt-1 text-sm text-soft-taupe">{plan.description}</p>}
                  <ul className="mt-2 space-y-1 text-xs text-soft-taupe">
                    {(plan.plan_entitlements as unknown as { entitlement_key: string; limit_value: number | null }[]).map((e) => (
                      <li key={e.entitlement_key}>
                        {ENTITLEMENT_LABELS[e.entitlement_key] ?? e.entitlement_key}: {e.limit_value ?? "Unlimited"}
                      </li>
                    ))}
                  </ul>
                  <form action={startCheckout} className="mt-3">
                    <input type="hidden" name="stripe_price_id" value={price?.stripe_price_id ?? ""} />
                    <button
                      type="submit"
                      disabled={!price?.stripe_price_id}
                      className="lc-btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {price?.stripe_price_id ? "Subscribe" : "Price not configured yet"}
                    </button>
                  </form>
                </Card>
              );
            })}
          </div>
        </>
      )}

      <Card className="mt-8 text-sm text-soft-taupe">
        Subscriptions run through Stripe Checkout and the Stripe Customer
        Portal — this app never stores card details itself. Plans control
        access without weakening security (Section 18&apos;s stated
        acceptance criterion): every table&apos;s Row Level Security policy is
        unchanged by plan tier, only the usage limits shown above are
        plan-gated.
      </Card>
    </div>
  );
}
