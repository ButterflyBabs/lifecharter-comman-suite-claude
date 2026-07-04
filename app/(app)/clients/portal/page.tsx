import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { Card, PageHeader, StatusBadge } from "@/components/ui";
import { inviteContactToPortal, suspendPortalAccess, reactivatePortalAccess } from "./actions";

export default async function PortalPage() {
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

  const [{ data: access }, { data: contacts }, { data: clients }] = await Promise.all([
    supabase.from("client_portal_access").select("id, status, invited_at, last_login_at, clients(organizations(name))").eq("workspace_id", workspaceId).order("invited_at", { ascending: false }),
    supabase.from("client_contacts").select("id, role, portal_access, client_id, people(preferred_name, first_name, last_name)").eq("workspace_id", workspaceId),
    supabase.from("clients").select("id, organizations(name)").eq("workspace_id", workspaceId),
  ]);

  const orgName = (c: { organizations: unknown } | null) => (c?.organizations as { name: string } | null)?.name ?? "Untitled client";

  return (
    <div className="p-8">
      <PageHeader
        title="Client Portal Settings"
        description="Grant, suspend, and reactivate portal access for client contacts."
      />

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
