import { AssetLibrarySection } from "@/components/library/AssetLibrarySection";

export default function Page() {
  return (
    <AssetLibrarySection
      assetType="recording"
      libraryPath="/library/recordings"
      title="Recordings"
      description="Call, session, and meeting recordings."
    />
  );
}
