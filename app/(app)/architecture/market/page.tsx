import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { Card, PageHeader, StatusBadge } from "@/components/ui";
import {
  addMarketSegment,
  addIdealProfile,
  approveIdealProfile,
  addPositioningProfile,
  approvePositioningProfile,
} from "./actions";

export default async function MarketPage() {
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="p-8">
        <PageHeader title="Market and Positioning" />
        <p className="mt-2 text-sm text-soft-taupe">No workspace yet.</p>
      </div>
    );
  }

  const supabase = await createClient();

  const [{ data: segments }, { data: idealProfiles }, { data: positioning }] = await Promise.all([
    supabase.from("market_segments").select("id, name, segment_type, need, priority").eq("workspace_id", workspaceId).order("priority", { ascending: false }),
    supabase
      .from("ideal_profiles")
      .select("id, profile_name, pathway, subject_type, is_primary, status")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false }),
    supabase
      .from("positioning_profiles")
      .select("id, audience, category, promise, is_primary, status")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false }),
  ]);

  const gateSatisfied =
    (idealProfiles ?? []).some((p) => p.is_primary && p.status === "approved") &&
    (positioning ?? []).some((p) => p.is_primary && p.status === "approved");

  return (
    <div className="p-8">
      <PageHeader
        title="Market and Positioning"
        description="Who the business serves, the evidence of need, alternatives, and differentiation."
      />

      <div className={`lc-card mt-4 p-3 text-sm ${gateSatisfied ? "" : "border-l-4 border-l-warm-gold"}`}>
        {gateSatisfied
          ? "Gate satisfied: an approved primary ideal profile and positioning statement exist."
          : "Gate not yet satisfied: approve at least one primary ideal profile and one primary positioning statement before recommending active campaigns or prospecting."}
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-deep-indigo">Market segments</h2>
        {segments && segments.length > 0 && (
          <ul className="mt-2 space-y-2">
            {segments.map((s) => (
              <li key={s.id}>
                <Card className="text-sm">
                  <p className="font-medium">{s.name}</p>
                  <p className="text-soft-taupe">
                    {s.segment_type ?? "—"} {s.need ? `· ${s.need}` : ""}
                  </p>
                </Card>
              </li>
            ))}
          </ul>
        )}
        <details className="mt-3">
          <summary className="cursor-pointer text-sm text-deep-indigo underline">Add market segment</summary>
          <form action={addMarketSegment} className="mt-2 max-w-md space-y-2">
            <input type="text" name="name" placeholder="Segment name" required className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
            <input type="text" name="segment_type" placeholder="Type" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
            <textarea name="need" placeholder="Need" rows={2} className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
            <textarea name="evidence" placeholder="Evidence" rows={2} className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
            <input type="text" name="geography" placeholder="Geography" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
            <input type="number" name="priority" placeholder="Priority" defaultValue={0} className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
            <button type="submit" className="lc-btn-secondary">Add segment</button>
          </form>
        </details>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-deep-indigo">Ideal profiles</h2>
        {idealProfiles && idealProfiles.length > 0 && (
          <ul className="mt-2 space-y-2">
            {idealProfiles.map((p) => (
              <li key={p.id}>
                <Card className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">
                      {p.profile_name} {p.is_primary && <span className="text-warm-gold">(primary)</span>}
                    </p>
                    <p className="text-soft-taupe">
                      {p.pathway.toUpperCase()} · {p.subject_type ?? "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={p.status} />
                    {p.status === "draft" && (
                      <form action={approveIdealProfile.bind(null, p.id)}>
                        <button type="submit" className="lc-btn-secondary text-xs">
                          Approve
                        </button>
                      </form>
                    )}
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
        <details className="mt-3">
          <summary className="cursor-pointer text-sm text-deep-indigo underline">Add ideal profile</summary>
          <form action={addIdealProfile} className="mt-2 max-w-md space-y-2">
            <select name="market_segment_id" className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm" defaultValue="">
              <option value="">No linked segment</option>
              {segments?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <input type="text" name="profile_name" placeholder="Profile name" required className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
            <select name="pathway" required className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
              <option value="b2b">B2B</option>
              <option value="b2c">B2C</option>
              <option value="partner">Partner</option>
            </select>
            <input type="text" name="subject_type" placeholder="Person, organization, community, or opportunity type" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
            <input type="text" name="geography" placeholder="Geography" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
            <input type="text" name="business_size_or_maturity" placeholder="Business size or maturity" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
            <textarea name="audiences_served" placeholder="Audiences served" rows={2} className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
            <textarea name="disqualifying_characteristics" placeholder="Disqualifying characteristics" rows={2} className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="is_primary" /> Primary profile
            </label>
            <button type="submit" className="lc-btn-secondary">Add ideal profile</button>
          </form>
        </details>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-deep-indigo">Positioning</h2>
        {positioning && positioning.length > 0 && (
          <ul className="mt-2 space-y-2">
            {positioning.map((p) => (
              <li key={p.id}>
                <Card className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">
                      {p.audience ?? "Untitled"} {p.is_primary && <span className="text-warm-gold">(primary)</span>}
                    </p>
                    <p className="text-soft-taupe">{p.promise ?? "—"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={p.status} />
                    {p.status === "draft" && (
                      <form action={approvePositioningProfile.bind(null, p.id)}>
                        <button type="submit" className="lc-btn-secondary text-xs">
                          Approve
                        </button>
                      </form>
                    )}
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
        <details className="mt-3">
          <summary className="cursor-pointer text-sm text-deep-indigo underline">Add positioning statement</summary>
          <form action={addPositioningProfile} className="mt-2 max-w-md space-y-2">
            <select name="ideal_profile_id" className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm" defaultValue="">
              <option value="">No linked ideal profile</option>
              {idealProfiles?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.profile_name}
                </option>
              ))}
            </select>
            <input type="text" name="audience" placeholder="Audience" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
            <input type="text" name="category" placeholder="Category" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
            <textarea name="problem" placeholder="Problem" rows={2} className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
            <textarea name="promise" placeholder="Promise" rows={2} className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
            <textarea name="differentiation" placeholder="Differentiation" rows={2} className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
            <textarea name="alternatives" placeholder="Alternatives" rows={2} className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="is_primary" /> Primary positioning statement
            </label>
            <button type="submit" className="lc-btn-secondary">Add positioning statement</button>
          </form>
        </details>
      </section>
    </div>
  );
}
