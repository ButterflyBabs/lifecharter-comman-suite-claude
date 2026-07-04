import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { Card, PageHeader, StatusBadge } from "@/components/ui";
import { inviteContactToPortal, suspendPortalAccess, reactivatePortalAccess } from "./actions";

export default async function PortalPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="p-8">
        <PageHeader title="Client Portal Settings" />
        <p className="mt-2 text-sm text-soft-taupe">No workspace yet.</p>
      </div>
    );
  }

  const supabase = await createClient();

  const [{ data: access }, { data: contacts }, { data: clients }, { data: workspace }] = await Promise.all([
    supabase.from("client_portal_access").select("id, status, invited_at, last_login_at, clients(organizations(name))").eq("workspace_id", workspaceId).order("invited_at", { ascending: false }),
    supabase.from("client_contacts").select("id, role, portal_access, client_id, people(preferred_name, first_name, last_name)").eq("workspace_id", workspaceId),
    supabase.from("clients").select("id, organizations(name)").eq("workspace_id", workspaceId),
    supabase
      .from("workspaces")
      .select("name, client_portal_display_name, client_portal_logo_url, client_portal_primary_color")
      .eq("id", workspaceId)
      .single(),
  ]);

  const orgName = (c: { organizations: unknown } | null) => (c?.organizations as { name: string } | null)?.name ?? "Untitled client";
  const brandName = workspace?.client_portal_display_name || workspace?.name || "Your workspace";
  const brandColor = workspace?.client_portal_primary_color || undefined;

  return (
    <div className="p-8">
      <PageHeader
        title="Client Portal Settings"
        description="Grant, suspend, and reactivate portal access for client contacts."
      />

      {error && (
        <p role="alert" className="mt-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          {decodeURIComponent(error)}
        </p>
      )}

      <Card className="mb-6">
        <h2 className="text-sm font-semibold text-deep-indigo">Branding preview</h2>
        <div
          className="mt-2 flex items-center gap-3 rounded border border-[var(--card-border)] p-4"
          style={brandColor ? { borderColor: brandColor } : undefined}
        >
          {workspace?.client_portal_logo_url && (
            <div
              aria-hidden="true"
              className="h-10 w-10 shrink-0 rounded bg-cover bg-center"
              style={{ backgroundImage: `url(${workspace.client_portal_logo_url})` }}
            />
          )}
          <p className="text-lg font-semibold" style={brandColor ? { color: brandColor } : undefined}>
            {brandName}
          </p>
        </div>
        <p className="mt-2 text-xs text-soft-taupe">
          This is how your logo, display name, and color appear to clients (set on{" "}
          <Link href="/settings/workspace" className="text-deep-indigo underline">Settings &rarr; Workspace</Link>).
          Clients see this at their own sign-in page once invited below.
        </p>
      </Card>

      <section>
        <h2 className="text-lg font-semibold text-deep-indigo">Portal access</h2>
        <ul className="mt-3 space-y-2">
          {(access ?? []).map((a) => (
            <li key={a.id}>
              <Card className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">{orgName(a.clients as unknown as { organizations: unknown } | null)}</p>
                  <p className="text-xs text-soft-taupe">
                    Invited {new Date(a.invited_at).toLocaleDateString()}
                    {a.last_login_at ? ` · last login ${new Date(a.last_login_at).toLocaleDateString()}` : " · never logged in"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={a.status} />
                  {a.status === "suspended" ? (
                    <form action={reactivatePortalAccess}>
                      <input type="hidden" name="access_id" value={a.id} />
                      <button type="submit" className="lc-btn-secondary text-xs">Reactivate</button>
                    </form>
                  ) : (
                    <form action={suspendPortalAccess}>
                      <input type="hidden" name="access_id" value={a.id} />
                      <button type="submit" className="lc-btn-secondary text-xs">Suspend</button>
                    </form>
                  )}
                </div>
              </Card>
            </li>
          ))}
          {(!access || access.length === 0) && <p className="text-sm text-soft-taupe">No portal invitations yet.</p>}
        </ul>

        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-deep-indigo underline">Invite to portal</summary>
          <form action={inviteContactToPortal} className="mt-2 max-w-md space-y-2">
            <select name="client_id" required className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
              <option value="">Select client&hellip;</option>
              {clients?.map((c) => (
                <option key={c.id} value={c.id}>{orgName(c as unknown as { organizations: unknown } | null)}</option>
              ))}
            </select>
            <select name="client_contact_id" defaultValue="" className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
              <option value="">No specific contact</option>
              {contacts?.map((c) => {
                const person = c.people as unknown as { preferred_name: string | null; first_name: string | null; last_name: string | null } | null;
                const label = person?.preferred_name ?? [person?.first_name, person?.last_name].filter(Boolean).join(" ") ?? c.id;
                return (
                  <option key={c.id} value={c.id}>{label} {c.role ? `(${c.role})` : ""}</option>
                );
              })}
            </select>
            <input type="email" name="email" placeholder="Client's email address" required className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
            <button type="submit" className="lc-btn-primary">Invite</button>
          </form>
        </details>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-deep-indigo">Client contacts</h2>
        <ul className="mt-3 space-y-2">
          {(contacts ?? []).map((c) => {
            const person = c.people as unknown as { preferred_name: string | null; first_name: string | null; last_name: string | null } | null;
            const label = person?.preferred_name ?? [person?.first_name, person?.last_name].filter(Boolean).join(" ") ?? "Unnamed contact";
            return (
              <li key={c.id}>
                <Card className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">{label}</p>
                    {c.role && <p className="text-xs text-soft-taupe">{c.role}</p>}
                  </div>
                  <StatusBadge status={c.portal_access ? "active" : "restricted"} />
                </Card>
              </li>
            );
          })}
          {(!contacts || contacts.length === 0) && <p className="text-sm text-soft-taupe">No client contacts yet.</p>}
        </ul>
      </section>
    </div>
  );
}
