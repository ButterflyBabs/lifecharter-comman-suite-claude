import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { Card, PageHeader, StatusBadge } from "@/components/ui";

export default async function WorkPage() {
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-semibold text-deep-indigo">Work</h1>
        <p className="mt-2 text-sm text-soft-taupe">
          No workspace yet. The guided setup wizard (Section 18, Phase 2) will create one.
        </p>
      </div>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: myWork }, { data: overdue }, { data: waitingOn }, { data: blockers }] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, title, status, due_at, priority")
      .eq("workspace_id", workspaceId)
      .eq("owner", user?.id ?? "")
      .not("status", "in", "(done,cancelled)")
      .order("due_at", { nullsFirst: false }),
    supabase
      .from("tasks")
      .select("id, title, status, due_at, priority")
      .eq("workspace_id", workspaceId)
      .not("status", "in", "(done,cancelled)")
      .lt("due_at", new Date().toISOString())
      .order("due_at"),
    supabase
      .from("tasks")
      .select("id, title, status, due_at, priority")
      .eq("workspace_id", workspaceId)
      .eq("status", "waiting_on"),
    supabase
      .from("blockers")
      .select("id, reason, waiting_on, impact, follow_up_at, status")
      .eq("workspace_id", workspaceId)
      .eq("status", "active"),
  ]);

  return (
    <div className="p-8">
      <PageHeader
        title="Work Queue"
        description={
          <>
            My Work, Overdue, Waiting On, and Risks (Section 5). Decisions, Approvals, and
            Replies live at their own routes (<Link href="/decisions" className="underline">/decisions</Link>,{" "}
            <Link href="/approvals" className="underline">/approvals</Link>).
          </>
        }
      />

      <TaskSection title="My Work" tasks={myWork} emptyLabel="Nothing assigned to you right now." />
      <TaskSection title="Overdue" tasks={overdue} emptyLabel="Nothing overdue." />
      <TaskSection title="Waiting On" tasks={waitingOn} emptyLabel="Nothing waiting on someone else." />

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-deep-indigo">Risks (active blockers)</h2>
        {blockers && blockers.length > 0 ? (
          <ul className="mt-2 space-y-2">
            {blockers.map((b) => (
              <li key={b.id}>
                <Card className="text-sm">
                  <p className="font-medium">{b.reason}</p>
                  {b.waiting_on && <p className="text-soft-taupe">Waiting on: {b.waiting_on}</p>}
                  {b.impact && <p className="text-soft-taupe">Impact: {b.impact}</p>}
                </Card>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-soft-taupe">No active blockers.</p>
        )}
      </section>
    </div>
  );
}

type TaskRow = { id: string; title: string; status: string; due_at: string | null; priority: string | null };

function TaskSection({
  title,
  tasks,
  emptyLabel,
}: {
  title: string;
  tasks: TaskRow[] | null;
  emptyLabel: string;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-deep-indigo">{title}</h2>
      {tasks && tasks.length > 0 ? (
        <ul className="mt-2 space-y-2">
          {tasks.map((t) => (
            <li key={t.id}>
              <Card className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">{t.title}</p>
                  <p className="text-soft-taupe">
                    {t.due_at ? `due ${new Date(t.due_at).toLocaleDateString()}` : ""}
                    {t.priority ? ` · ${t.priority}` : ""}
                  </p>
                </div>
                <StatusBadge status={t.status} />
              </Card>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-soft-taupe">{emptyLabel}</p>
      )}
    </section>
  );
}
