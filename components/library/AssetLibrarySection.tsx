import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { Card, PageHeader, StatusBadge } from "@/components/ui";
import { createLibraryAsset, addAssetVersion, archiveAsset } from "@/lib/library/asset-actions";

type AssetVersion = {
  id: string;
  version: number;
  storage_path: string | null;
  mime_type: string | null;
  checksum: string | null;
  created_at: string;
};

export async function AssetLibrarySection({
  assetType,
  libraryPath,
  title,
  description,
  defaultVisibility = "internal",
}: {
  assetType: string;
  libraryPath: string;
  title: string;
  description: string;
  defaultVisibility?: "internal" | "client_visible" | "public";
}) {
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="p-8">
        <PageHeader title={title} />
        <p className="mt-2 text-sm text-soft-taupe">No workspace yet.</p>
      </div>
    );
  }

  const supabase = await createClient();

  const { data: assets } = await supabase
    .from("assets")
    .select(
      "id, title, status, visibility, current_version_id, asset_versions(id, version, storage_path, mime_type, checksum, created_at), asset_tags(tags(name))",
    )
    .eq("workspace_id", workspaceId)
    .eq("asset_type", assetType)
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  return (
    <div className="p-8">
      <PageHeader title={title} description={description} />

      {assets && assets.length > 0 ? (
        <div className="mt-6 space-y-4">
          {assets.map((a) => {
            const versions = (a.asset_versions as unknown as AssetVersion[]).slice().sort((x, y) => y.version - x.version);
            const current = versions.find((v) => v.id === a.current_version_id);
            const tags = (a.asset_tags as unknown as { tags: { name: string } | null }[])
              .map((t) => t.tags?.name)
              .filter((name): name is string => Boolean(name));

            return (
              <Card key={a.id}>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-deep-indigo">{a.title}</h2>
                  <StatusBadge status={a.status} />
                </div>
                <p className="text-xs text-soft-taupe">
                  {a.visibility.replace(/_/g, " ")}
                  {tags.length > 0 ? ` · ${tags.join(", ")}` : ""}
                </p>

                {current && (
                  <div className="mt-2 rounded bg-soft-lavender/10 p-2 text-sm">
                    <p className="font-medium">Version {current.version}</p>
                    {current.storage_path && (
                      <a
                        href={current.storage_path}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-deep-indigo underline"
                      >
                        {current.storage_path}
                      </a>
                    )}
                    {current.mime_type && <p className="text-xs text-soft-taupe">{current.mime_type}</p>}
                  </div>
                )}

                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-deep-indigo underline">Add version</summary>
                  <form action={addAssetVersion} className="mt-1 space-y-1">
                    <input type="hidden" name="library_path" value={libraryPath} />
                    <input type="hidden" name="asset_id" value={a.id} />
                    <input
                      type="url"
                      name="external_url"
                      placeholder="Link to file (Drive, Dropbox, etc.)"
                      className="w-full rounded border border-soft-taupe px-2 py-1 text-xs"
                    />
                    <input
                      type="text"
                      name="mime_type"
                      placeholder="File type (e.g. application/pdf)"
                      className="w-full rounded border border-soft-taupe px-2 py-1 text-xs"
                    />
                    <input
                      type="text"
                      name="checksum"
                      placeholder="Checksum (optional)"
                      className="w-full rounded border border-soft-taupe px-2 py-1 text-xs"
                    />
                    <button type="submit" className="lc-btn-secondary text-xs">
                      Add version
                    </button>
                  </form>
                </details>

                <form action={archiveAsset} className="mt-2">
                  <input type="hidden" name="library_path" value={libraryPath} />
                  <input type="hidden" name="asset_id" value={a.id} />
                  <button type="submit" className="lc-btn-secondary text-xs">
                    Archive
                  </button>
                </form>
              </Card>
            );
          })}
        </div>
      ) : (
        <p className="mt-6 text-sm text-soft-taupe">Nothing here yet.</p>
      )}

      <details className="mt-6">
        <summary className="cursor-pointer text-sm text-deep-indigo underline">Add item</summary>
        <form action={createLibraryAsset} className="mt-2 max-w-md space-y-2">
          <input type="hidden" name="library_path" value={libraryPath} />
          <input type="hidden" name="asset_type" value={assetType} />
          <input
            type="text"
            name="title"
            placeholder="Title"
            required
            className="w-full rounded border border-soft-taupe px-3 py-2 text-sm"
          />
          <select
            name="visibility"
            defaultValue={defaultVisibility}
            className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm"
          >
            <option value="internal">Internal</option>
            <option value="client_visible">Client visible</option>
            <option value="public">Public</option>
          </select>
          <input
            type="text"
            name="tags"
            placeholder="Tags (comma-separated)"
            className="w-full rounded border border-soft-taupe px-3 py-2 text-sm"
          />
          <button type="submit" className="lc-btn-primary">
            Add
          </button>
        </form>
      </details>

      <Card className="mt-8 text-sm text-soft-taupe">
        No file storage bucket is configured in this build, so &quot;Add
        version&quot; stores a link to where the file actually lives (Drive,
        Dropbox, etc.) rather than an uploaded file &mdash; the same
        deferral already recorded for Phase 8&apos;s data export. Folder
        hierarchy is not built yet; tags are the organization and filter
        mechanism for now.
      </Card>
    </div>
  );
}
