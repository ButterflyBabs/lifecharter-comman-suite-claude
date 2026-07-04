import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { Card, PageHeader } from "@/components/ui";
import { savePricing } from "./actions";

export default async function PricingPage() {
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="p-8">
        <PageHeader title="Pricing and Economics" />
        <p className="mt-2 text-sm text-soft-taupe">No workspace yet.</p>
      </div>
    );
  }

  const supabase = await createClient();

  const { data: offers } = await supabase
    .from("offers")
    .select("id, name, current_version_id")
    .eq("workspace_id", workspaceId)
    .not("current_version_id", "is", null)
    .order("created_at", { ascending: false });

  const versionIds = (offers ?? []).map((o) => o.current_version_id).filter(Boolean) as string[];

  const [{ data: pricing }, { data: capacity }, { data: economics }] = await Promise.all([
    versionIds.length > 0
      ? supabase.from("offer_pricing").select("*").in("offer_version_id", versionIds)
      : Promise.resolve({ data: null }),
    versionIds.length > 0
      ? supabase.from("offer_capacity_models").select("*").in("offer_version_id", versionIds)
      : Promise.resolve({ data: null }),
    versionIds.length > 0
      ? supabase.from("offer_economics").select("*").in("offer_version_id", versionIds)
      : Promise.resolve({ data: null }),
  ]);

  const pricingByVersion = new Map((pricing ?? []).map((p) => [p.offer_version_id, p]));
  const capacityByVersion = new Map((capacity ?? []).map((c) => [c.offer_version_id, c]));
  const economicsByVersion = new Map((economics ?? []).map((e) => [e.offer_version_id, e]));

  if (!offers || offers.length === 0) {
    return (
      <div className="p-8">
        <PageHeader
          title="Pricing and Economics"
          description="Ensure every offer is financially viable and operationally sustainable."
        />
        <p className="mt-4 text-sm text-soft-taupe">
          No offers with a version yet — create one on the{" "}
          <a href="/architecture/offers" className="underline">
            Offer Portfolio
          </a>{" "}
          page first.
        </p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Pricing and Economics"
        description="Ensure every offer is financially viable and operationally sustainable."
      />

      <ul className="mt-6 space-y-4">
        {offers.map((o) => {
          const versionId = o.current_version_id as string;
          const p = pricingByVersion.get(versionId);
          const c = capacityByVersion.get(versionId);
          const e = economicsByVersion.get(versionId);

          return (
            <li key={o.id}>
              <Card>
                <h2 className="text-lg font-semibold text-deep-indigo">{o.name}</h2>
                {p && (
                  <p className="mt-1 text-sm text-soft-taupe">
                    {p.currency} {p.price} · {p.billing_type}
                    {e?.gross_margin != null ? ` · ${(e.gross_margin * 100).toFixed(0)}% margin` : ""}
                  </p>
                )}

                <details className="mt-3">
                  <summary className="cursor-pointer text-sm text-deep-indigo underline">
                    {p ? "Edit pricing and economics" : "Set pricing and economics"}
                  </summary>
                  <form action={savePricing} className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <input type="hidden" name="offer_version_id" value={versionId} />

                    <fieldset className="sm:col-span-2">
                      <legend className="text-xs font-semibold uppercase text-soft-taupe">Pricing</legend>
                      <div className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <input type="text" name="currency" placeholder="Currency" defaultValue={p?.currency ?? "USD"} className="rounded border border-soft-taupe px-2 py-1 text-sm" />
                        <input type="number" name="price" placeholder="Price" step="any" required defaultValue={p?.price ?? ""} className="rounded border border-soft-taupe px-2 py-1 text-sm" />
                        <select name="billing_type" defaultValue={p?.billing_type ?? "one_time"} className="rounded border border-soft-taupe bg-ivory-light px-2 py-1 text-sm">
                          <option value="one_time">One-time</option>
                          <option value="installments">Installments</option>
                          <option value="subscription">Subscription</option>
                        </select>
                        <input type="number" name="installments" placeholder="Installments" defaultValue={p?.installments ?? ""} className="rounded border border-soft-taupe px-2 py-1 text-sm" />
                        <input type="number" name="deposit" placeholder="Deposit" step="any" defaultValue={p?.deposit ?? ""} className="rounded border border-soft-taupe px-2 py-1 text-sm" />
                        <input type="text" name="refund_and_cancellation_policy" placeholder="Refund and cancellation policy" defaultValue={p?.refund_and_cancellation_policy ?? ""} className="rounded border border-soft-taupe px-2 py-1 text-sm sm:col-span-2" />
                      </div>
                    </fieldset>

                    <fieldset className="sm:col-span-2">
                      <legend className="text-xs font-semibold uppercase text-soft-taupe">Capacity</legend>
                      <div className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <input type="number" name="max_clients" placeholder="Max clients" defaultValue={c?.max_clients ?? ""} className="rounded border border-soft-taupe px-2 py-1 text-sm" />
                        <input type="number" name="coach_hours" placeholder="Coach hours" step="any" defaultValue={c?.coach_hours ?? ""} className="rounded border border-soft-taupe px-2 py-1 text-sm" />
                        <input type="number" name="prep_hours" placeholder="Prep hours" step="any" defaultValue={c?.prep_hours ?? ""} className="rounded border border-soft-taupe px-2 py-1 text-sm" />
                        <input type="number" name="support_hours" placeholder="Support hours" step="any" defaultValue={c?.support_hours ?? ""} className="rounded border border-soft-taupe px-2 py-1 text-sm" />
                        <input type="number" name="team_hours" placeholder="Team hours" step="any" defaultValue={c?.team_hours ?? ""} className="rounded border border-soft-taupe px-2 py-1 text-sm" />
                        <input type="number" name="team_cost" placeholder="Team cost" step="any" defaultValue={c?.team_cost ?? ""} className="rounded border border-soft-taupe px-2 py-1 text-sm" />
                        <input type="text" name="capacity_period" placeholder="Capacity period (e.g. per month)" defaultValue={c?.capacity_period ?? ""} className="rounded border border-soft-taupe px-2 py-1 text-sm" />
                        <input type="text" name="founder_energy_load" placeholder="Founder energy load" defaultValue={c?.founder_energy_load ?? ""} className="rounded border border-soft-taupe px-2 py-1 text-sm" />
                      </div>
                    </fieldset>

                    <fieldset className="sm:col-span-2">
                      <legend className="text-xs font-semibold uppercase text-soft-taupe">Economics</legend>
                      <div className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <input type="number" name="delivery_cost" placeholder="Delivery cost" step="any" defaultValue={e?.delivery_cost ?? ""} className="rounded border border-soft-taupe px-2 py-1 text-sm" />
                        <input type="number" name="software_and_fulfillment_cost" placeholder="Software and fulfillment cost" step="any" defaultValue={e?.software_and_fulfillment_cost ?? ""} className="rounded border border-soft-taupe px-2 py-1 text-sm" />
                        <input type="number" name="acquisition_cost" placeholder="Acquisition cost" step="any" defaultValue={e?.acquisition_cost ?? ""} className="rounded border border-soft-taupe px-2 py-1 text-sm" />
                        <input type="number" name="gross_margin" placeholder="Gross margin (0–1)" step="any" defaultValue={e?.gross_margin ?? ""} className="rounded border border-soft-taupe px-2 py-1 text-sm" />
                        <input type="number" name="revenue_per_delivery_hour" placeholder="Revenue per delivery hour" step="any" defaultValue={e?.revenue_per_delivery_hour ?? ""} className="rounded border border-soft-taupe px-2 py-1 text-sm" />
                        <input type="number" name="break_even_point" placeholder="Break-even point" step="any" defaultValue={e?.break_even_point ?? ""} className="rounded border border-soft-taupe px-2 py-1 text-sm" />
                        <input type="number" name="renewal_and_expansion_value" placeholder="Renewal and expansion value" step="any" defaultValue={e?.renewal_and_expansion_value ?? ""} className="rounded border border-soft-taupe px-2 py-1 text-sm" />
                        <input type="number" name="minimum_enrollment" placeholder="Minimum viable enrollment" defaultValue={e?.minimum_enrollment ?? ""} className="rounded border border-soft-taupe px-2 py-1 text-sm" />
                        <input type="text" name="assumptions_and_scenario_version" placeholder="Assumptions and scenario version" defaultValue={e?.assumptions_and_scenario_version ?? ""} className="rounded border border-soft-taupe px-2 py-1 text-sm sm:col-span-2" />
                      </div>
                    </fieldset>

                    <button type="submit" className="lc-btn-primary sm:col-span-2">
                      Save pricing and economics
                    </button>
                  </form>
                </details>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
