import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { Card, PageHeader, StatusBadge } from "@/components/ui";
import { createTeam, addTeamMembership, addResponsibility } from "./actions";

export default async function TeamPage() {
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="p-8">
        <PageHeader title="Team and Roles" />
        <p className="mt-2 text-sm text-soft-taupe">No workspace yet.</p>
      </div>
    );
  }

  const supabase = await createClient();

  const [{ data: teams }, { data: memberships }, { data: responsibilities }, { data: members }] = await Promise.all([
    supabase.from("teams").select("id, name, purpose, status").eq("workspace_id", workspaceId).order("created_at"),
    supabase.from("team_memberships").select("id, team_id, workspace_member_id, role, allocation_percent, status, access_review_at").eq("workspace_id", workspaceId),
    supabase.from("responsibilities").select("id, business_area, responsibility, owner_member_id, backup_member_id, criticality").eq("workspace_id", workspaceId).order("created_at"),
    supabase.from("workspace_members").select("id, user_id").eq("workspace_id", workspaceId).eq("status", "active"),
  ]);

  const authUserIds = (members ?? []).map((m) => m.user_id);
  const { data: profiles } = authUserIds.length > 0
    ? await supabase.from("user_profiles").select("auth_user_id, display_name").in("auth_user_id", authUserIds)
    : { data: null };

  const displayNameByAuthUserId = new Map<string, string>();
  for (const p of profiles ?? []) {
    if (p.display_name) displayNameByAuthUserId.set(p.auth_user_id, p.display_name);
  }

  const memberLabel = (workspaceMemberId: string | null) => {
    if (!workspaceMemberId) return "Unassigned";
    const member = (members ?? []).find((m) => m.id === workspaceMemberId);
    if (!member) return "Unassigned";
    return displayNameByAuthUserId.get(member.user_id) ?? "Member";
  };

  const membershipsByTeam = new Map<string, NonNullable<typeof memberships>>();
  for (const m of memberships ?? []) {
    if (!membershipsByTeam.has(m.team_id)) membershipsByTeam.set(m.team_id, []);
    membershipsByTeam.get(m.team_id)!.push(m);
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Team and Roles"
        description="Define roles, responsibilities, assignments, availability, and handoff expectations."
      />

      <section className="mt-6">
        <h2 className="text-lg font-semibold text-deep-indigo">Teams</h2>
        {teams && teams.length > 0 ? (
          <div className="mt-3 space-y-3">
            {teams.map((t) => (
              <Card key={t.id}>
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-deep-indigo">{t.name}</h3>
                  <StatusBadge status={t.status} />
                </div>
                {t.purpose && <p className="text-sm text-soft-taupe">{t.purpose}</p>}
                <ul className="mt-2 space-y-1 text-sm">
                  {(membershipsByTeam.get(t.id) ?? []).map((m) => (
                    <li key={m.id} className="flex items-center justify-between">
                      <span>{memberLabel(m.workspace_member_id)} {m.role ? `— ${m.role}` : ""} {m.allocation_percent ? `(${m.allocation_percent}%)` : ""}</span>
                      <StatusBadge status={m.status} />
                    </li>
                  ))}
                  {(membershipsByTeam.get(t.id) ?? []).length === 0 && (
                    <li className="text-soft-taupe">No members yet.</li>
                  )}
                </ul>
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-deep-indigo underline">Add member</summary>
                  <form action={addTeamMembership} className="mt-1 space-y-1">
                    <input type="hidden" name="team_id" value={t.id} />
                    <select name="workspace_member_id" required className="w-full rounded border border-soft-taupe bg-ivory-light px-2 py-1 text-xs">
                      <option value="">Select member&hellip;</option>
                      {members?.map((m) => (
                        <option key={m.id} value={m.id}>{displayNameByAuthUserId.get(m.user_id) ?? "Member"}</option>
                      ))}
                    </select>
                    <input type="text" name="role" placeholder="Role" className="w-full rounded border border-soft-taupe px-2 py-1 text-xs" />
                    <input type="number" name="allocation_percent" placeholder="Allocation %" min="0" max="100" className="w-full rounded border border-soft-taupe px-2 py-1 text-xs" />
                    <input type="date" name="start_at" className="w-full rounded border border-soft-taupe px-2 py-1 text-xs" />
                    <button type="submit" className="lc-btn-secondary text-xs">Add</button>
                  </form>
                </details>
              </Card>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-soft-taupe">No teams yet.</p>
        )}

        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-deep-indigo underline">Create team</summary>
          <form action={createTeam} className="mt-2 max-w-md space-y-2">
            <input type="text" name="name" placeholder="Team name" required className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
            <textarea name="purpose" placeholder="Purpose" rows={2} className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
            <button type="submit" className="lc-btn-primary">Create team</button>
          </form>
        </details>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-deep-indigo">Responsibilities</h2>
        <ul className="mt-3 space-y-2">
          {(responsibilities ?? []).map((r) => (
            <li key={r.id}>
              <Card className="text-sm">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{r.business_area}: {r.responsibility}</p>
                  <StatusBadge status={r.criticality} tone={r.criticality === "critical" ? "warning" : "neutral"} />
                </div>
                <p className="text-soft-taupe">
                  Owner: {memberLabel(r.owner_member_id)}
                  {r.criticality === "critical" && !r.backup_member_id && " · no backup owner assigned"}
                  {r.backup_member_id && ` · Backup: ${memberLabel(r.backup_member_id)}`}
                </p>
              </Card>
            </li>
          ))}
          {(!responsibilities || responsibilities.length === 0) && <p className="text-sm text-soft-taupe">No responsibilities recorded yet.</p>}
        </ul>

        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-deep-indigo underline">Add responsibility</summary>
          <form action={addResponsibility} className="mt-2 max-w-md space-y-2">
            <input type="text" name="business_area" placeholder="Business area" required className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
            <input type="text" name="responsibility" placeholder="Responsibility" required className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
            <select name="owner_member_id" className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
              <option value="">Primary owner&hellip;</option>
              {members?.map((m) => (
                <option key={m.id} value={m.id}>{displayNameByAuthUserId.get(m.user_id) ?? "Member"}</option>
              ))}
            </select>
            <select name="backup_member_id" defaultValue="" className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
              <option value="">No backup owner</option>
              {members?.map((m) => (
                <option key={m.id} value={m.id}>{displayNameByAuthUserId.get(m.user_id) ?? "Member"}</option>
              ))}
            </select>
            <select name="criticality" className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
              <option value="standard">Standard</option>
              <option value="important">Important</option>
              <option value="critical">Critical</option>
            </select>
            <input type="text" name="review_cadence" placeholder="Review cadence" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
            <button type="submit" className="lc-btn-primary">Add responsibility</button>
          </form>
        </details>
      </section>
    </div>
  );
}
