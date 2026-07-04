import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { Card, PageHeader } from "@/components/ui";

// Cross-cutting version history for the two version tables the Library
// section itself directly manages (asset_versions, template_versions).
// Other versioned objects (sop_versions, contract_versions,
// legal_document_versions, proposal_versions, program_versions) already
// have their own history visible on their owning page.

type Row = {
  kind: "Asset" | "Template";
  id: string;
  version: number;
  label: string;
  detail: string | null;
  created_at: string;
};

export default async function HistoryPage() {
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="p-8">
        <PageHeader title="Version History" />
        <p className="mt-2 text-sm text-soft-taupe">No workspace yet.</p>
      </div>
    );
  }

  const supabase = await createClient();

  const [{ data: assetVersions }, { data: templateVersions }] = await Promise.all([
    supabase
      .from("asset_versions")
      .select("id, version, storage_path, checksum, created_at, assets(title)")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("template_versions")
      .select("id, version, content, created_at, templates(name)")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const rows: Row[] = [
    ...(assetVersions ?? []).map((v) => ({
      kind: "Asset" as const,
      id: v.id,
      version: v.version,
      label: (v.assets as unknown as { title: string } | null)?.title ?? "Untitled asset",
      detail: v.checksum ? `checksum ${v.checksum}` : v.storage_path,
      created_at: v.created_at,
    })),
    ...(templateVersions ?? []).map((v) => ({
      kind: "Template" as const,
      id: v.id,
      version: v.version,
      label: (v.templates as unknown as { name: string } | null)?.name ?? "Untitled template",
      detail: v.content ? `${v.content.slice(0, 80)}${v.content.length > 80 ? "…" : ""}` : null,
      created_at: v.created_at,
    })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="p-8">
      <PageHeader
        title="Version History"
        description="Most recent asset and template versions across the workspace, newest first."
      />

      <ul className="mt-6 space-y-2">
        {rows.map((r) => (
          <li key={`${r.kind}-${r.id}`}>
            <Card className="text-sm">
              <div className="flex items-center justify-between">
                <p className="font-medium">
                  {r.label} <span className="text-xs text-soft-taupe">({r.kind} v{r.version})</span>
                </p>
                <p className="text-xs text-soft-taupe">{new Date(r.created_at).toLocaleString()}</p>
              </div>
              {r.detail && <p className="text-xs text-soft-taupe">{r.detail}</p>}
            </Card>
          </li>
        ))}
        {rows.length === 0 && <p className="text-sm text-soft-taupe">No versioned items yet.</p>}
      </ul>
    </div>
  );
}
