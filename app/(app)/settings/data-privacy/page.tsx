import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { Card, PageHeader, StatusBadge } from "@/components/ui";
import { requestDataExport, requestDataDeletion, cancelDataDeletion } from "./actions";

export default async function DataPrivacyPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="p-8">
        <PageHeader title="Data and Privacy" />
        <p className="mt-2 text-sm text-soft-taupe">No workspace yet.</p>
      </div>
    );
  }

  const supabase = await createClient();

  const [{ data: exports }, { data: deletions }] = await Promise.all([
    supabase.from("data_export_requests").select("id, status, requested_at, completed_at").eq("workspace_id", workspaceId).order("requested_at", { ascending: false }),
    supabase.from("data_deletion_requests").select("id, status, reason, scheduled_for, created_at").eq("workspace_id", workspaceId).order("created_at", { ascending: false }),
  ]);

  const activeDeletion = (deletions ?? []).find((d) => d.status === "scheduled");

  return (
    <div className="p-8">
      <PageHeader
        title="Data and Privacy"
        description="Export or delete this workspace's data according to policy."
      />

      {error && (
        <p role="alert" className="mt-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          {decodeURIComponent(error)}
        </p>
      )}

      <section className="mt-6">
        <h2 className="text-lg font-semibold text-deep-indigo">Export</h2>
        <ul className="mt-3 space-y-2">
          {(exports ?? []).map((e) => (
            <li key={e.id}>
              <Card className="flex items-center justify-between text-sm">
                <span>Requested {new Date(e.requested_at).toLocaleString()}</span>
                <div className="flex items-center gap-2">
                  <StatusBadge status={e.status} />
                  {e.status === "completed" && (
                    <a href={`/api/data-export/${e.id}`} className="lc-btn-secondary text-xs">Download</a>
                  )}
                </div>
              </Card>
            </li>
          ))}
          {(!exports || exports.length === 0) && <p className="text-sm text-soft-taupe">No exports requested yet.</p>}
        </ul>

        <form action={requestDataExport} className="mt-4">
          <button type="submit" className="lc-btn-primary">Export workspace data</button>
        </form>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-deep-indigo">Deletion</h2>
        {activeDeletion ? (
          <Card className="mt-3 text-sm">
            <div className="flex items-center justify-between">
              <p className="font-medium">Scheduled for {activeDeletion.scheduled_for ? new Date(activeDeletion.scheduled_for).toLocaleDateString() : "—"}</p>
              <StatusBadge status={activeDeletion.status} tone="warning" />
            </div>
            {activeDeletion.reason && <p className="text-soft-taupe">{activeDeletion.reason}</p>}
            <form action={cancelDataDeletion} className="mt-2">
              <input type="hidden" name="request_id" value={activeDeletion.id} />
              <button type="submit" className="lc-btn-secondary text-xs">Cancel deletion</button>
            </form>
          </Card>
        ) : (
          <details className="mt-3">
            <summary className="cursor-pointer text-sm text-deep-indigo underline">Request workspace deletion</summary>
            <form action={requestDataDeletion} className="mt-2 max-w-md space-y-2">
              <textarea name="reason" placeholder="Reason (optional)" rows={2} className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
              <p className="text-xs text-soft-taupe">
                Deletion is scheduled 30 days out and can be canceled any time before
                then. Owner/Administrator only.
              </p>
              <button type="submit" className="lc-btn-primary">Request deletion</button>
            </form>
          </details>
        )}

        <ul className="mt-4 space-y-2">
          {(deletions ?? []).filter((d) => d.status !== "scheduled").map((d) => (
            <li key={d.id}>
              <Card className="flex items-center justify-between text-sm">
                <span>{new Date(d.created_at).toLocaleDateString()}{d.reason ? ` — ${d.reason}` : ""}</span>
                <StatusBadge status={d.status} />
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <Card className="mt-8 text-sm text-soft-taupe">
        Actually purging a workspace on its scheduled date needs a recurring
        job (Supabase pg_cron or a Vercel cron hitting a server action) that
        doesn&apos;t exist in this build yet — this page builds the
        request/schedule/cancel data model and UI, not an automated
        executor, consistent with how this project has always deferred
        features that need infrastructure it doesn&apos;t have rather than
        guessing at one.
      </Card>
    </div>
  );
}
