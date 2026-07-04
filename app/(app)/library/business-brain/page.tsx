import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { Card, PageHeader, StatusBadge, StatTile } from "@/components/ui";
import { createKnowledgeEntry, updateKnowledgeEntry, approveKnowledgeEntry, retireKnowledgeEntry } from "./actions";

type KnowledgeEntry = {
  id: string;
  knowledge_type: string;
  title: string;
  structured_content: { body?: string } | null;
  version: number;
  status: string;
  effective_at: string | null;
  review_at: string | null;
  visibility: string;
};

// Nine of Business Brain's eleven knowledge categories already have a
// purpose-built home from earlier phases; this hub surfaces each as a live
// status/count linking to the real page rather than duplicating the data
// (see docs/data-model.md's Library assumptions). Only Policies and
// Glossary get real CRUD here, via knowledge_entries.
const HUB_LINKS = [
  { category: "Business identity & founder principles", href: "/architecture/founder" },
  { category: "Vision and strategy", href: "/architecture/strategy" },
  { category: "Business model", href: "/architecture/business-model" },
  { category: "Market and positioning", href: "/architecture/market" },
  { category: "Brand, messaging, and proof", href: "/architecture/brand" },
  { category: "Offers and pricing", href: "/architecture/offers" },
  { category: "Decisions", href: "/decisions" },
];

export default async function BusinessBrainPage() {
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="p-8">
        <PageHeader title="Business Brain" />
        <p className="mt-2 text-sm text-soft-taupe">No workspace yet.</p>
      </div>
    );
  }

  const supabase = await createClient();

  const [{ data: entries }, { count: decisionCount }, { count: offerCount }] = await Promise.all([
    supabase
      .from("knowledge_entries")
      .select("id, knowledge_type, title, structured_content, version, status, effective_at, review_at, visibility")
      .eq("workspace_id", workspaceId)
      .is("archived_at", null)
      .order("knowledge_type")
      .order("title"),
    supabase.from("decisions").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId),
    supabase.from("offers").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId),
  ]);

  const policies = (entries as unknown as KnowledgeEntry[] | null)?.filter((e) => e.knowledge_type === "policy") ?? [];
  const glossary = (entries as unknown as KnowledgeEntry[] | null)?.filter((e) => e.knowledge_type === "glossary") ?? [];

  return (
    <div className="p-8">
      <PageHeader
        title="Business Brain"
        description="Canonical structured knowledge used by people, workflows, and AI. Business identity, strategy, brand, and offers already have dedicated pages; policies and glossary terms live here."
      />

      <nav aria-label="Library sections" className="mt-4 flex flex-wrap gap-2">
        <Link href="/library/templates" className="lc-btn-secondary">Templates</Link>
        <Link href="/library/brand" className="lc-btn-secondary">Brand</Link>
        <Link href="/library/offers" className="lc-btn-secondary">Offer Collateral</Link>
        <Link href="/library/client-resources" className="lc-btn-secondary">Client Resources</Link>
        <Link href="/library/sops" className="lc-btn-secondary">SOPs</Link>
        <Link href="/library/agreements" className="lc-btn-secondary">Agreements</Link>
        <Link href="/library/content" className="lc-btn-secondary">Content</Link>
        <Link href="/library/recordings" className="lc-btn-secondary">Recordings</Link>
        <Link href="/library/research" className="lc-btn-secondary">Research</Link>
        <Link href="/library/history" className="lc-btn-secondary">Version History</Link>
      </nav>

      <section className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {HUB_LINKS.map((link) => (
          <Link key={link.href} href={link.href}>
            <Card hover className="text-sm">
              <p className="font-medium">{link.category}</p>
              <p className="mt-1 text-xs text-deep-indigo underline">Open module</p>
            </Card>
          </Link>
        ))}
        <StatTile value={offerCount ?? 0} label="Offers defined" />
        <StatTile value={decisionCount ?? 0} label="Decisions recorded" />
      </section>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <KnowledgeSection title="Policies" knowledgeType="policy" entries={policies} />
        <KnowledgeSection title="Glossary" knowledgeType="glossary" entries={glossary} />
      </div>
    </div>
  );
}

function KnowledgeSection({
  title,
  knowledgeType,
  entries,
}: {
  title: string;
  knowledgeType: "policy" | "glossary";
  entries: KnowledgeEntry[];
}) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-deep-indigo">{title}</h2>
      <ul className="mt-3 space-y-2">
        {entries.map((e) => (
          <li key={e.id}>
            <Card className="text-sm">
              <div className="flex items-center justify-between">
                <p className="font-medium">{e.title}</p>
                <StatusBadge status={e.status} />
              </div>
              <p className="text-xs text-soft-taupe">
                v{e.version} &middot; {e.visibility.replace(/_/g, " ")}
                {e.review_at ? ` · review by ${new Date(e.review_at).toLocaleDateString()}` : ""}
              </p>
              {e.structured_content?.body && <p className="mt-1 whitespace-pre-wrap text-soft-taupe">{e.structured_content.body}</p>}

              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-deep-indigo underline">Edit</summary>
                <form action={updateKnowledgeEntry} className="mt-1 space-y-1">
                  <input type="hidden" name="entry_id" value={e.id} />
                  <input type="hidden" name="current_version" value={e.version} />
                  <input type="text" name="title" defaultValue={e.title} required className="w-full rounded border border-soft-taupe px-2 py-1 text-xs" />
                  <textarea name="body" defaultValue={e.structured_content?.body ?? ""} rows={3} className="w-full rounded border border-soft-taupe px-2 py-1 text-xs" />
                  <input type="date" name="review_at" defaultValue={e.review_at ?? ""} className="w-full rounded border border-soft-taupe px-2 py-1 text-xs" />
                  <button type="submit" className="lc-btn-secondary text-xs">Save (bumps to v{e.version + 1}, resets to draft)</button>
                </form>
              </details>

              <div className="mt-2 flex gap-2">
                {e.status !== "approved" && (
                  <form action={approveKnowledgeEntry}>
                    <input type="hidden" name="entry_id" value={e.id} />
                    <button type="submit" className="lc-btn-secondary text-xs">Approve</button>
                  </form>
                )}
                <form action={retireKnowledgeEntry}>
                  <input type="hidden" name="entry_id" value={e.id} />
                  <button type="submit" className="lc-btn-secondary text-xs">Retire</button>
                </form>
              </div>
            </Card>
          </li>
        ))}
        {entries.length === 0 && <p className="text-sm text-soft-taupe">None yet.</p>}
      </ul>

      <details className="mt-4">
        <summary className="cursor-pointer text-sm text-deep-indigo underline">Add {title.toLowerCase().replace(/s$/, "")}</summary>
        <form action={createKnowledgeEntry} className="mt-2 max-w-md space-y-2">
          <input type="hidden" name="knowledge_type" value={knowledgeType} />
          <input type="text" name="title" placeholder="Title" required className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <textarea name="body" placeholder="Content" rows={3} className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <input type="date" name="review_at" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <select name="visibility" defaultValue="internal" className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
            <option value="internal">Internal</option>
            <option value="client_visible">Client visible</option>
            <option value="public">Public</option>
          </select>
          <button type="submit" className="lc-btn-primary">Add</button>
        </form>
      </details>
    </section>
  );
}
