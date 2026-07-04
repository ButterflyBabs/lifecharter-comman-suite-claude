import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { Card, PageHeader, StatusBadge } from "@/components/ui";
import { updateClientStatus } from "./actions";

const NEXT_STATUS: Record<string, string> = {
  onboarding: "active",
  active: "paused",
  paused: "active",
};

export default async function ActiveClientRecordPage({ params }: { params: { clientId: string } }) {
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="p-8">
        <PageHeader title="Active Client Record" />
        <p className="mt-2 text-sm text-soft-taupe">No workspace yet.</p>
      </div>
    );
  }

  const supabase = await createClient();

  const { data: client } = await supabase
    .from("clients")
    .select("id, status, start_at, end_at, organizations(name), people(preferred_name, first_name, last_name)")
    .eq("workspace_id", workspaceId)
    .eq("id", params.clientId)
    .maybeSingle();

  if (!client) notFound();

  const [
    { data: contacts },
    { data: enrollments },
    { data: onboardingInstances },
    { data: sessions },
    { data: clientActions },
    { data: coachActions },
    { data: milestones },
    { data: latestHealth },
    { data: supportRequests },
    { data: renewal },
  ] = await Promise.all([
    supabase.from("client_contacts").select("id, role, portal_access, people(preferred_name, first_name, last_name)").eq("client_id", client.id),
    supabase.from("client_offer_enrollments").select("id, status, start_at, end_at, offer_versions(problem, offers(name))").eq("client_id", client.id),
    supabase.from("onboarding_instances").select("id, status, risk_status, kickoff_date, client_offer_enrollments!inner(client_id)").eq("client_offer_enrollments.client_id", client.id),
    supabase.from("sessions").select("id, session_type, scheduled_at, status, client_summary").eq("client_id", client.id).order("scheduled_at", { ascending: false }).limit(5),
    supabase.from("client_actions").select("id, title, due_at, status").eq("client_id", client.id).order("due_at"),
    supabase.from("coach_actions").select("id, title, due_at, status").eq("client_id", client.id).order("due_at"),
    supabase.from("client_milestones").select("id, title, status, target_at, achieved_at").eq("client_id", client.id).order("target_at"),
    supabase.from("client_health_events").select("id, status, score, calculated_at").eq("client_id", client.id).order("calculated_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("support_requests").select("id, summary, status, priority").eq("client_id", client.id).in("status", ["open", "in_progress"]),
    supabase.from("renewal_opportunities").select("id, status, recommended_path, review_at").eq("client_id", client.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const person = client.people as unknown as { preferred_name: string | null; first_name: string | null; last_name: string | null } | null;
  const org = client.organizations as unknown as { name: string } | null;
  const clientLabel = org?.name ?? person?.preferred_name ?? [person?.first_name, person?.last_name].filter(Boolean).join(" ") ?? "Untitled client";

  const nextSession = (sessions ?? []).find((s) => s.status === "scheduled");
  const lastSession = (sessions ?? []).find((s) => s.status === "completed");
  const openClientActions = (clientActions ?? []).filter((a) => a.status === "open");
  const openCoachActions = (coachActions ?? []).filter((a) => a.status === "open");

  return (
    <div className="p-8">
      <PageHeader title={clientLabel} description="Active Client Record — what, who, state, last, and next in one place." />

      <section className="mt-4 flex flex-wrap items-center gap-3">
        <StatusBadge status={client.status} />
        {latestHealth && <StatusBadge status={latestHealth.status} />}
        <span className="text-sm text-soft-taupe">Client since {new Date(client.start_at).toLocaleDateString()}</span>
        {(() => {
          const nextStatus = NEXT_STATUS[client.status];
          return nextStatus ? (
            <form action={updateClientStatus}>
              <input type="hidden" name="client_id" value={client.id} />
              <input type="hidden" name="next_status" value={nextStatus} />
              <button type="submit" className="lc-btn-secondary text-xs">
                Move to {nextStatus.replace(/_/g, " ")}
              </button>
            </form>
          ) : null;
        })()}
        <Link href="/clients/renewals" className="lc-btn-secondary text-xs">Renewals</Link>
        <Link href="/clients/health" className="lc-btn-secondary text-xs">Health</Link>
      </section>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold text-deep-indigo">Last / Next</h2>
          <p className="mt-2 text-sm">
            <span className="font-medium">Last session:</span>{" "}
            {lastSession ? `${lastSession.session_type ?? "Session"} on ${new Date(lastSession.scheduled_at ?? "").toLocaleDateString()}` : "None yet"}
          </p>
          <p className="text-sm">
            <span className="font-medium">Next session:</span>{" "}
            {nextSession ? `${nextSession.session_type ?? "Session"} on ${new Date(nextSession.scheduled_at ?? "").toLocaleDateString()}` : "Not scheduled"}
          </p>
          {renewal && (
            <p className="mt-1 text-sm">
              <span className="font-medium">Renewal:</span> {renewal.status}{renewal.recommended_path ? ` (${renewal.recommended_path})` : ""}
            </p>
          )}
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-deep-indigo">Onboarding</h2>
          {onboardingInstances && onboardingInstances.length > 0 ? (
            <ul className="mt-2 space-y-1 text-sm">
              {onboardingInstances.map((o) => (
                <li key={o.id} className="flex items-center gap-2">
                  <StatusBadge status={o.status} />
                  <StatusBadge status={o.risk_status} />
                  {o.kickoff_date && <span className="text-xs text-soft-taupe">Kickoff {new Date(o.kickoff_date).toLocaleDateString()}</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-soft-taupe">No onboarding on file.</p>
          )}
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-deep-indigo">Who</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {(contacts ?? []).map((c) => {
              const p = c.people as unknown as { preferred_name: string | null; first_name: string | null; last_name: string | null } | null;
              const label = p?.preferred_name ?? [p?.first_name, p?.last_name].filter(Boolean).join(" ") ?? "Unnamed";
              return (
                <li key={c.id}>
                  {label} {c.role ? `— ${c.role}` : ""} {c.portal_access ? "· portal access" : ""}
                </li>
              );
            })}
            {(!contacts || contacts.length === 0) && <p className="text-soft-taupe">No contacts recorded.</p>}
          </ul>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-deep-indigo">Enrollments</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {(enrollments ?? []).map((e) => {
              const ov = e.offer_versions as unknown as { problem: string | null; offers: { name: string } | null } | null;
              return (
                <li key={e.id} className="flex items-center justify-between">
                  <span>{ov?.offers?.name ?? "Untitled offer"}</span>
                  <StatusBadge status={e.status} />
                </li>
              );
            })}
            {(!enrollments || enrollments.length === 0) && <p className="text-soft-taupe">No enrollments yet.</p>}
          </ul>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-deep-indigo">Open actions</h2>
          <p className="mt-2 text-xs font-medium text-soft-taupe">Client</p>
          <ul className="space-y-1 text-sm">
            {openClientActions.map((a) => (
              <li key={a.id}>{a.title} {a.due_at && <span className="text-xs text-soft-taupe">(due {new Date(a.due_at).toLocaleDateString()})</span>}</li>
            ))}
            {openClientActions.length === 0 && <p className="text-soft-taupe">None open.</p>}
          </ul>
          <p className="mt-2 text-xs font-medium text-soft-taupe">Coach</p>
          <ul className="space-y-1 text-sm">
            {openCoachActions.map((a) => (
              <li key={a.id}>{a.title} {a.due_at && <span className="text-xs text-soft-taupe">(due {new Date(a.due_at).toLocaleDateString()})</span>}</li>
            ))}
            {openCoachActions.length === 0 && <p className="text-soft-taupe">None open.</p>}
          </ul>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-deep-indigo">Milestones</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {(milestones ?? []).map((m) => (
              <li key={m.id} className="flex items-center justify-between">
                <span>{m.title}</span>
                <StatusBadge status={m.status} />
              </li>
            ))}
            {(!milestones || milestones.length === 0) && <p className="text-soft-taupe">No milestones yet.</p>}
          </ul>
        </Card>

        {supportRequests && supportRequests.length > 0 && (
          <Card>
            <h2 className="text-lg font-semibold text-deep-indigo">Open support requests</h2>
            <ul className="mt-2 space-y-1 text-sm">
              {supportRequests.map((r) => (
                <li key={r.id} className="flex items-center justify-between">
                  <span>{r.summary}</span>
                  <StatusBadge status={r.priority ?? "normal"} />
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}
