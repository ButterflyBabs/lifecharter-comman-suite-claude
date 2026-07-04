import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { Card, PageHeader, StatusBadge } from "@/components/ui";
import { connectProvider, disconnectAccount, testConnection } from "./actions";

export default async function IntegrationsPage() {
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

  const [{ data: accounts }, { data: providers }] = await Promise.all([
    supabase
      .from("integration_accounts")
      .select("id, status, connected_user, sync_direction, sync_frequency, connected_at, last_success_at, integration_providers(name, adapter_code)")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false }),
    supabase.from("integration_providers").select("id, name, adapter_code").eq("active", true).order("name"),
  ]);

  return (
    <div className="p-8">
      <PageHeader
        title="Integrations"
        description="Connect providers through Global Control with source-of-truth, mapping, sync, conflict, and error rules."
      />

      {accounts && accounts.length > 0 ? (
        <ul className="mt-6 space-y-3">
          {accounts.map((a) => {
            const provider = a.integration_providers as unknown as { name: string; adapter_code: string } | null;
            return (
              <li key={a.id}>
                <Card className="text-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{provider?.name ?? "Unknown provider"}</p>
                    <StatusBadge status={a.status} />
                  </div>
                  {a.connected_user && <p className="text-soft-taupe">Connected as {a.connected_user}</p>}
                  <p className="text-xs text-soft-taupe">
                    {a.sync_direction ? `${a.sync_direction} sync` : "No sync direction set"}
                    {a.sync_frequency ? ` · ${a.sync_frequency}` : ""}
                    {a.last_success_at ? ` · last success ${new Date(a.last_success_at).toLocaleString()}` : ""}
                  </p>
                  <div className="mt-2 flex gap-2">
                    {a.status !== "disconnected" && (
                      <>
                        <form action={testConnection}>
                          <input type="hidden" name="account_id" value={a.id} />
                          <button type="submit" className="lc-btn-secondary text-xs">Test connection</button>
                        </form>
                        <form action={disconnectAccount}>
                          <input type="hidden" name="account_id" value={a.id} />
                          <button type="submit" className="lc-btn-secondary text-xs">Disconnect</button>
                        </form>
                      </>
                    )}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-6 text-sm text-soft-taupe">No connected providers yet.</p>
      )}

      <details className="mt-6">
        <summary className="cursor-pointer text-sm text-deep-indigo underline">Connect a provider</summary>
        <form action={connectProvider} className="mt-2 max-w-md space-y-2">
          <select name="provider_id" required className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
            <option value="">Select provider&hellip;</option>
            {providers?.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <input type="text" name="connected_user" placeholder="Connected user or account" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <select name="sync_direction" defaultValue="" className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
            <option value="">Sync direction&hellip;</option>
            <option value="inbound">Inbound</option>
            <option value="outbound">Outbound</option>
            <option value="bidirectional">Bidirectional</option>
          </select>
          <button type="submit" className="lc-btn-primary">Connect</button>
        </form>
      </details>

      <Card className="mt-6 text-sm text-soft-taupe">
        Credentials are stored as an encrypted reference, never a raw secret,
        and are never exposed client-side (Section 6&apos;s stated rule) — this
        page only ever writes to <code>auth_reference</code>, never a plaintext
        credential column.
      </Card>
    </div>
  );
}
