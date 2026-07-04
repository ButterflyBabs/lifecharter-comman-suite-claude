import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { Card, PageHeader } from "@/components/ui";

// A representative cross-section, not a full-text index across all 175
// tables — each entry links to the section it lives in (most modules in
// this app are one list page per workspace, not one route per record), so
// results are grouped by type rather than deep-linked to an individual row.
// A real inverted/full-text search index is a reasonable later refinement
// once search usage shows which object types matter most.
const SEARCH_TARGETS = [
  { type: "Tasks", table: "tasks", column: "title", href: "/work" },
  { type: "Decisions", table: "decisions", column: "question", href: "/decisions" },
  { type: "Opportunities", table: "opportunities", column: "name", href: "/revenue/pipeline" },
  { type: "Assets", table: "assets", column: "title", href: "/library/history" },
  { type: "Templates", table: "templates", column: "name", href: "/library/templates" },
  { type: "SOPs", table: "sops", column: "name", href: "/operations/sops" },
  { type: "KPIs", table: "kpis", column: "name", href: "/reviews/reports" },
  { type: "AI agents", table: "ai_agents", column: "name", href: "/ai/agents" },
] as const;

type SearchResult = (typeof SEARCH_TARGETS)[number] & { matches: { id: string; [key: string]: string }[] };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="p-8">
        <PageHeader title="Search" />
        <p className="mt-2 text-sm text-soft-taupe">No workspace yet.</p>
      </div>
    );
  }

  const query = q?.trim();
  const supabase = await createClient();

  const results: SearchResult[] = query
    ? await Promise.all(
        SEARCH_TARGETS.map(async (target) => {
          const { data } = await supabase
            .from(target.table)
            .select(`id, ${target.column}`)
            .eq("workspace_id", workspaceId)
            .ilike(target.column, `%${query}%`)
            .limit(10);
          return { ...target, matches: (data ?? []) as { id: string; [key: string]: string }[] };
        }),
      )
    : [];

  const totalMatches = results.reduce((sum, r) => sum + r.matches.length, 0);

  return (
    <div className="p-8">
      <PageHeader title="Search" description="Search across tasks, decisions, opportunities, library items, SOPs, KPIs, and AI agents." />

      <form method="get" className="mt-6 flex max-w-md gap-2">
        <input
          type="search"
          name="q"
          defaultValue={query ?? ""}
          placeholder="Search this workspace…"
          className="w-full rounded border border-soft-taupe px-3 py-2 text-sm"
        />
        <button type="submit" className="lc-btn-primary">Search</button>
      </form>

      {query && (
        <p className="mt-4 text-sm text-soft-taupe">
          {totalMatches} result{totalMatches === 1 ? "" : "s"} for &quot;{query}&quot;
        </p>
      )}

      <div className="mt-4 space-y-4">
        {results
          .filter((r) => r.matches.length > 0)
          .map((r) => (
            <Card key={r.type}>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-deep-indigo">{r.type}</h2>
                <a href={r.href} className="text-xs text-deep-indigo underline">
                  Open section
                </a>
              </div>
              <ul className="mt-2 space-y-1 text-sm">
                {r.matches.map((m) => (
                  <li key={m.id}>{m[r.column]}</li>
                ))}
              </ul>
            </Card>
          ))}
        {query && totalMatches === 0 && <p className="text-sm text-soft-taupe">No matches.</p>}
      </div>
    </div>
  );
}
