import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { Card, PageHeader } from "@/components/ui";
import { upsertCapacityProfile, addCapacityAllocation } from "./actions";

export default async function CapacityPage() {
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="p-8">
        <PageHeader title="Capacity" />
        <p className="mt-2 text-sm text-soft-taupe">No workspace yet.</p>
      </div>
    );
  }

  const supabase = await createClient();

  const [{ data: profiles }, { data: allocations }, { data: members }] = await Promise.all([
    supabase.from("capacity_profiles").select("id, workspace_member_id, weekly_hours, meeting_limit, decision_limit, client_cap, energy_load, fixed_constraints").eq("workspace_id", workspaceId),
    supabase.from("capacity_allocations").select("id, capacity_profile_id, period, category, planned_hours, actual_hours").eq("workspace_id", workspaceId).order("period", { ascending: false }),
    supabase.from("workspace_members").select("id, user_id").eq("workspace_id", workspaceId).eq("status", "active"),
  ]);

  const authUserIds = (members ?? []).map((m) => m.user_id);
  const { data: userProfiles } = authUserIds.length > 0
    ? await supabase.from("user_profiles").select("auth_user_id, display_name").in("auth_user_id", authUserIds)
    : { data: null };

  const displayNameByAuthUserId = new Map<string, string>();
  for (const p of userProfiles ?? []) {
    if (p.display_name) displayNameByAuthUserId.set(p.auth_user_id, p.display_name);
  }

  const memberLabel = (workspaceMemberId: string) => {
    const member = (members ?? []).find((m) => m.id === workspaceMemberId);
    return member ? (displayNameByAuthUserId.get(member.user_id) ?? "Member") : "Member";
  };

  const allocationsByProfile = new Map<string, NonNullable<typeof allocations>>();
  for (const a of allocations ?? []) {
    if (!allocationsByProfile.has(a.capacity_profile_id)) allocationsByProfile.set(a.capacity_profile_id, []);
    allocationsByProfile.get(a.capacity_profile_id)!.push(a);
  }

  const membersWithoutProfile = (members ?? []).filter((m) => !(profiles ?? []).some((p) => p.workspace_member_id === m.id));

  return (
    <div className="p-8">
      <PageHeader
        title="Capacity"
        description="Protect founder and team capacity while aligning sales, delivery, content, meetings, and recovery to real limits."
      />

      {profiles && profiles.length > 0 ? (
        <div className="mt-6 space-y-4">
          {profiles.map((p) => (
            <Card key={p.id}>
              <h2 className="text-lg font-semibold text-deep-indigo">{memberLabel(p.workspace_member_id)}</h2>
              <div className="mt-1 grid grid-cols-2 gap-x-4 text-sm text-soft-taupe sm:grid-cols-4">
                {p.weekly_hours != null && <p>Weekly hours: {p.weekly_hours}</p>}
                {p.meeting_limit != null && <p>Meeting limit: {p.meeting_limit}</p>}
                {p.decision_limit != null && <p>Decision limit: {p.decision_limit}</p>}
                {p.client_cap != null && <p>Client cap: {p.client_cap}</p>}
              </div>
              {p.energy_load && <p className="mt-1 text-sm text-soft-taupe">Energy load: {p.energy_load}</p>}
              {p.fixed_constraints && <p className="text-sm text-soft-taupe">Fixed constraints: {p.fixed_constraints}</p>}

              <ul className="mt-3 space-y-1 text-sm">
                {(allocationsByProfile.get(p.id) ?? []).map((a) => (
                  <li key={a.id} className="flex items-center justify-between rounded bg-soft-lavender/10 p-2">
                    <span>{a.period} — {a.category}</span>
                    <span className="text-soft-taupe">{a.actual_hours ?? "—"} / {a.planned_hours ?? "—"}h</span>
                  </li>
                ))}
                {(allocationsByProfile.get(p.id) ?? []).length === 0 && (
                  <li className="text-soft-taupe">No allocations recorded yet.</li>
                )}
              </ul>

              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-deep-indigo underline">Add allocation</summary>
                <form action={addCapacityAllocation} className="mt-1 space-y-1">
                  <input type="hidden" name="capacity_profile_id" value={p.id} />
                  <input type="text" name="period" placeholder="Period (e.g. 2026-Q3)" required className="w-full rounded border border-soft-taupe px-2 py-1 text-xs" />
                  <input type="text" name="category" placeholder="Category (coaching, admin...)" required className="w-full rounded border border-soft-taupe px-2 py-1 text-xs" />
                  <input type="number" name="planned_hours" placeholder="Planned hours" step="any" className="w-full rounded border border-soft-taupe px-2 py-1 text-xs" />
                  <input type="number" name="actual_hours" placeholder="Actual hours" step="any" className="w-full rounded border border-soft-taupe px-2 py-1 text-xs" />
                  <button type="submit" className="lc-btn-secondary text-xs">Add</button>
                </form>
              </details>
            </Card>
          ))}
        </div>
      ) : (
        <p className="mt-6 text-sm text-soft-taupe">No capacity profiles set up yet.</p>
      )}

      <details className="mt-6">
        <summary className="cursor-pointer text-sm text-deep-indigo underline">Set up capacity profile</summary>
        <form action={upsertCapacityProfile} className="mt-2 max-w-md space-y-2">
          <select name="workspace_member_id" required className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
            <option value="">Select member&hellip;</option>
            {membersWithoutProfile.map((m) => (
              <option key={m.id} value={m.id}>{displayNameByAuthUserId.get(m.user_id) ?? "Member"}</option>
            ))}
          </select>
          <input type="number" name="weekly_hours" placeholder="Available weekly hours" step="any" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <input type="number" name="meeting_limit" placeholder="Meeting limit (hours/week)" step="any" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <input type="number" name="decision_limit" placeholder="Decision limit (per day)" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <input type="number" name="client_cap" placeholder="Client cap" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <input type="text" name="energy_load" placeholder="Energy load notes" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <textarea name="fixed_constraints" placeholder="Fixed constraints" rows={2} className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <textarea name="recovery_rules" placeholder="Recovery and rest rules" rows={2} className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <button type="submit" className="lc-btn-primary">Save profile</button>
        </form>
      </details>

      <Card className="mt-6 text-sm text-soft-taupe">
        Capacity warnings that block enrollment, campaign expansion, or additional
        commitments (Section 6) are deferred — they depend on the enrollment and
        campaign-approval flows reading this data, which isn&apos;t wired up yet.
        This page builds the data foundation those warnings will read from.
      </Card>
    </div>
  );
}
