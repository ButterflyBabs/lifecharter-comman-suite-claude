import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { Card, PageHeader, StatusBadge } from "@/components/ui";
import { createOnboardingTemplate, startOnboardingInstance, addOnboardingItem, toggleOnboardingItem } from "./actions";

export default async function OnboardingPage() {
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="p-8">
        <PageHeader title="Onboarding" />
        <p className="mt-2 text-sm text-soft-taupe">No workspace yet.</p>
      </div>
    );
  }

  const supabase = await createClient();

  const [{ data: instances }, { data: templates }, { data: enrollments }] = await Promise.all([
    supabase
      .from("onboarding_instances")
      .select("id, status, kickoff_date, risk_status, started_at, completed_at, onboarding_items(id, title, actor_type, status, due_at), client_offer_enrollments(clients(organizations(name)))")
      .eq("workspace_id", workspaceId)
      .order("started_at", { ascending: false }),
    supabase.from("onboarding_templates").select("id, name").eq("workspace_id", workspaceId),
    supabase.from("client_offer_enrollments").select("id, clients(organizations(name))").eq("workspace_id", workspaceId).eq("status", "active"),
  ]);

  return (
    <div className="p-8">
      <PageHeader
        title="Onboarding"
        description="Track kickoff, required items, and risk status until a client reaches Active."
      />

      {instances && instances.length > 0 ? (
        <div className="mt-6 space-y-4">
          {instances.map((inst) => {
            const enrollment = inst.client_offer_enrollments as unknown as { clients: { organizations: { name: string } | null } | null } | null;
            const orgName = enrollment?.clients?.organizations?.name ?? "Untitled client";
            return (
              <Card key={inst.id}>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-deep-indigo">{orgName}</h2>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={inst.risk_status} />
                    <StatusBadge status={inst.status} />
                  </div>
                </div>
                {inst.kickoff_date && <p className="mt-1 text-sm text-soft-taupe">Kickoff {new Date(inst.kickoff_date).toLocaleDateString()}</p>}

                <ul className="mt-3 space-y-2">
                  {(inst.onboarding_items ?? []).map((item) => (
                    <li key={item.id} className="flex items-center justify-between rounded bg-soft-lavender/10 p-2 text-sm">
                      <div>
                        <p>{item.title} <span className="text-xs text-soft-taupe">({item.actor_type})</span></p>
                        {item.due_at && <p className="text-xs text-soft-taupe">Due {new Date(item.due_at).toLocaleDateString()}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={item.status} />
                        {item.status === "pending" && (
                          <form action={toggleOnboardingItem}>
                            <input type="hidden" name="item_id" value={item.id} />
                            <input type="hidden" name="onboarding_instance_id" value={inst.id} />
                            <input type="hidden" name="next_status" value="done" />
                            <button type="submit" className="lc-btn-secondary text-xs">Mark done</button>
                          </form>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>

                <details className="mt-3">
                  <summary className="cursor-pointer text-sm text-deep-indigo underline">Add item</summary>
                  <form action={addOnboardingItem} className="mt-2 max-w-md space-y-2">
                    <input type="hidden" name="onboarding_instance_id" value={inst.id} />
                    <input type="text" name="title" placeholder="Item title" required className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
                    <select name="actor_type" className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
                      <option value="internal">Internal</option>
                      <option value="client">Client</option>
                    </select>
                    <input type="date" name="due_at" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
                    <button type="submit" className="lc-btn-primary">Add item</button>
                  </form>
                </details>
              </Card>
            );
          })}
        </div>
      ) : (
        <p className="mt-6 text-sm text-soft-taupe">No onboarding instances yet.</p>
      )}

      <details className="mt-6">
        <summary className="cursor-pointer text-sm text-deep-indigo underline">Start onboarding for an enrollment</summary>
        <form action={startOnboardingInstance} className="mt-2 max-w-md space-y-2">
          <select name="client_enrollment_id" required className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
            <option value="">Select enrollment&hellip;</option>
            {enrollments?.map((e) => (
              <option key={e.id} value={e.id}>
                {(e.clients as unknown as { organizations: { name: string } | null } | null)?.organizations?.name ?? e.id}
              </option>
            ))}
          </select>
          <select name="template_id" defaultValue="" className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
            <option value="">No template</option>
            {templates?.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <input type="date" name="kickoff_date" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <button type="submit" className="lc-btn-primary">Start onboarding</button>
        </form>
      </details>
    </div>
  );
}
