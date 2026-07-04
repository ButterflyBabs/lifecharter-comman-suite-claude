"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";

function num(formData: FormData, key: string): number | null {
  const value = formData.get(key);
  if (!value || value === "") return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

export async function savePricing(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const offerVersionId = formData.get("offer_version_id") as string;
  const supabase = await createClient();

  await supabase.from("offer_pricing").upsert(
    {
      workspace_id: workspaceId,
      offer_version_id: offerVersionId,
      currency: (formData.get("currency") as string) || "USD",
      price: Number(formData.get("price")),
      billing_type: formData.get("billing_type") as string,
      installments: num(formData, "installments"),
      deposit: num(formData, "deposit"),
      refund_and_cancellation_policy: formData.get("refund_and_cancellation_policy") as string,
    },
    { onConflict: "offer_version_id" },
  );

  await supabase.from("offer_capacity_models").upsert(
    {
      workspace_id: workspaceId,
      offer_version_id: offerVersionId,
      max_clients: num(formData, "max_clients"),
      coach_hours: num(formData, "coach_hours"),
      prep_hours: num(formData, "prep_hours"),
      support_hours: num(formData, "support_hours"),
      team_hours: num(formData, "team_hours"),
      team_cost: num(formData, "team_cost"),
      capacity_period: formData.get("capacity_period") as string,
      founder_energy_load: formData.get("founder_energy_load") as string,
    },
    { onConflict: "offer_version_id" },
  );

  await supabase.from("offer_economics").upsert(
    {
      workspace_id: workspaceId,
      offer_version_id: offerVersionId,
      delivery_cost: num(formData, "delivery_cost"),
      software_and_fulfillment_cost: num(formData, "software_and_fulfillment_cost"),
      acquisition_cost: num(formData, "acquisition_cost"),
      gross_margin: num(formData, "gross_margin"),
      revenue_per_delivery_hour: num(formData, "revenue_per_delivery_hour"),
      break_even_point: num(formData, "break_even_point"),
      renewal_and_expansion_value: num(formData, "renewal_and_expansion_value"),
      minimum_enrollment: num(formData, "minimum_enrollment"),
      assumptions_and_scenario_version: formData.get("assumptions_and_scenario_version") as string,
    },
    { onConflict: "offer_version_id" },
  );

  revalidatePath("/architecture/pricing");
}
