import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { Card, PageHeader, StatusBadge } from "@/components/ui";
import { scheduleSession, completeSession, markSummaryReviewed, releaseSessionSummary } from "./actions";

export default async function SessionsPage() {
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="p-8">
        <PageHeader title="Sessions" />
        <p className="mt-2 text-sm text-soft-taupe">No workspace yet.</p>
      </div>
    );
  }

  const supabase = await createClient();

  // Reads through sessions_for_role, not the base sessions table: the
  // view nulls agenda/internal_notes/preparation_brief for anyone whose
  // role lacks session_note.read.internal (e.g. Finance), enforced in
  // the database rather than trusted to this page. It has no FK metadata
  // for PostgREST to embed clients(organizations(name)) through, so the
  // org name is looked up from the existing clients query below instead.
  const [{ data: sessions }, { data: clients }] = await Promise.all([
    supabase
      .from("sessions_for_role")
      .select("id, client_id, session_type, scheduled_at, completed_at, status, agenda, internal_notes, client_summary, client_summary_status")
      .eq("workspace_id", workspaceId)
      .order("scheduled_at", { ascending: false }),
    supabase.from("clients").select("id, organizations(name)").eq("workspace_id", workspaceId),
  ]);

  const orgNameByClientId = new Map<string, string>();
  for (const c of clients ?? []) {
    const orgName = (c.organizations as unknown as { name: string } | null)?.name;
    if (orgName) orgNameByClientId.set(c.id, orgName);
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Sessions"
        description="Schedule coaching sessions, capture internal notes, and release reviewed summaries to clients."
      />

      {sessions && sessions.length > 0 ? (
        <ul className="mt-6 space-y-3">
          {sessions.map((s) => {
            const orgName = orgNameByClientId.get(s.client_id) ?? "Untitled client";
            return (
              <li key={s.id}>
                <Card className="text-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-deep-indigo">{orgName} {s.session_type ? `— ${s.session_type}` : ""}</p>
                    <StatusBadge status={s.status} />
                  </div>
                  {s.scheduled_at && <p className="text-soft-taupe">Scheduled {new Date(s.scheduled_at).toLocaleString()}</p>}
                  {s.agenda && <p className="text-soft-taupe">Agenda: {s.agenda}</p>}

                  {s.status === "scheduled" && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs text-deep-indigo underline">Complete session</summary>
                      <form action={completeSession} className="mt-1 space-y-1">
                        <input type="hidden" name="session_id" value={s.id} />
                        <textarea name="internal_notes" placeholder="Internal notes (not client-visible)" rows={2} className="w-full rounded border border-soft-taupe px-2 py-1 text-xs" />
                        <textarea name="client_summary" placeholder="Client summary" rows={2} className="w-full rounded border border-soft-taupe px-2 py-1 text-xs" />
                        <button type="submit" className="lc-btn-secondary text-xs">Complete</button>
                      </form>
                    </details>
                  )}

                  {s.status === "completed" && s.client_summary && (
                    <div className="mt-2 rounded bg-soft-lavender/10 p-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium">Client summary</p>
                        <StatusBadge status={s.client_summary_status} />
                      </div>
                      <p className="text-xs text-soft-taupe">{s.client_summary}</p>
                      <div className="mt-1 flex gap-2">
                        {s.client_summary_status === "draft" && (
                          <form action={markSummaryReviewed}>
                            <input type="hidden" name="session_id" value={s.id} />
                            <button type="submit" className="lc-btn-secondary text-xs">Mark reviewed</button>
                          </form>
                        )}
                        {s.client_summary_status === "reviewed" && (
                          <form action={releaseSessionSummary}>
                            <input type="hidden" name="session_id" value={s.id} />
                            <button type="submit" className="lc-btn-primary text-xs">Release to client</button>
                          </form>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-6 text-sm text-soft-taupe">No sessions yet.</p>
      )}

      <details className="mt-6">
        <summary className="cursor-pointer text-sm text-deep-indigo underline">Schedule session</summary>
        <form action={scheduleSession} className="mt-2 max-w-md space-y-2">
          <select name="client_id" required className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
            <option value="">Select client&hellip;</option>
            {clients?.map((c) => (
              <option key={c.id} value={c.id}>
                {(c.organizations as unknown as { name: string } | null)?.name ?? c.id}
              </option>
            ))}
          </select>
          <input type="text" name="session_type" placeholder="Session type" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <input type="datetime-local" name="scheduled_at" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <textarea name="agenda" placeholder="Agenda" rows={2} className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <button type="submit" className="lc-btn-primary">Schedule</button>
        </form>
      </details>
    </div>
  );
}
