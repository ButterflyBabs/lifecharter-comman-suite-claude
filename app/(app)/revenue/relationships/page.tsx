import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { Card, PageHeader } from "@/components/ui";
import { addPerson, addOrganization } from "./actions";

export default async function RelationshipsPage() {
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="p-8">
        <PageHeader title="Relationships and CRM" />
        <p className="mt-2 text-sm text-soft-taupe">No workspace yet.</p>
      </div>
    );
  }

  const supabase = await createClient();

  const [{ data: people }, { data: organizations }] = await Promise.all([
    supabase
      .from("people")
      .select("id, preferred_name, first_name, last_name, email, primary_pathway, next_action")
      .eq("workspace_id", workspaceId)
      .is("archived_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("organizations")
      .select("id, name, domain, industry, next_action")
      .eq("workspace_id", workspaceId)
      .is("archived_at", null)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="p-8">
      <PageHeader
        title="Relationships and CRM"
        description="One complete record for each person and organization across all roles and lifecycle stages."
      />

      <section className="mt-6">
        <h2 className="text-lg font-semibold text-deep-indigo">People</h2>
        {people && people.length > 0 && (
          <ul className="mt-2 space-y-2">
            {people.map((p) => (
              <li key={p.id}>
                <Card className="text-sm">
                  <p className="font-medium">
                    {p.preferred_name || `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "Unnamed"}
                  </p>
                  <p className="text-soft-taupe">
                    {p.email ?? "—"} {p.primary_pathway ? `· ${p.primary_pathway.toUpperCase()}` : ""}
                  </p>
                  {p.next_action && <p className="mt-1">Next: {p.next_action}</p>}
                </Card>
              </li>
            ))}
          </ul>
        )}
        <details className="mt-3">
          <summary className="cursor-pointer text-sm text-deep-indigo underline">Add person</summary>
          <form action={addPerson} className="mt-2 max-w-md space-y-2">
            <input type="text" name="preferred_name" placeholder="Preferred name" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
            <div className="grid grid-cols-2 gap-2">
              <input type="text" name="first_name" placeholder="First name" className="rounded border border-soft-taupe px-3 py-2 text-sm" />
              <input type="text" name="last_name" placeholder="Last name" className="rounded border border-soft-taupe px-3 py-2 text-sm" />
            </div>
            <input type="email" name="email" placeholder="Email" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
            <input type="text" name="phone" placeholder="Phone" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
            <select name="primary_pathway" defaultValue="" className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
              <option value="">No pathway</option>
              <option value="b2b">B2B</option>
              <option value="b2c">B2C</option>
              <option value="partner">Partner</option>
            </select>
            <input type="text" name="next_action" placeholder="Next action" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
            <button type="submit" className="lc-btn-secondary">Add person</button>
          </form>
        </details>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-deep-indigo">Organizations</h2>
        {organizations && organizations.length > 0 && (
          <ul className="mt-2 space-y-2">
            {organizations.map((o) => (
              <li key={o.id}>
                <Card className="text-sm">
                  <p className="font-medium">{o.name}</p>
                  <p className="text-soft-taupe">
                    {o.industry ?? "—"} {o.domain ? `· ${o.domain}` : ""}
                  </p>
                  {o.next_action && <p className="mt-1">Next: {o.next_action}</p>}
                </Card>
              </li>
            ))}
          </ul>
        )}
        <details className="mt-3">
          <summary className="cursor-pointer text-sm text-deep-indigo underline">Add organization</summary>
          <form action={addOrganization} className="mt-2 max-w-md space-y-2">
            <input type="text" name="name" placeholder="Organization name" required className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
            <input type="text" name="domain" placeholder="Domain" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
            <input type="text" name="industry" placeholder="Industry" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
            <input type="text" name="size_band" placeholder="Size band" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
            <input type="text" name="website" placeholder="Website" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
            <input type="text" name="next_action" placeholder="Next action" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
            <button type="submit" className="lc-btn-secondary">Add organization</button>
          </form>
        </details>
      </section>
    </div>
  );
}
