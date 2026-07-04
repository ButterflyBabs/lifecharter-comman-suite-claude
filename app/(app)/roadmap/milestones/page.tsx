import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { Card, PageHeader, StatusBadge } from "@/components/ui";

export default async function MilestonesPage() {
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-semibold text-deep-indigo">Milestones</h1>
        <p className="mt-2 text-sm text-soft-taupe">No workspace yet.</p>
      </div>
    );
  }

  const supabase = await createClient();
  const { data: milestones } = await supabase
    .from("roadmap_milestones")
    .select("id, title, status, due_date, roadmap_phases(name, sequence)")
    .eq("workspace_id", workspaceId)
    .is("archived_at", null)
    .order("due_date", { nullsFirst: false });

  return (
    <div className="p-8">
      <PageHeader title="All Milestones" description="Across every phase of your current roadmap." />
      {milestones && milestones.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {milestones.map((m: any) => (
            <li key={m.id}>
              <Card className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">{m.title}</p>
                  <p className="text-soft-taupe">
                    {m.roadmap_phases?.name}
                    {m.due_date ? ` · due ${new Date(m.due_date).toLocaleDateString()}` : ""}
                  </p>
                </div>
                <StatusBadge status={m.status} />
              </Card>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-soft-taupe">
          No milestones yet — complete the Business Command Audit to generate a roadmap.
        </p>
      )}
    </div>
  );
}
