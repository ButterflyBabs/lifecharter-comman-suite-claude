import { AssetLibrarySection } from "@/components/library/AssetLibrarySection";

export default function Page() {
  return (
    <AssetLibrarySection
      assetType="brand"
      libraryPath="/library/brand"
      title="Brand Library"
      description="Logos, style guides, and brand board reference files. For brand voice, message pillars, and claim rules, see Architecture -> Brand."
    />
  );
}
