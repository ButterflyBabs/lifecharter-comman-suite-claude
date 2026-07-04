import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { Card, PageHeader } from "@/components/ui";
import { createRole, updateRolePermissions, deleteRole } from "./actions";

type Permission = { id: string; code: string; resource: string; action: string; description: string | null };
type Role = { id: string; name: string; description: string | null; is_system: boolean };

export default async function RolesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="p-8">
        <PageHeader title="Roles and Permissions" />
        <p className="mt-2 text-sm text-soft-taupe">No workspace yet.</p>
      </div>
    );
  }

  const supabase = await createClient();

  const [{ data: systemRoles }, { data: customRoles }, { data: permissions }, { data: rolePermissions }] = await Promise.all([
    supabase.from("roles").select("id, name, description, is_system").is("workspace_id", null).order("name"),
    supabase.from("roles").select("id, name, description, is_system").eq("workspace_id", workspaceId).order("name"),
    supabase.from("permissions").select("id, code, resource, action, description").order("resource").order("action"),
    supabase.from("role_permissions").select("role_id, permission_id"),
  ]);

  const permissionIdsByRole = new Map<string, Set<string>>();
  for (const rp of rolePermissions ?? []) {
    if (!permissionIdsByRole.has(rp.role_id)) permissionIdsByRole.set(rp.role_id, new Set());
    permissionIdsByRole.get(rp.role_id)!.add(rp.permission_id);
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Roles and Permissions"
        description="Least-privilege permission catalog (resource.action.scope). System roles are shared across every workspace and read-only here; create a workspace-specific role to customize permissions."
      />

      {error && (
        <p role="alert" className="mt-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          {decodeURIComponent(error)}
        </p>
      )}

      <section className="mt-6">
        <h2 className="text-lg font-semibold text-deep-indigo">System roles</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(systemRoles as Role[] | null)?.map((role) => (
            <RoleCard key={role.id} role={role} permissions={permissions as Permission[] | null} assignedIds={permissionIdsByRole.get(role.id) ?? new Set()} editable={false} />
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-deep-indigo">Workspace-specific roles</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(customRoles as Role[] | null)?.map((role) => (
            <RoleCard key={role.id} role={role} permissions={permissions as Permission[] | null} assignedIds={permissionIdsByRole.get(role.id) ?? new Set()} editable />
          ))}
          {(!customRoles || customRoles.length === 0) && <p className="text-sm text-soft-taupe">No workspace-specific roles yet.</p>}
        </div>

        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-deep-indigo underline">Create workspace role</summary>
          <form action={createRole} className="mt-2 max-w-md space-y-2">
            <input type="text" name="name" placeholder="Role name" required className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
            <input type="text" name="description" placeholder="Description" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
            <button type="submit" className="lc-btn-primary">Create role</button>
          </form>
        </details>
      </section>
    </div>
  );
}

function RoleCard({
  role,
  permissions,
  assignedIds,
  editable,
}: {
  role: Role;
  permissions: Permission[] | null;
  assignedIds: Set<string>;
  editable: boolean;
}) {
  const grouped = new Map<string, Permission[]>();
  for (const p of permissions ?? []) {
    if (!grouped.has(p.resource)) grouped.set(p.resource, []);
    grouped.get(p.resource)!.push(p);
  }

  return (
    <Card className="text-sm">
      <p className="font-medium">{role.name}</p>
      {role.description && <p className="text-xs text-soft-taupe">{role.description}</p>}

      {editable ? (
        <form action={updateRolePermissions} className="mt-2 space-y-2">
          <input type="hidden" name="role_id" value={role.id} />
          {Array.from(grouped.entries()).map(([resource, perms]) => (
            <fieldset key={resource}>
              <legend className="text-xs font-medium text-deep-indigo">{resource}</legend>
              {perms.map((p) => (
                <label key={p.id} className="flex items-center gap-1 text-xs">
                  <input type="checkbox" name="permission_ids" value={p.id} defaultChecked={assignedIds.has(p.id)} />
                  {p.action}
                </label>
              ))}
            </fieldset>
          ))}
          <button type="submit" className="lc-btn-secondary text-xs">Save permissions</button>
        </form>
      ) : (
        <ul className="mt-2 text-xs text-soft-taupe">
          {(permissions ?? []).filter((p) => assignedIds.has(p.id)).map((p) => (
            <li key={p.id}>{p.code}</li>
          ))}
          {(permissions ?? []).filter((p) => assignedIds.has(p.id)).length === 0 && <li>No permissions recorded.</li>}
        </ul>
      )}

      {editable && (
        <form action={deleteRole} className="mt-2">
          <input type="hidden" name="role_id" value={role.id} />
          <button type="submit" className="lc-btn-secondary text-xs">Delete role</button>
        </form>
      )}
    </Card>
  );
}
