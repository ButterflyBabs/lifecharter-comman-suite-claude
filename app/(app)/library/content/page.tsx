import { AssetLibrarySection } from "@/components/library/AssetLibrarySection";

export default function Page() {
  return (
    <AssetLibrarySection
      assetType="content"
      libraryPath="/library/content"
      title="Content Library"
      description="Creative files and source content supporting marketing and client-facing communication. For campaign, funnel-stage, and publishing tracking, see Revenue -> Content."
    />
  );
}
