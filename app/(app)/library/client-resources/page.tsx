import { AssetLibrarySection } from "@/components/library/AssetLibrarySection";

export default function Page() {
  return (
    <AssetLibrarySection
      assetType="client_resource"
      libraryPath="/library/client-resources"
      title="Client Resources"
      description="Shareable guides, worksheets, and reference material for clients."
      defaultVisibility="client_visible"
    />
  );
}
