import type { MarketAssetManifest, MarketAssetManifestEntry } from "./marketAssetManifest";

export type MarketAssetManifestSummary = {
  batchId: string;
  createdAt: string;
  owner: string;
  totalEntries: number;
  markets: Record<string, number>;
  usages: Record<string, number>;
  sources: Record<string, number>;
  approvedForDesktop: number;
  approvedForMobile: number;
  fullyCropApproved: number;
  missingApprovalDates: number;
  uniquePublicImagePaths: number;
  duplicatePublicImagePaths: string[];
};

export function summarizeMarketAssetManifest(
  manifest: MarketAssetManifest,
): MarketAssetManifestSummary {
  const publicPathCounts = countBy(manifest.entries, (entry) => entry.publicImagePath);

  return {
    batchId: manifest.batchId,
    createdAt: manifest.createdAt,
    owner: manifest.owner,
    totalEntries: manifest.entries.length,
    markets: countBy(manifest.entries, (entry) => entry.market),
    usages: countBy(manifest.entries, (entry) => entry.usage),
    sources: countBy(manifest.entries, (entry) => entry.source),
    approvedForDesktop: manifest.entries.filter((entry) => entry.desktopApproved).length,
    approvedForMobile: manifest.entries.filter((entry) => entry.mobileApproved).length,
    fullyCropApproved: manifest.entries.filter((entry) => entry.desktopApproved && entry.mobileApproved).length,
    missingApprovalDates: manifest.entries.filter((entry) => !entry.approvedAt).length,
    uniquePublicImagePaths: Object.keys(publicPathCounts).length,
    duplicatePublicImagePaths: Object.entries(publicPathCounts)
      .filter(([, count]) => count > 1)
      .map(([path]) => path)
      .sort(),
  };
}

function countBy(
  entries: MarketAssetManifestEntry[],
  getKey: (entry: MarketAssetManifestEntry) => string,
): Record<string, number> {
  return entries.reduce<Record<string, number>>((counts, entry) => {
    const key = getKey(entry);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}
