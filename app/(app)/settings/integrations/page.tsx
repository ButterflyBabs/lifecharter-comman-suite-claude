import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { Card, PageHeader, StatusBadge } from "@/components/ui";

// Integration connect/disconnect/test-connection CRUD already lives at
// /operations/integrations (Phase 6), including source-of-truth and sync
// rule configuration. Rather than fork a second connect flow, this is a
// read-only index linking back to it — the same pattern as Library's
// SOPs/Agreements sections.

export default async function IntegrationsSettingsPage() {
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="p-8">
        <PageHeader title="Integrations" />
        <p className="mt-2 text-sm text-soft-taupe">No workspace yet.</p>
      </div>
    );
  }

  const supabase = await createClient();
  const { data: accounts } = await supabase
    .from("integration_accounts")
    .select("id, status, connected_at, last_success_at, integration_providers(name)")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  return (
    <div className="p-8">
      <PageHeader
        title="Integrations"
        description="Connected providers at a glance. Connect, disconnect, and configure source-of-truth and sync rules from Operations -> Integrations."
      />

      <ul className="mt-6 space-y-2">
        {(accounts ?? []).map((a) => {
          const provider = a.integration_providers as unknown as { name: string } | null;
          return (
            <li key={a.id}>
              <Card className="text-sm">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{provider?.name ?? "Unknown provider"}</p>
                  <StatusBadge status={a.status} />
                </div>
                {a.last_success_at && <p className="text-xs text-soft-taupe">Last success {new Date(a.last_success_at).toLocaleString()}</p>}
              </Card>
            </li>
          );
        })}
        {(!accounts || accounts.length === 0) && <p className="text-sm text-soft-taupe">No integrations connected yet.</p>}
      </ul>

      <p className="mt-6 text-sm">
        <Link href="/operations/integrations" className="text-deep-indigo underline">
          Manage integrations in Operations
        </Link>
      </p>
    </div>
  );
}
