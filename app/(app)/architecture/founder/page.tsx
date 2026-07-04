import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { Card, PageHeader, StatusBadge } from "@/components/ui";
import { saveFounderProfile, approveFounderProfile, addDecisionPrinciple } from "./actions";

export default async function FounderPage() {
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="p-8">
        <PageHeader title="Founder and Leadership" />
        <p className="mt-2 text-sm text-soft-taupe">No workspace yet.</p>
      </div>
    );
  }

  const supabase = await createClient();

  const [{ data: profile }, { data: principles }] = await Promise.all([
    supabase.from("founder_profiles").select("*").eq("workspace_id", workspaceId).maybeSingle(),
    supabase
      .from("decision_principles")
      .select("id, name, principle, priority, active")
      .eq("workspace_id", workspaceId)
      .order("priority", { ascending: false }),
  ]);

  const prioritizedValues: string[] = Array.isArray(profile?.prioritized_values) ? profile.prioritized_values : [];

  return (
    <div className="p-8">
      <PageHeader
        title="Founder and Leadership"
        description="Translate the founder's identity, role, values, capacity, and decision principles into operational guidance."
        actions={
          profile ? (
            <>
              <StatusBadge status={profile.status} />
              {profile.status === "draft" && (
                <form action={approveFounderProfile}>
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
        <form action={saveFounderProfile} className="space-y-4">
          <div>
            <label htmlFor="role_statement" className="block text-sm font-medium text-deep-indigo">
              Founder role statement
            </label>
            <textarea
              id="role_statement"
              name="role_statement"
              rows={2}
              defaultValue={profile?.role_statement ?? ""}
              className="mt-1 w-full rounded border border-soft-taupe px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="leadership_responsibilities" className="block text-sm font-medium text-deep-indigo">
              Leadership responsibilities
            </label>
            <textarea
              id="leadership_responsibilities"
              name="leadership_responsibilities"
              rows={2}
              defaultValue={profile?.leadership_responsibilities ?? ""}
              className="mt-1 w-full rounded border border-soft-taupe px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="prioritized_values" className="block text-sm font-medium text-deep-indigo">
              Prioritized values <span className="text-xs text-soft-taupe">(one per line, in priority order)</span>
            </label>
            <textarea
              id="prioritized_values"
              name="prioritized_values"
              rows={3}
              defaultValue={prioritizedValues.join("\n")}
              className="mt-1 w-full rounded border border-soft-taupe px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="strengths_and_patterns" className="block text-sm font-medium text-deep-indigo">
              Strengths and known patterns
            </label>
            <textarea
              id="strengths_and_patterns"
              name="strengths_and_patterns"
              rows={2}
              defaultValue={profile?.strengths_and_patterns ?? ""}
              className="mt-1 w-full rounded border border-soft-taupe px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="boundaries_triggers_responses" className="block text-sm font-medium text-deep-indigo">
              Boundaries, triggers, and responses
            </label>
            <textarea
              id="boundaries_triggers_responses"
              name="boundaries_triggers_responses"
              rows={2}
              defaultValue={profile?.boundaries_triggers_responses ?? ""}
              className="mt-1 w-full rounded border border-soft-taupe px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="non_negotiables" className="block text-sm font-medium text-deep-indigo">
              Non-negotiables
            </label>
            <textarea
              id="non_negotiables"
              name="non_negotiables"
              rows={2}
              defaultValue={profile?.non_negotiables ?? ""}
              className="mt-1 w-full rounded border border-soft-taupe px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="capacity_constraints" className="block text-sm font-medium text-deep-indigo">
              Capacity constraints <span className="text-xs text-soft-taupe">(time, energy, health, care, family, season)</span>
            </label>
            <textarea
              id="capacity_constraints"
              name="capacity_constraints"
              rows={2}
              defaultValue={profile?.capacity_constraints ?? ""}
              className="mt-1 w-full rounded border border-soft-taupe px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="support_requirements" className="block text-sm font-medium text-deep-indigo">
              Support requirements
            </label>
            <textarea
              id="support_requirements"
              name="support_requirements"
              rows={2}
              defaultValue={profile?.support_requirements ?? ""}
              className="mt-1 w-full rounded border border-soft-taupe px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="review_cadence" className="block text-sm font-medium text-deep-indigo">
              Review cadence
            </label>
            <select
              id="review_cadence"
              name="review_cadence"
              defaultValue={profile?.review_cadence ?? "quarterly"}
              className="mt-1 w-full max-w-xs rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm"
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="semiannual">Semiannual</option>
              <option value="annual">Annual</option>
            </select>
          </div>
          <button type="submit" className="lc-btn-primary">
            Save profile{profile ? ` (v${(profile.version ?? 1) + 1})` : ""}
          </button>
        </form>
      </Card>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-deep-indigo">Decision principles</h2>
        <p className="mt-1 text-sm text-soft-taupe">Reusable filters for testing a decision against what matters.</p>

        {principles && principles.length > 0 && (
          <ul className="mt-3 space-y-2">
            {principles.map((p) => (
              <li key={p.id}>
                <Card className={`text-sm ${p.active ? "" : "opacity-50"}`}>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-soft-taupe">{p.principle}</p>
                </Card>
              </li>
            ))}
          </ul>
        )}

        <form action={addDecisionPrinciple} className="mt-4 max-w-md space-y-2">
          <input
            type="text"
            name="name"
            placeholder="Principle name"
            required
            className="w-full rounded border border-soft-taupe px-3 py-2 text-sm"
          />
          <textarea
            name="principle"
            placeholder="The principle itself"
            required
            rows={2}
            className="w-full rounded border border-soft-taupe px-3 py-2 text-sm"
          />
          <input
            type="number"
            name="priority"
            placeholder="Priority (higher = more important)"
            defaultValue={0}
            className="w-full rounded border border-soft-taupe px-3 py-2 text-sm"
          />
          <button type="submit" className="lc-btn-secondary">
            Add principle
          </button>
        </form>
      </section>
    </div>
  );
}
