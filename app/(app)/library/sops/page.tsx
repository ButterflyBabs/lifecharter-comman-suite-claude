import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { Card, PageHeader, StatusBadge } from "@/components/ui";

// SOPs already have full identity + versioned-content CRUD at
// /operations/sops (Phase 6), including the enable-gate trigger. Rather than
// stand up a second, divergent place to edit the same object, this Library
// section is a searchable, read-only index that links back there — the same
// "reuse the richer existing object, don't fork it" choice as Phase 4's
// Outreach page.

export default async function Page() {
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="p-8">
        <PageHeader title="SOPs" />
        <p className="mt-2 text-sm text-soft-taupe">No workspace yet.</p>
      </div>
    );
  }

  const supabase = await createClient();
  const { data: sops } = await supabase
    .from("sops")
    .select("id, name, business_area, status, review_at")
    .eq("workspace_id", workspaceId)
    .order("name");

  return (
    <div className="p-8">
      <PageHeader
        title="SOPs"
        description="Findable index of every standard operating procedure. Edit or version an SOP from Operations -> SOPs."
      />

      <ul className="mt-6 space-y-2">
        {(sops ?? []).map((s) => (
          <li key={s.id}>
            <Card className="text-sm">
              <div className="flex items-center justify-between">
                <p className="font-medium">{s.name}</p>
                <StatusBadge status={s.status} />
              </div>
              {s.business_area && <p className="text-soft-taupe">{s.business_area}</p>}
              {s.review_at && <p className="text-xs text-soft-taupe">Review by {new Date(s.review_at).toLocaleDateString()}</p>}
            </Card>
          </li>
        ))}
        {(!sops || sops.length === 0) && <p className="text-sm text-soft-taupe">No SOPs yet.</p>}
      </ul>

      <p className="mt-6 text-sm">
        <Link href="/operations/sops" className="text-deep-indigo underline">
          Manage SOPs and versions in Operations
        </Link>
      </p>
    </div>
  );
}
