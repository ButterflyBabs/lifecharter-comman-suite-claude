import { AssetLibrarySection } from "@/components/library/AssetLibrarySection";

export default function Page() {
  return (
    <AssetLibrarySection
      assetType="offer"
      libraryPath="/library/offers"
      title="Offer Collateral"
      description="Pricing sheets, one-pagers, and proposal boilerplate supporting the offer catalog. For offer scope, pricing, and economics themselves, see Architecture -> Offers."
    />
  );
}
