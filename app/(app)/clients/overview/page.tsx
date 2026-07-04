import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import {
  Card,
  PageHeader,
  StatTile,
  StatusBadge,
  IconBadge,
  IconCompass,
  IconUsers,
  IconCheckCircle,
  IconClipboard,
  IconFlag,
  IconHelpCircle,
} from "@/components/ui";
import { addClient } from "./actions";

export default async function ClientsOverviewPage() {
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="p-8">
        <PageHeader title="Client Overview" />
        <p className="mt-2 text-sm text-soft-taupe">No workspace yet.</p>
      </div>
    );
  }

  const supabase = await createClient();

  const [
    { data: clients },
    { count: openSupportRequests },
    { data: latestHealth },
    { data: organizations },
  ] = await Promise.all([
    supabase
      .from("clients")
      .select("id, status, start_at, organizations(name), people(preferred_name, first_name, last_name)")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false }),
    supabase.from("support_requests").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).in("status", ["open", "in_progress"]),
    supabase.from("client_health_events").select("client_id, status, calculated_at").eq("workspace_id", workspaceId).order("calculated_at", { ascending: false }),
    supabase.from("organizations").select("id, name").eq("workspace_id", workspaceId),
  ]);

  const latestHealthByClient = new Map<string, string>();
  for (const h of latestHealth ?? []) {
    if (!latestHealthByClient.has(h.client_id)) latestHealthByClient.set(h.client_id, h.status);
  }

  const total = clients?.length ?? 0;
  const active = (clients ?? []).filter((c) => c.status === "active").length;
  const onboarding = (clients ?? []).filter((c) => c.status === "onboarding").length;
  const atRisk = [...latestHealthByClient.values()].filter((s) => s === "at_risk").length;

  const clientLabel = (c: NonNullable<typeof clients>[number]) => {
    const org = (c.organizations as unknown as { name: string } | null)?.name;
    const person = c.people as unknown as { preferred_name: string | null; first_name: string | null; last_name: string | null } | null;
    return org ?? person?.preferred_name ?? [person?.first_name, person?.last_name].filter(Boolean).join(" ") ?? "Untitled client";
  };

  return (
    <div className="p-8">
      <PageHeader
        title="Client Overview"
        description="Who is active, who needs attention, and what is next for every client relationship."
      />

      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <StatTile value={total} label="Total clients" icon={<IconUsers />} />
        <StatTile value={active} label="Active" icon={<IconCheckCircle />} />
        <StatTile value={onboarding} label="Onboarding" icon={<IconClipboard />} />
        <StatTile value={atRisk} label="At-risk (latest health check)" tone={atRisk > 0 ? "error" : "neutral"} icon={<IconFlag />} />
        <StatTile
          value={openSupportRequests ?? 0}
          label="Open support requests"
          tone={(openSupportRequests ?? 0) > 0 ? "warning" : "neutral"}
          icon={<IconHelpCircle />}
        />
      </section>

      <section className="mt-8">
        <h2 className="lc-section-heading text-lg font-semibold text-deep-indigo">
          <IconBadge size="sm"><IconCompass /></IconBadge>
          Go to
        </h2>
        <div className="mt-2 flex flex-wrap gap-2 text-sm">
          <Link href="/clients/journey-design" className="lc-btn-secondary">Journey Design</Link>
          <Link href="/clients/onboarding" className="lc-btn-secondary">Onboarding</Link>
          <Link href="/clients/programs" className="lc-btn-secondary">Programs</Link>
          <Link href="/clients/sessions" className="lc-btn-secondary">Sessions</Link>
          <Link href="/clients/actions" className="lc-btn-secondary">Actions</Link>
          <Link href="/clients/outcomes" className="lc-btn-secondary">Outcomes</Link>
          <Link href="/clients/health" className="lc-btn-secondary">Health</Link>
          <Link href="/clients/renewals" className="lc-btn-secondary">Renewals</Link>
          <Link href="/clients/advocacy" className="lc-btn-secondary">Advocacy</Link>
          <Link href="/clients/portal" className="lc-btn-secondary">Portal</Link>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="lc-section-heading text-lg font-semibold text-deep-indigo">
          <IconBadge size="sm"><IconUsers /></IconBadge>
          Clients
        </h2>
        {clients && clients.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {clients.map((c) => (
              <li key={c.id}>
                <Link href={`/clients/active/${c.id}`}>
                  <Card className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium text-deep-indigo">{clientLabel(c)}</p>
                      <p className="text-soft-taupe">Since {new Date(c.start_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {latestHealthByClient.get(c.id) && <StatusBadge status={latestHealthByClient.get(c.id)!} />}
                      <StatusBadge status={c.status} />
                    </div>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-soft-taupe">No clients yet.</p>
        )}
      </section>

      <details className="mt-6">
        <summary className="cursor-pointer text-sm text-deep-indigo underline">Add client</summary>
        <form action={addClient} className="mt-2 max-w-md space-y-2">
          <select name="organization_id" required className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
            <option value="">Select organization&hellip;</option>
            {organizations?.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
          <input type="text" name="source_opportunity_id" placeholder="Source opportunity ID (optional)" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <button type="submit" className="lc-btn-primary">Add client</button>
        </form>
      </details>
    </div>
  );
}
