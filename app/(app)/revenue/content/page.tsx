import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { Card, PageHeader, StatusBadge } from "@/components/ui";
import { createContentAsset, advanceContentStatus, setContentChecks } from "./actions";

export default async function ContentPage() {
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="p-8">
        <PageHeader title="Content" />
        <p className="mt-2 text-sm text-soft-taupe">No workspace yet.</p>
      </div>
    );
  }

  const supabase = await createClient();

  const [{ data: content }, { data: campaigns }, { data: offers }] = await Promise.all([
    supabase
      .from("content_assets")
      .select("id, title, format, status, claim_check_status, accessibility_check_status, published_url")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false }),
    supabase.from("campaigns").select("id, name").eq("workspace_id", workspaceId),
    supabase.from("offers").select("id, name").eq("workspace_id", workspaceId),
  ]);

  return (
    <div className="p-8">
      <PageHeader
        title="Content"
        description="Create, approve, publish, repurpose, and measure content tied to audience, offer, campaign, funnel stage, and CTA."
      />

      {content && content.length > 0 && (
        <ul className="mt-6 space-y-3">
          {content.map((c) => {
            const canPublish = c.claim_check_status === "passed" && c.accessibility_check_status === "passed";
            return (
              <li key={c.id}>
                <Card className="text-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{c.title}</p>
                    <StatusBadge status={c.status} />
                  </div>
                  <p className="text-soft-taupe">{c.format ?? "—"}</p>
                  <p className="mt-1 text-xs text-soft-taupe">
                    Claim check: {c.claim_check_status} · Accessibility check: {c.accessibility_check_status}
                  </p>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {c.status !== "archived" && (c.status !== "needs_review" || canPublish) && (
                      <form action={advanceContentStatus}>
                        <input type="hidden" name="content_id" value={c.id} />
                        <input type="hidden" name="current_status" value={c.status} />
                        <button type="submit" className="lc-btn-secondary text-xs">Advance status</button>
                      </form>
                    )}
                  </div>

                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-deep-indigo underline">Set checks</summary>
                    <form action={setContentChecks} className="mt-2 flex flex-wrap gap-2">
                      <input type="hidden" name="content_id" value={c.id} />
                      <select name="claim_check_status" defaultValue={c.claim_check_status} className="rounded border border-soft-taupe bg-ivory-light px-2 py-1 text-xs">
                        <option value="pending">Claim: pending</option>
                        <option value="passed">Claim: passed</option>
                        <option value="flagged">Claim: flagged</option>
                      </select>
                      <select name="accessibility_check_status" defaultValue={c.accessibility_check_status} className="rounded border border-soft-taupe bg-ivory-light px-2 py-1 text-xs">
                        <option value="pending">Accessibility: pending</option>
                        <option value="passed">Accessibility: passed</option>
                        <option value="flagged">Accessibility: flagged</option>
                      </select>
                      <button type="submit" className="lc-btn-secondary text-xs">Save</button>
                    </form>
                  </details>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <details className="mt-6">
        <summary className="cursor-pointer text-sm text-deep-indigo underline">Create content</summary>
        <form action={createContentAsset} className="mt-2 max-w-md space-y-2">
          <input type="text" name="title" placeholder="Title" required className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <input type="text" name="format" placeholder="Format" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <input type="text" name="topic_and_pillar" placeholder="Topic and content pillar" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <input type="text" name="audience" placeholder="Audience" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <input type="text" name="funnel_stage" placeholder="Funnel stage" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <select name="campaign_id" defaultValue="" className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
            <option value="">No linked campaign</option>
            {campaigns?.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select name="offer_id" defaultValue="" className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
            <option value="">No linked offer</option>
            {offers?.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
          <input type="text" name="cta" placeholder="Call to action" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <button type="submit" className="lc-btn-primary">Create content</button>
        </form>
      </details>
    </div>
  );
}
