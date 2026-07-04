import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { Card, PageHeader, StatusBadge } from "@/components/ui";
import { createCampaign, approveCampaignLaunch } from "./actions";

export default async function CampaignsPage() {
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="p-8">
        <PageHeader title="Campaigns" />
        <p className="mt-2 text-sm text-soft-taupe">No workspace yet.</p>
      </div>
    );
  }

  const supabase = await createClient();

  const [{ data: campaigns }, { data: offers }] = await Promise.all([
    supabase
      .from("campaigns")
      .select("id, name, objective, status, budget, launch_approved_at, scheduled_close_review_at, tracking_code")
      .eq("workspace_id", workspaceId)
      .is("archived_at", null)
      .order("created_at", { ascending: false }),
    supabase.from("offers").select("id, name").eq("workspace_id", workspaceId),
  ]);

  return (
    <div className="p-8">
      <PageHeader
        title="Campaigns"
        description="Coordinate multi-asset initiatives with goals, audiences, timing, budget, and attribution."
      />

      {campaigns && campaigns.length > 0 && (
        <ul className="mt-6 space-y-3">
          {campaigns.map((c) => {
            const gateSatisfied = Boolean(c.objective && c.tracking_code && c.launch_approved_at && c.scheduled_close_review_at);
            return (
              <li key={c.id}>
                <Card className="text-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{c.name}</p>
                    <StatusBadge status={c.status} />
                  </div>
                  <p className="text-soft-taupe">
                    {c.objective ?? "—"} {c.budget ? `· budget $${c.budget}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-soft-taupe">
                    {gateSatisfied ? "Launch gate satisfied" : "Launch gate not yet satisfied (objective, tracking, approval, close review)"}
                  </p>
                  {!c.launch_approved_at && (
                    <form action={approveCampaignLaunch} className="mt-2">
                      <input type="hidden" name="campaign_id" value={c.id} />
                      <button type="submit" className="lc-btn-secondary text-xs">Approve launch</button>
                    </form>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <details className="mt-6">
        <summary className="cursor-pointer text-sm text-deep-indigo underline">Create campaign</summary>
        <form action={createCampaign} className="mt-2 max-w-md space-y-2">
          <input type="text" name="name" placeholder="Campaign name" required className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <input type="text" name="campaign_type" placeholder="Type" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <input type="text" name="objective" placeholder="Objective" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <input type="text" name="audience" placeholder="Audience" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <select name="offer_id" defaultValue="" className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
            <option value="">No linked offer</option>
            {offers?.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
          <input type="text" name="cta" placeholder="Call to action" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <div className="grid grid-cols-2 gap-2">
            <input type="date" name="start_at" className="rounded border border-soft-taupe px-3 py-2 text-sm" />
            <input type="date" name="end_at" className="rounded border border-soft-taupe px-3 py-2 text-sm" />
          </div>
          <input type="number" name="budget" placeholder="Budget" step="any" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <input type="text" name="tracking_code" placeholder="Tracking code" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <div>
            <label htmlFor="scheduled_close_review_at" className="block text-xs text-soft-taupe">Scheduled close review</label>
            <input type="date" id="scheduled_close_review_at" name="scheduled_close_review_at" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          </div>
          <button type="submit" className="lc-btn-primary">Create campaign</button>
        </form>
      </details>
    </div>
  );
}
