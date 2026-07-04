import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { Card, PageHeader, StatusBadge } from "@/components/ui";
import { updateWorkspace } from "./actions";

export default async function WorkspaceSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="p-8">
        <PageHeader title="Workspace" />
        <p className="mt-2 text-sm text-soft-taupe">No workspace yet.</p>
      </div>
    );
  }

  const supabase = await createClient();
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id, name, slug, timezone, currency, locale, status")
    .eq("id", workspaceId)
    .single();

  if (!workspace) {
    return (
      <div className="p-8">
        <PageHeader title="Workspace" />
        <p className="mt-2 text-sm text-soft-taupe">Workspace not found.</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <PageHeader title="Workspace" description="Tenant identity — name, timezone, currency, locale, and status." />

      <nav aria-label="Settings sections" className="mt-4 flex flex-wrap gap-2">
        <Link href="/settings/business-units" className="lc-btn-secondary">Business Units</Link>
        <Link href="/settings/users" className="lc-btn-secondary">Users</Link>
        <Link href="/settings/roles" className="lc-btn-secondary">Roles and Permissions</Link>
        <Link href="/settings/integrations" className="lc-btn-secondary">Integrations</Link>
        <Link href="/settings/billing" className="lc-btn-secondary">Billing</Link>
        <Link href="/settings/notifications" className="lc-btn-secondary">Notifications</Link>
        <Link href="/settings/data-privacy" className="lc-btn-secondary">Data and Privacy</Link>
        <Link href="/settings/accessibility" className="lc-btn-secondary">Accessibility</Link>
        <Link href="/settings/ai-policies" className="lc-btn-secondary">AI Policies</Link>
      </nav>

      {error && (
        <p role="alert" className="mt-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          {decodeURIComponent(error)}
        </p>
      )}

      <Card className="mt-6 max-w-lg">
        <div className="flex items-center justify-between">
          <p className="text-sm text-soft-taupe">Slug: {workspace.slug}</p>
          <StatusBadge status={workspace.status} />
        </div>

        <form action={updateWorkspace} className="mt-4 space-y-3">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-deep-indigo">Name</label>
            <input
              id="name"
              type="text"
              name="name"
              defaultValue={workspace.name}
              required
              className="mt-1 w-full rounded border border-soft-taupe px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="timezone" className="block text-sm font-medium text-deep-indigo">Timezone</label>
            <input
              id="timezone"
              type="text"
              name="timezone"
              defaultValue={workspace.timezone}
              placeholder="e.g. America/New_York"
              required
              className="mt-1 w-full rounded border border-soft-taupe px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="currency" className="block text-sm font-medium text-deep-indigo">Currency</label>
              <input
                id="currency"
                type="text"
                name="currency"
                defaultValue={workspace.currency}
                placeholder="USD"
                required
                className="mt-1 w-full rounded border border-soft-taupe px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="locale" className="block text-sm font-medium text-deep-indigo">Locale</label>
              <input
                id="locale"
                type="text"
                name="locale"
                defaultValue={workspace.locale}
                placeholder="en-US"
                required
                className="mt-1 w-full rounded border border-soft-taupe px-3 py-2 text-sm"
              />
            </div>
          </div>
          <button type="submit" className="lc-btn-primary">Save</button>
        </form>
      </Card>

      <Card className="mt-6 max-w-lg text-sm text-soft-taupe">
        Subscription plan and billing status are managed on{" "}
        <a href="/settings/billing" className="text-deep-indigo underline">Settings &rarr; Billing</a>,
        not here. Slug and lifecycle status are not editable from this form.
      </Card>
    </div>
  );
}
