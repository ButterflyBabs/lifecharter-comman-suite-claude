"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";

export async function createForecast(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  await supabase.from("revenue_forecasts").insert({
    workspace_id: workspaceId,
    period: formData.get("period") as string,
    scenario: formData.get("scenario") as string,
  });

  revalidatePath("/revenue/forecast");
}

export async function addForecastLine(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  await supabase.from("forecast_lines").insert({
    workspace_id: workspaceId,
    forecast_id: formData.get("forecast_id") as string,
    category: formData.get("category") as string,
    opportunity_id: (formData.get("opportunity_id") as string) || null,
    amount: Number(formData.get("amount")),
    expected_date: (formData.get("expected_date") as string) || null,
    confidence: formData.get("confidence") as string,
    assumption: formData.get("assumption") as string,
  });

  revalidatePath("/revenue/forecast");
}
