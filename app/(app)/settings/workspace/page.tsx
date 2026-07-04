import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { Card, PageHeader, StatusBadge } from "@/components/ui";
import { updateWorkspace, updateBranding, addDomain, checkDomainDns, removeDomain } from "./actions";

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
  const [{ data: workspace }, { data: domains }] = await Promise.all([
    supabase
      .from("workspaces")
      .select("id, name, slug, timezone, currency, locale, status, client_portal_display_name, client_portal_logo_url, client_portal_primary_color")
      .eq("id", workspaceId)
      .single(),
    supabase
      .from("workspace_domains")
      .select("id, domain, status, last_checked_at, verified_at")
      .eq("workspace_id", workspaceId)
      .order("created_at"),
  ]);

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

      <section className="mt-10 max-w-lg">
        <h2 className="text-lg font-semibold text-deep-indigo">White-Label</h2>
        <p className="mt-1 text-sm text-soft-taupe">
          A custom domain and your own branding for the client-facing experience.
        </p>

        <Card className="mt-4">
          <h3 className="font-medium">Custom domain</h3>
          <ul className="mt-2 space-y-2">
            {(domains ?? []).map((d) => (
              <li key={d.id} className="rounded border border-soft-taupe p-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{d.domain}</span>
                  <StatusBadge status={d.status} />
                </div>
                {d.last_checked_at && (
                  <p className="mt-1 text-xs text-soft-taupe">
                    Last checked {new Date(d.last_checked_at).toLocaleString()}
                  </p>
                )}
                <div className="mt-2 flex gap-2">
                  <form action={checkDomainDns}>
                    <input type="hidden" name="domain_id" value={d.id} />
                    <button type="submit" className="lc-btn-secondary text-xs">Check DNS</button>
                  </form>
                  <form action={removeDomain}>
                    <input type="hidden" name="domain_id" value={d.id} />
                    <button type="submit" className="lc-btn-secondary text-xs">Remove</button>
                  </form>
                </div>
              </li>
            ))}
            {(!domains || domains.length === 0) && <p className="text-sm text-soft-taupe">No custom domain registered yet.</p>}
          </ul>

          <details className="mt-3">
            <summary className="cursor-pointer text-xs text-deep-indigo underline">Add a domain</summary>
            <form action={addDomain} className="mt-1 flex gap-1">
              <input
                type="text"
                name="domain"
                placeholder="portal.yourbrand.com"
                required
                className="w-full rounded border border-soft-taupe px-2 py-1 text-xs"
              />
              <button type="submit" className="lc-btn-secondary text-xs">Add</button>
            </form>
          </details>

          <p className="mt-3 text-xs text-soft-taupe">
            After adding a domain, point its DNS at Vercel: a <strong>CNAME</strong> to{" "}
            <code>cname.vercel-dns.com</code> for a subdomain, or an <strong>A record</strong> to{" "}
            <code>76.76.21.21</code> for a root domain. &quot;Check DNS&quot; looks this up for real.
            Once verified, attaching the domain to the live app is a manual step you complete
            yourself in the Vercel dashboard (Project &rarr; Domains) — this build never does that
            on your behalf.
          </p>
        </Card>

        <Card className="mt-4">
          <h3 className="font-medium">Client-facing branding</h3>
          <form action={updateBranding} className="mt-2 space-y-2">
            <div>
              <label htmlFor="display_name" className="block text-xs font-medium text-deep-indigo">Display name</label>
              <input
                id="display_name"
                type="text"
                name="display_name"
                defaultValue={workspace.client_portal_display_name ?? ""}
                placeholder={workspace.name}
                className="mt-1 w-full rounded border border-soft-taupe px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label htmlFor="logo_url" className="block text-xs font-medium text-deep-indigo">Logo URL</label>
              <input
                id="logo_url"
                type="url"
                name="logo_url"
                defaultValue={workspace.client_portal_logo_url ?? ""}
                placeholder="https://…"
                className="mt-1 w-full rounded border border-soft-taupe px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label htmlFor="primary_color" className="block text-xs font-medium text-deep-indigo">Primary color</label>
              <input
                id="primary_color"
                type="text"
                name="primary_color"
                defaultValue={workspace.client_portal_primary_color ?? ""}
                placeholder="#1a1f2e"
                className="mt-1 w-full rounded border border-soft-taupe px-2 py-1 text-sm"
              />
            </div>
            <button type="submit" className="lc-btn-primary text-sm">Save branding</button>
          </form>
          <p className="mt-3 text-xs text-soft-taupe">
            Preview this branding on{" "}
            <Link href="/clients/portal" className="text-deep-indigo underline">Clients &rarr; Client Portal</Link>.
          </p>
        </Card>
      </section>
    </div>
  );
}
