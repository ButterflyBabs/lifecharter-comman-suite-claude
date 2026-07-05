import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { isWorkspaceAdmin } from "@/lib/data/workspace";
import { Card, PageHeader, StatusBadge } from "@/components/ui";
import { saveAiKey, revokeAiKey } from "./actions";

export default async function AiCredentialsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="p-8">
        <PageHeader title="AI Keys" />
        <p className="mt-2 text-sm text-soft-taupe">No workspace yet.</p>
      </div>
    );
  }

  const supabase = await createClient();
  const admin = await isWorkspaceAdmin(workspaceId);

  const { data: credentials } = await supabase
    .from("workspace_ai_credentials")
    .select("id, provider, model, label, key_last4, status, created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  const active = (credentials ?? []).filter((c) => c.status === "active");

  return (
    <div className="max-w-3xl p-8">
      <PageHeader
        title="AI Keys (Bring Your Own)"
        description="Your API key powers the AI that interprets your Business Command Audit. It's stored encrypted in a secure vault, used only server-side, and can never be read back — you'll only ever see the last four characters."
      />

      {error && (
        <p
          role="alert"
          className="mt-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
        >
          {decodeURIComponent(error)}
        </p>
      )}

      <Card className="mt-6">
        <h2 className="text-lg font-semibold text-deep-indigo">Current keys</h2>
        {active.length === 0 ? (
          <p className="mt-2 text-sm text-soft-taupe">
            No key configured. Add one below to enable AI findings and adaptive follow-ups. (The audit and its
            deterministic scores work without a key.)
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-[var(--card-border)]">
            {active.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-deep-indigo">
                    {c.label || c.provider} <span className="text-soft-taupe">•••• {c.key_last4}</span>
                  </p>
                  <p className="text-xs text-soft-taupe">
                    {c.provider}
                    {c.model ? ` · ${c.model}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={c.status} />
                  {admin && (
                    <form action={revokeAiKey}>
                      <input type="hidden" name="credential_id" value={c.id} />
                      <button
                        type="submit"
                        className="rounded border border-soft-taupe px-3 py-1 text-xs text-deep-indigo focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-deep-indigo"
                      >
                        Revoke
                      </button>
                    </form>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {admin ? (
        <Card className="mt-4">
          <h2 className="text-lg font-semibold text-deep-indigo">Add a key</h2>
          <form action={saveAiKey} className="mt-3 space-y-4">
            <div>
              <label htmlFor="provider" className="block text-sm font-medium text-deep-indigo">
                Provider
              </label>
              <select
                id="provider"
                name="provider"
                defaultValue="anthropic"
                className="mt-1 w-full max-w-xs rounded border border-soft-taupe bg-transparent px-3 py-2 text-sm text-deep-indigo"
              >
                <option value="anthropic">Anthropic (Claude)</option>
                <option value="openai">OpenAI</option>
              </select>
            </div>
            <div>
              <label htmlFor="model" className="block text-sm font-medium text-deep-indigo">
                Model <span className="text-xs text-soft-taupe">(optional)</span>
              </label>
              <input
                id="model"
                name="model"
                type="text"
                placeholder="claude-sonnet-5"
                className="mt-1 w-full max-w-xs rounded border border-soft-taupe bg-transparent px-3 py-2 text-sm text-deep-indigo"
              />
            </div>
            <div>
              <label htmlFor="label" className="block text-sm font-medium text-deep-indigo">
                Label <span className="text-xs text-soft-taupe">(optional)</span>
              </label>
              <input
                id="label"
                name="label"
                type="text"
                placeholder="Company Anthropic key"
                className="mt-1 w-full max-w-xs rounded border border-soft-taupe bg-transparent px-3 py-2 text-sm text-deep-indigo"
              />
            </div>
            <div>
              <label htmlFor="api_key" className="block text-sm font-medium text-deep-indigo">
                API key
              </label>
              <input
                id="api_key"
                name="api_key"
                type="password"
                autoComplete="off"
                required
                placeholder="sk-ant-…"
                className="mt-1 w-full max-w-md rounded border border-soft-taupe bg-transparent px-3 py-2 text-sm text-deep-indigo"
              />
              <p className="mt-1 text-xs text-soft-taupe">
                Stored encrypted in the vault immediately. We can&apos;t display it again after saving.
              </p>
            </div>
            <button
              type="submit"
              className="lc-btn-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sacred-teal"
            >
              Save key
            </button>
          </form>
        </Card>
      ) : (
        <p className="mt-4 text-sm text-soft-taupe">
          Only the Workspace Owner or an Administrator can manage AI keys.
        </p>
      )}
    </div>
  );
}
