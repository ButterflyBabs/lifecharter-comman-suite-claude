import { createClient } from "@/lib/supabase/server";
import { getPortalAccess } from "@/lib/data/portal";
import { Card, PageHeader, StatusBadge } from "@/components/ui";
import { portalSignOut } from "./actions";

export default async function PortalPage() {
  const access = await getPortalAccess();

  if (!access) {
    return (
      <div className="p-8">
        <PageHeader title="Client Portal" />
        <p className="mt-2 max-w-md text-sm text-soft-taupe">
          This account doesn&apos;t have active client portal access yet. If you were
          expecting to see your program here, ask your coach to check your invitation.
        </p>
        <form action={portalSignOut} className="mt-4">
          <button type="submit" className="lc-btn-secondary">Sign out</button>
        </form>
      </div>
    );
  }

  const supabase = await createClient();
  await supabase.rpc("record_portal_login");

  const [{ data: branding }, { data: sessions }, { data: actions }, { data: deliverables }, { data: milestones }] = await Promise.all([
    supabase.from("client_portal_branding").select("name, client_portal_display_name, client_portal_logo_url, client_portal_primary_color").eq("workspace_id", access.workspaceId).maybeSingle(),
    supabase.from("client_portal_sessions").select("id, session_type, scheduled_at, completed_at, client_summary, status").eq("client_id", access.clientId).order("scheduled_at", { ascending: false }),
    supabase.from("client_actions").select("id, title, description, due_at, status").eq("client_id", access.clientId).order("due_at"),
    supabase.from("deliverables").select("id, title, due_at, status, client_approval_status").eq("client_id", access.clientId).order("due_at"),
    supabase.from("client_milestones").select("id, title, target_at, achieved_at, status").eq("client_id", access.clientId).order("target_at"),
  ]);

  const brandName = branding?.client_portal_display_name || branding?.name || "Your Coach";
  const brandColor = branding?.client_portal_primary_color || undefined;
  const openActions = (actions ?? []).filter((a) => a.status === "open");
  const completedActions = (actions ?? []).filter((a) => a.status === "done" || a.status === "skipped");

  return (
    <div className="p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {branding?.client_portal_logo_url && (
            <div
              aria-hidden="true"
              className="h-10 w-10 shrink-0 rounded bg-cover bg-center"
              style={{ backgroundImage: `url(${branding.client_portal_logo_url})` }}
            />
          )}
          <PageHeader title={brandName} description="Your sessions, actions, and progress." />
        </div>
        <form action={portalSignOut}>
          <button type="submit" className="lc-btn-secondary text-xs">Sign out</button>
        </form>
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-deep-indigo" style={brandColor ? { color: brandColor } : undefined}>
          Your actions
        </h2>
        {openActions.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {openActions.map((a) => (
              <li key={a.id}>
                <Card className="text-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{a.title}</p>
                    <StatusBadge status={a.status} />
                  </div>
                  {a.description && <p className="mt-1 text-soft-taupe">{a.description}</p>}
                  {a.due_at && <p className="mt-1 text-xs text-soft-taupe">Due {new Date(a.due_at).toLocaleDateString()}</p>}
                </Card>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-soft-taupe">Nothing outstanding right now.</p>
        )}
        {completedActions.length > 0 && (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-deep-indigo underline">Completed actions</summary>
            <ul className="mt-2 space-y-2">
              {completedActions.map((a) => (
                <li key={a.id}>
                  <Card className="flex items-center justify-between text-sm">
                    <span>{a.title}</span>
                    <StatusBadge status={a.status} />
                  </Card>
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-deep-indigo" style={brandColor ? { color: brandColor } : undefined}>
          Deliverables
        </h2>
        {deliverables && deliverables.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {deliverables.map((d) => (
              <li key={d.id}>
                <Card className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">{d.title}</p>
                    {d.due_at && <p className="text-xs text-soft-taupe">Due {new Date(d.due_at).toLocaleDateString()}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={d.status} />
                    {d.client_approval_status && <StatusBadge status={d.client_approval_status} />}
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-soft-taupe">Nothing here yet.</p>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-deep-indigo" style={brandColor ? { color: brandColor } : undefined}>
          Milestones
        </h2>
        {milestones && milestones.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {milestones.map((m) => (
              <li key={m.id}>
                <Card className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">{m.title}</p>
                    <p className="text-xs text-soft-taupe">
                      {m.achieved_at
                        ? `Achieved ${new Date(m.achieved_at).toLocaleDateString()}`
                        : m.target_at
                          ? `Target ${new Date(m.target_at).toLocaleDateString()}`
                          : "No target date"}
                    </p>
                  </div>
                  <StatusBadge status={m.status} />
                </Card>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-soft-taupe">No milestones recorded yet.</p>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-deep-indigo" style={brandColor ? { color: brandColor } : undefined}>
          Session summaries
        </h2>
        {sessions && sessions.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {sessions.map((s) => (
              <li key={s.id}>
                <Card className="text-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">
                      {s.session_type ?? "Session"} · {new Date(s.scheduled_at).toLocaleDateString()}
                    </p>
                    <StatusBadge status={s.status} />
                  </div>
                  {s.client_summary && <p className="mt-1 whitespace-pre-wrap text-soft-taupe">{s.client_summary}</p>}
                </Card>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-soft-taupe">No session summaries have been shared yet.</p>
        )}
      </section>
    </div>
  );
}
