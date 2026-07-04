import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { Card, PageHeader, StatusBadge } from "@/components/ui";
import { saveStrategyProfile, approveStrategyProfile, addGoal, addKeyResult } from "./actions";

export default async function StrategyPage() {
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="p-8">
        <PageHeader title="Vision and Strategy" />
        <p className="mt-2 text-sm text-soft-taupe">No workspace yet.</p>
      </div>
    );
  }

  const supabase = await createClient();

  const [{ data: profile }, { data: domains }] = await Promise.all([
    supabase.from("strategy_profiles").select("*").eq("workspace_id", workspaceId).maybeSingle(),
    supabase.from("business_command_domains").select("id, name").order("display_order"),
  ]);

  const { data: goals } = profile
    ? await supabase
        .from("goals")
        .select("id, title, metric, target, period, review_cadence, status, domain_id, business_command_domains(name)")
        .eq("strategy_profile_id", profile.id)
        .order("created_at", { ascending: false })
    : { data: null };

  const goalIds = (goals ?? []).map((g) => g.id);
  const { data: keyResults } =
    goalIds.length > 0
      ? await supabase
          .from("key_results")
          .select("id, goal_id, metric_definition, baseline, target, current_value, data_source")
          .in("goal_id", goalIds)
      : { data: null };

  const keyResultsByGoal = new Map<string, NonNullable<typeof keyResults>>();
  for (const kr of keyResults ?? []) {
    if (!keyResultsByGoal.has(kr.goal_id)) keyResultsByGoal.set(kr.goal_id, []);
    keyResultsByGoal.get(kr.goal_id)!.push(kr);
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Vision and Strategy"
        description="Direction, strategic choices, goals, constraints, and the logic connecting them."
        actions={
          profile ? (
            <>
              <StatusBadge status={profile.status} />
              {profile.status === "draft" && (
                <form action={approveStrategyProfile}>
                  <button type="submit" className="lc-btn-secondary">
                    Approve
                  </button>
                </form>
              )}
            </>
          ) : undefined
        }
      />

      <Card className="mt-6">
        <form action={saveStrategyProfile} className="space-y-4">
          <div>
            <label htmlFor="vision" className="block text-sm font-medium text-deep-indigo">
              Vision
            </label>
            <textarea
              id="vision"
              name="vision"
              rows={2}
              defaultValue={profile?.vision ?? ""}
              className="mt-1 w-full rounded border border-soft-taupe px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="mission" className="block text-sm font-medium text-deep-indigo">
              Mission
            </label>
            <textarea
              id="mission"
              name="mission"
              rows={2}
              defaultValue={profile?.mission ?? ""}
              className="mt-1 w-full rounded border border-soft-taupe px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="strategic_thesis" className="block text-sm font-medium text-deep-indigo">
              Strategic thesis
            </label>
            <textarea
              id="strategic_thesis"
              name="strategic_thesis"
              rows={2}
              defaultValue={profile?.strategic_thesis ?? ""}
              className="mt-1 w-full rounded border border-soft-taupe px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="horizon" className="block text-sm font-medium text-deep-indigo">
                Horizon
              </label>
              <input
                id="horizon"
                name="horizon"
                type="text"
                placeholder="e.g. 3-year"
                defaultValue={profile?.horizon ?? ""}
                className="mt-1 w-full rounded border border-soft-taupe px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label htmlFor="rationale_and_tradeoffs" className="block text-sm font-medium text-deep-indigo">
              Rationale and tradeoffs
            </label>
            <textarea
              id="rationale_and_tradeoffs"
              name="rationale_and_tradeoffs"
              rows={2}
              defaultValue={profile?.rationale_and_tradeoffs ?? ""}
              className="mt-1 w-full rounded border border-soft-taupe px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="constraints" className="block text-sm font-medium text-deep-indigo">
              Constraints
            </label>
            <textarea
              id="constraints"
              name="constraints"
              rows={2}
              defaultValue={profile?.constraints ?? ""}
              className="mt-1 w-full rounded border border-soft-taupe px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="strategic_bets" className="block text-sm font-medium text-deep-indigo">
              Strategic bets and hypotheses
            </label>
            <textarea
              id="strategic_bets"
              name="strategic_bets"
              rows={2}
              defaultValue={profile?.strategic_bets ?? ""}
              className="mt-1 w-full rounded border border-soft-taupe px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="not_doing" className="block text-sm font-medium text-deep-indigo">
              What the business will not do
            </label>
            <textarea
              id="not_doing"
              name="not_doing"
              rows={2}
              defaultValue={profile?.not_doing ?? ""}
              className="mt-1 w-full rounded border border-soft-taupe px-3 py-2 text-sm"
            />
          </div>
          <button type="submit" className="lc-btn-primary">
            Save strategy{profile ? ` (v${(profile.version ?? 1) + 1})` : ""}
          </button>
        </form>
      </Card>

      {profile && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-deep-indigo">Goals</h2>
          <p className="mt-1 text-sm text-soft-taupe">
            Every goal links to a domain, metric, owner, review cadence, and observable target.
          </p>

          {goals && goals.length > 0 && (
            <ul className="mt-3 space-y-3">
              {goals.map((g) => (
                <li key={g.id}>
                  <Card className="text-sm">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{g.title}</p>
                      <StatusBadge status={g.status} />
                    </div>
                    <p className="text-soft-taupe">
                      {(g.business_command_domains as unknown as { name: string } | null)?.name ?? "No domain"} · {g.metric} → {g.target}
                      {g.period ? ` · ${g.period}` : ""} · reviewed {g.review_cadence}
                    </p>

                    {(keyResultsByGoal.get(g.id) ?? []).length > 0 && (
                      <ul className="mt-2 space-y-1 pl-4">
                        {(keyResultsByGoal.get(g.id) ?? []).map((kr) => (
                          <li key={kr.id} className="text-xs text-soft-taupe">
                            {kr.metric_definition}: {kr.current_value ?? "—"} / {kr.target}
                            {kr.baseline !== null ? ` (baseline ${kr.baseline})` : ""}
                          </li>
                        ))}
                      </ul>
                    )}

                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs text-deep-indigo underline">Add key result</summary>
                      <form action={addKeyResult} className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <input type="hidden" name="goal_id" value={g.id} />
                        <input
                          type="text"
                          name="metric_definition"
                          placeholder="Metric definition"
                          required
                          className="rounded border border-soft-taupe px-2 py-1 text-xs"
                        />
                        <input
                          type="number"
                          name="target"
                          placeholder="Target"
                          required
                          step="any"
                          className="rounded border border-soft-taupe px-2 py-1 text-xs"
                        />
                        <input
                          type="number"
                          name="baseline"
                          placeholder="Baseline"
                          step="any"
                          className="rounded border border-soft-taupe px-2 py-1 text-xs"
                        />
                        <input
                          type="number"
                          name="current_value"
                          placeholder="Current value"
                          step="any"
                          className="rounded border border-soft-taupe px-2 py-1 text-xs"
                        />
                        <input
                          type="text"
                          name="data_source"
                          placeholder="Data source"
                          className="rounded border border-soft-taupe px-2 py-1 text-xs sm:col-span-2"
                        />
                        <button type="submit" className="lc-btn-secondary text-xs sm:col-span-2">
                          Add
                        </button>
                      </form>
                    </details>
                  </Card>
                </li>
              ))}
            </ul>
          )}

          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-deep-indigo underline">Add goal</summary>
            <form action={addGoal} className="mt-2 max-w-md space-y-2">
              <input type="hidden" name="strategy_profile_id" value={profile.id} />
              <input
                type="text"
                name="title"
                placeholder="Goal title"
                required
                className="w-full rounded border border-soft-taupe px-3 py-2 text-sm"
              />
              <select
                name="domain_id"
                className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm"
                defaultValue=""
              >
                <option value="">No domain</option>
                {domains?.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                name="metric"
                placeholder="Metric (e.g. MRR)"
                required
                className="w-full rounded border border-soft-taupe px-3 py-2 text-sm"
              />
              <input
                type="text"
                name="target"
                placeholder="Observable target"
                required
                className="w-full rounded border border-soft-taupe px-3 py-2 text-sm"
              />
              <input
                type="text"
                name="period"
                placeholder="Period (e.g. Q1 2026)"
                className="w-full rounded border border-soft-taupe px-3 py-2 text-sm"
              />
              <select
                name="review_cadence"
                defaultValue="quarterly"
                className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm"
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="semiannual">Semiannual</option>
                <option value="annual">Annual</option>
              </select>
              <button type="submit" className="lc-btn-secondary">
                Add goal
              </button>
            </form>
          </details>
        </section>
      )}
    </div>
  );
}
