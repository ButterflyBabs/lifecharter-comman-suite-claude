import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { Card, PageHeader, StatusBadge } from "@/components/ui";
import { createOffer, addOfferDeliverable, setOfferStatus } from "./actions";

export default async function OffersPage() {
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="p-8">
        <PageHeader title="Offer Portfolio" />
        <p className="mt-2 text-sm text-soft-taupe">No workspace yet.</p>
      </div>
    );
  }

  const supabase = await createClient();

  const { data: offers } = await supabase
    .from("offers")
    .select("id, name, offer_type, audience, status, current_version_id")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  const versionIds = (offers ?? []).map((o) => o.current_version_id).filter(Boolean) as string[];

  const { data: versions } =
    versionIds.length > 0
      ? await supabase
          .from("offer_versions")
          .select("id, version, problem, desired_outcome, format, duration")
          .in("id", versionIds)
      : { data: null };

  const versionById = new Map((versions ?? []).map((v) => [v.id, v]));

  const { data: deliverables } =
    versionIds.length > 0
      ? await supabase
          .from("offer_deliverables")
          .select("id, offer_version_id, title, client_visible, sequence")
          .in("offer_version_id", versionIds)
          .order("sequence")
      : { data: null };

  const deliverablesByVersion = new Map<string, NonNullable<typeof deliverables>>();
  for (const d of deliverables ?? []) {
    if (!deliverablesByVersion.has(d.offer_version_id)) deliverablesByVersion.set(d.offer_version_id, []);
    deliverablesByVersion.get(d.offer_version_id)!.push(d);
  }

  return (
    <div className="p-8">
      <PageHeader title="Offer Portfolio" description="Design and govern the complete offer ecosystem." />

      {offers && offers.length > 0 && (
        <ul className="mt-6 space-y-4">
          {offers.map((o) => {
            const version = o.current_version_id ? versionById.get(o.current_version_id) : undefined;
            return (
              <li key={o.id}>
                <Card>
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-deep-indigo">{o.name}</h2>
                      <p className="text-sm text-soft-taupe">
                        {o.offer_type ?? "—"} {o.audience ? `· ${o.audience}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={o.status} />
                      {o.status === "draft" && (
                        <form action={setOfferStatus.bind(null, o.id, "active")}>
                          <button type="submit" className="lc-btn-secondary text-xs">
                            Activate
                          </button>
                        </form>
                      )}
                      {o.status === "active" && (
                        <form action={setOfferStatus.bind(null, o.id, "retired")}>
                          <button type="submit" className="lc-btn-secondary text-xs">
                            Retire
                          </button>
                        </form>
                      )}
                    </div>
                  </div>

                  {version && (
                    <div className="mt-3 text-sm">
                      <p className="text-soft-taupe">Problem: {version.problem ?? "—"}</p>
                      <p className="text-soft-taupe">Desired outcome: {version.desired_outcome ?? "—"}</p>
                      <p className="text-soft-taupe">
                        {version.format ?? "—"} {version.duration ? `· ${version.duration}` : ""}
                      </p>

                      {(deliverablesByVersion.get(version.id) ?? []).length > 0 && (
                        <ul className="mt-2 list-disc pl-5">
                          {(deliverablesByVersion.get(version.id) ?? []).map((d) => (
                            <li key={d.id}>{d.title}</li>
                          ))}
                        </ul>
                      )}

                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs text-deep-indigo underline">Add deliverable</summary>
                        <form action={addOfferDeliverable} className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <input type="hidden" name="offer_version_id" value={version.id} />
                          <input type="text" name="title" placeholder="Deliverable title" required className="rounded border border-soft-taupe px-2 py-1 text-xs sm:col-span-2" />
                          <textarea name="description" placeholder="Description" rows={2} className="rounded border border-soft-taupe px-2 py-1 text-xs sm:col-span-2" />
                          <input type="text" name="owner_role" placeholder="Owner role" className="rounded border border-soft-taupe px-2 py-1 text-xs" />
                          <input type="number" name="sequence" placeholder="Sequence" className="rounded border border-soft-taupe px-2 py-1 text-xs" />
                          <label className="flex items-center gap-2 text-xs sm:col-span-2">
                            <input type="checkbox" name="client_visible" defaultChecked /> Client visible
                          </label>
                          <button type="submit" className="lc-btn-secondary text-xs sm:col-span-2">
                            Add
                          </button>
                        </form>
                      </details>
                    </div>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <details className="mt-6">
        <summary className="cursor-pointer text-sm text-deep-indigo underline">Create offer</summary>
        <form action={createOffer} className="mt-2 max-w-md space-y-2">
          <input type="text" name="name" placeholder="Offer name" required className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <input type="text" name="offer_type" placeholder="Offer type" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <input type="text" name="audience" placeholder="Primary audience" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <textarea name="problem" placeholder="Problem addressed" rows={2} className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <textarea name="desired_outcome" placeholder="Desired outcome" rows={2} className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <input type="text" name="format" placeholder="Delivery format" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <input type="text" name="duration" placeholder="Duration" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <button type="submit" className="lc-btn-primary">Create offer</button>
        </form>
      </details>
    </div>
  );
}
