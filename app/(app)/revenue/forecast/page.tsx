import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { Card, PageHeader } from "@/components/ui";
import { createForecast, addForecastLine } from "./actions";

export default async function ForecastPage() {
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="p-8">
        <PageHeader title="Revenue Forecast" />
        <p className="mt-2 text-sm text-soft-taupe">No workspace yet.</p>
      </div>
    );
  }

  const supabase = await createClient();

  const [{ data: forecasts }, { data: opportunities }] = await Promise.all([
    supabase
      .from("revenue_forecasts")
      .select("id, period, scenario, generated_at")
      .eq("workspace_id", workspaceId)
      .order("generated_at", { ascending: false }),
    supabase.from("opportunities").select("id, name").eq("workspace_id", workspaceId).eq("status", "open"),
  ]);

  const forecastIds = (forecasts ?? []).map((f) => f.id);
  const { data: lines } =
    forecastIds.length > 0
      ? await supabase
          .from("forecast_lines")
          .select("id, forecast_id, category, amount, expected_date, confidence")
          .in("forecast_id", forecastIds)
      : { data: null };

  const linesByForecast = new Map<string, NonNullable<typeof lines>>();
  for (const l of lines ?? []) {
    if (!linesByForecast.has(l.forecast_id)) linesByForecast.set(l.forecast_id, []);
    linesByForecast.get(l.forecast_id)!.push(l);
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Revenue Forecast"
        description="Combine pipeline, contracts, payment schedules, renewals, and capacity into a transparent forecast."
      />

      {forecasts && forecasts.length > 0 && (
        <ul className="mt-6 space-y-3">
          {forecasts.map((f) => {
            const forecastLines = linesByForecast.get(f.id) ?? [];
            const total = forecastLines.reduce((sum, l) => sum + Number(l.amount), 0);
            return (
              <li key={f.id}>
                <Card className="text-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">
                      {f.period} · {f.scenario.replace("_", " ")}
                    </p>
                    <p className="font-semibold text-deep-indigo">${total.toLocaleString()}</p>
                  </div>
                  {forecastLines.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {forecastLines.map((l) => (
                        <li key={l.id} className="text-soft-taupe">
                          {l.category.replace(/_/g, " ")}: ${Number(l.amount).toLocaleString()}
                          {l.expected_date ? ` · ${l.expected_date}` : ""}
                          {l.confidence ? ` · ${l.confidence}` : ""}
                        </li>
                      ))}
                    </ul>
                  )}

                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-deep-indigo underline">Add forecast line</summary>
                    <form action={addForecastLine} className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <input type="hidden" name="forecast_id" value={f.id} />
                      <select name="category" required className="rounded border border-soft-taupe bg-ivory-light px-2 py-1 text-xs sm:col-span-2">
                        <option value="committed">Committed</option>
                        <option value="scheduled_cash">Scheduled cash</option>
                        <option value="weighted_pipeline">Weighted pipeline</option>
                        <option value="best_case">Best case</option>
                        <option value="base_case">Base case</option>
                        <option value="downside">Downside</option>
                        <option value="renewal">Renewal</option>
                        <option value="capacity_ceiling">Capacity ceiling</option>
                      </select>
                      <select name="opportunity_id" defaultValue="" className="rounded border border-soft-taupe bg-ivory-light px-2 py-1 text-xs sm:col-span-2">
                        <option value="">No linked opportunity</option>
                        {opportunities?.map((o) => (
                          <option key={o.id} value={o.id}>{o.name}</option>
                        ))}
                      </select>
                      <input type="number" name="amount" placeholder="Amount" step="any" required className="rounded border border-soft-taupe px-2 py-1 text-xs" />
                      <input type="date" name="expected_date" className="rounded border border-soft-taupe px-2 py-1 text-xs" />
                      <input type="text" name="confidence" placeholder="Confidence" className="rounded border border-soft-taupe px-2 py-1 text-xs" />
                      <input type="text" name="assumption" placeholder="Assumption" className="rounded border border-soft-taupe px-2 py-1 text-xs" />
                      <button type="submit" className="lc-btn-secondary text-xs sm:col-span-2">Add line</button>
                    </form>
                  </details>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <details className="mt-6">
        <summary className="cursor-pointer text-sm text-deep-indigo underline">Create forecast</summary>
        <form action={createForecast} className="mt-2 max-w-md space-y-2">
          <input type="text" name="period" placeholder="Period (e.g. Q1 2026)" required className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <select name="scenario" defaultValue="base_case" className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
            <option value="best_case">Best case</option>
            <option value="base_case">Base case</option>
            <option value="downside">Downside</option>
          </select>
          <button type="submit" className="lc-btn-primary">Create forecast</button>
        </form>
      </details>
    </div>
  );
}
