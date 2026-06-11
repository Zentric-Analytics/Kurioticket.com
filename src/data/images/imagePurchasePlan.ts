import { imageInventory } from "./imageInventory";
import type { ImageUsage, InventoriedImage } from "./imageTypes";

export type ImagePurchaseCategory = {
  id: string;
  label: string;
  productionPriority: InventoriedImage["productionPriority"];
  products: InventoriedImage["product"][];
  usages: ImageUsage[];
  pageSurfaces: string[];
  candidateCount: number;
  firstBatchTarget: number;
  rationale: string;
};

const premiumCandidates = imageInventory.filter((image) => image.premiumReplacementRequired);

const categoryDefinitions: Array<Omit<ImagePurchaseCategory, "pageSurfaces" | "candidateCount">> = [
  {
    id: "phase-3-homepage-flight-discovery",
    label: "Homepage flight discovery and route inspiration",
    productionPriority: "p0-launch-critical",
    products: ["flights"],
    usages: ["flight-inspiration-card"],
    firstBatchTarget: 18,
    rationale:
      "Homepage fare discovery cards are high-trust acquisition surfaces and should receive the first premium destination/route set.",
  },
  {
    id: "phase-3-market-home-destinations",
    label: "Market homepage destination modules",
    productionPriority: "p0-launch-critical",
    products: ["destinations"],
    usages: ["homepage-destination-card"],
    firstBatchTarget: 16,
    rationale:
      "Localized home modules repeat across markets and should use premium images for the top global cities before broad launch.",
  },
  {
    id: "phase-3-hotel-fallbacks",
    label: "Hotel result fallback pool",
    productionPriority: "p0-launch-critical",
    products: ["hotels"],
    usages: ["hotel-result-fallback"],
    firstBatchTarget: 8,
    rationale:
      "Fallback hotel imagery must stay generic, premium, and non-misleading whenever provider-real property images are unavailable.",
  },
  {
    id: "phase-3-destination-index",
    label: "Destination index cards",
    productionPriority: "p1-public-important",
    products: ["destinations"],
    usages: ["destination-page-card"],
    firstBatchTarget: 12,
    rationale:
      "The public destination index is a browsing and SEO surface that should move from free stock to curated premium city imagery.",
  },
  {
    id: "phase-3-deals-and-flight-results",
    label: "Deals and flight result support cards",
    productionPriority: "p1-public-important",
    products: ["deals", "flights"],
    usages: ["deal-card", "flight-route-card"],
    firstBatchTarget: 6,
    rationale:
      "Deals and result-page inspiration cards are important public surfaces but can follow the homepage and hotel fallback sets.",
  },
];

export const phase3ImagePurchasePlan: ImagePurchaseCategory[] = categoryDefinitions.map((category) => {
  const matches = premiumCandidates.filter(
    (image) =>
      image.productionPriority === category.productionPriority &&
      category.products.includes(image.product) &&
      category.usages.some((usage) => (Array.isArray(image.usage) ? image.usage.includes(usage) : image.usage === usage)),
  );

  return {
    ...category,
    products: [...category.products],
    usages: [...category.usages],
    pageSurfaces: [...new Set(matches.flatMap((image) => image.pageSurfaces))].sort(),
    candidateCount: matches.length,
  };
});

export const phase3FirstSixtyCandidateImages = premiumCandidates
  .sort((left, right) => {
    const priorityCompare = left.productionPriority.localeCompare(right.productionPriority);
    if (priorityCompare !== 0) return priorityCompare;
    return left.id.localeCompare(right.id);
  })
  .slice(0, 60);
