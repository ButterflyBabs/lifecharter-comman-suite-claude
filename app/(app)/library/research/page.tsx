import { AssetLibrarySection } from "@/components/library/AssetLibrarySection";

export default function Page() {
  return (
    <AssetLibrarySection
      assetType="research"
      libraryPath="/library/research"
      title="Research Library"
      description="Source documents and files backing research findings. For the findings and scoring themselves, see Revenue -> Outreach."
    />
  );
}
