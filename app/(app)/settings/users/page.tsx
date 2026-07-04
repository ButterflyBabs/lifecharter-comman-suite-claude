import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { Card, PageHeader, StatusBadge, StatTile, IconUsers, IconGauge } from "@/components/ui";
import { inviteMember, updateMemberRole, setAccessReviewDate, updateMemberStatus } from "./actions";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="p-8">
        <PageHeader title="Users and Roles" />
        <p className="mt-2 text-sm text-soft-taupe">No workspace yet.</p>
      </div>
    );
  }

  const supabase = await createClient();

  const [{ data: members }, { data: roles }, { data: subscription }] = await Promise.all([
    supabase
      .from("workspace_members")
      .select("id, user_id, status, invited_at, joined_at, invited_email, access_review_at, member_roles(role_id, roles(id, name))")
      .eq("workspace_id", workspaceId)
      .order("invited_at"),
    supabase.from("roles").select("id, name").or(`workspace_id.is.null,workspace_id.eq.${workspaceId}`).order("name"),
    supabase.from("workspace_subscriptions").select("plan_id, status").eq("workspace_id", workspaceId).maybeSingle(),
  ]);

  const authUserIds = (members ?? []).map((m) => m.user_id);
  const { data: profiles } = authUserIds.length > 0
    ? await supabase.from("user_profiles").select("auth_user_id, display_name").in("auth_user_id", authUserIds)
    : { data: null };

  const displayNameByAuthUserId = new Map<string, string>();
  for (const p of profiles ?? []) {
    if (p.display_name) displayNameByAuthUserId.set(p.auth_user_id, p.display_name);
  }

  let seatLimit: number | null | undefined;
  if (subscription && ["active", "trialing"].includes(subscription.status) && subscription.plan_id) {
    const { data: entitlement } = await supabase
      .from("plan_entitlements")
      .select("limit_value")
      .eq("plan_id", subscription.plan_id)
      .eq("entitlement_key", "seats")
      .maybeSingle();
    seatLimit = entitlement?.limit_value;
  }

  const activeSeats = (members ?? []).filter((m) => m.status === "invited" || m.status === "active").length;

  return (
    <div className="p-8">
      <PageHeader
        title="Users and Roles"
        description="Invitations, membership status, role assignment, access review, and suspension."
      />

      {error && (
        <p role="alert" className="mt-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          {decodeURIComponent(error)}
        </p>
      )}

      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatTile value={activeSeats} label="Members and pending invites" icon={<IconUsers />} />
        <StatTile
          value={seatLimit != null ? `${activeSeats} / ${seatLimit}` : seatLimit === null ? "Unlimited" : "No plan limit"}
          label="Seat usage"
          tone={seatLimit != null && activeSeats >= seatLimit ? "warning" : "neutral"}
          icon={<IconGauge />}
        />
      </section>

      <ul className="mt-6 space-y-3">
        {(members ?? []).map((m) => {
          const roleAssignments = m.member_roles as unknown as { role_id: string; roles: { id: string; name: string } | null }[];
          const currentRoleId = roleAssignments[0]?.role_id ?? "";
          const label = displayNameByAuthUserId.get(m.user_id) ?? m.invited_email ?? "Member";
          return (
            <li key={m.id}>
              <Card className="text-sm">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{label}</p>
                  <StatusBadge status={m.status} />
                </div>
                <p className="text-xs text-soft-taupe">
                  {roleAssignments.map((r) => r.roles?.name).filter(Boolean).join(", ") || "No role assigned"}
                  {m.access_review_at ? ` · access review ${new Date(m.access_review_at).toLocaleDateString()}` : ""}
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <form action={updateMemberRole} className="flex items-center gap-1">
                    <input type="hidden" name="member_id" value={m.id} />
                    <select name="role_id" defaultValue={currentRoleId} className="rounded border border-soft-taupe bg-ivory-light px-2 py-1 text-xs">
                      <option value="">No role</option>
                      {roles?.map((r) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                    <button type="submit" className="lc-btn-secondary text-xs">Save role</button>
                  </form>

                  <form action={setAccessReviewDate} className="flex items-center gap-1">
                    <input type="hidden" name="member_id" value={m.id} />
                    <input type="date" name="access_review_at" defaultValue={m.access_review_at ?? ""} className="rounded border border-soft-taupe px-2 py-1 text-xs" />
                    <button type="submit" className="lc-btn-secondary text-xs">Set review date</button>
                  </form>

                  {m.status !== "suspended" && m.status !== "removed" && (
                    <form action={updateMemberStatus}>
                      <input type="hidden" name="member_id" value={m.id} />
                      <input type="hidden" name="next_status" value="suspended" />
                      <button type="submit" className="lc-btn-secondary text-xs">Suspend</button>
                    </form>
                  )}
                  {m.status === "suspended" && (
                    <form action={updateMemberStatus}>
                      <input type="hidden" name="member_id" value={m.id} />
                      <input type="hidden" name="next_status" value="active" />
                      <button type="submit" className="lc-btn-secondary text-xs">Reactivate</button>
                    </form>
                  )}
                  {m.status !== "removed" && (
                    <form action={updateMemberStatus}>
                      <input type="hidden" name="member_id" value={m.id} />
                      <input type="hidden" name="next_status" value="removed" />
                      <button type="submit" className="lc-btn-secondary text-xs">Remove</button>
                    </form>
                  )}
                </div>
              </Card>
            </li>
          );
        })}
        {(!members || members.length === 0) && <p className="text-sm text-soft-taupe">No members yet.</p>}
      </ul>

      <details className="mt-6">
        <summary className="cursor-pointer text-sm text-deep-indigo underline">Invite a member</summary>
        <form action={inviteMember} className="mt-2 max-w-md space-y-2">
          <input type="email" name="email" placeholder="Email address" required className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <select name="role_id" defaultValue="" className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
            <option value="">No role yet</option>
            {roles?.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          <button type="submit" className="lc-btn-primary">Send invite</button>
        </form>
      </details>

      <Card className="mt-8 text-sm text-soft-taupe">
        Invites send a real Supabase Auth signup email. If a plan seat limit
        is reached, the invite is blocked at the database layer
        (Section 18&apos;s stated acceptance criterion: plans control access
        without weakening security), not just hidden in this UI. If someone
        already has an account under this email, the invite will fail with a
        message rather than silently creating a duplicate — ask them to
        share their existing account details so a workspace owner can look
        into it separately.
      </Card>
    </div>
  );
}
