import { marketImageRegistry } from "./marketImageRegistry";
import {
  productionMarketAssetRequirements,
  type ProductionMarketAssetRequirement,
} from "./productionMarketAssetRequirements";
import type { ImageUsage, MarketImageRegistryEntry } from "./imageTypes";

type RequirementCoverage = {
  requirement: ProductionMarketAssetRequirement;
  approvedImages: MarketImageRegistryEntry[];
  approvedCount: number;
  missingCount: number;
  complete: boolean;
};

export type MarketAssetApprovalAuditResult = {
  coverage: RequirementCoverage[];
  completeRequirements: RequirementCoverage[];
  incompleteRequirements: RequirementCoverage[];
  totalRequiredImages: number;
  totalApprovedImages: number;
  totalMissingImages: number;
  isComplete: boolean;
};

const approvedStatuses = new Set<MarketImageRegistryEntry["status"]>([
  "premium-approved",
  "provider-real",
]);

export function auditMarketAssetApprovals(
  requirements = productionMarketAssetRequirements,
  registry = marketImageRegistry,
): MarketAssetApprovalAuditResult {
  const coverage = requirements.map((requirement) => {
    const approvedImages = registry.filter((image) => imageMeetsRequirement(image, requirement));
    const approvedCount = approvedImages.length;
    const missingCount = Math.max(requirement.requiredCount - approvedCount, 0);

    return {
      requirement,
      approvedImages,
      approvedCount,
      missingCount,
      complete: missingCount === 0,
    };
  });

  const completeRequirements = coverage.filter((item) => item.complete);
  const incompleteRequirements = coverage.filter((item) => !item.complete);
  const totalRequiredImages = requirements.reduce(
    (total, requirement) => total + requirement.requiredCount,
    0,
  );
  const totalApprovedImages = coverage.reduce(
    (total, item) => total + Math.min(item.approvedCount, item.requirement.requiredCount),
    0,
  );
  const totalMissingImages = coverage.reduce((total, item) => total + item.missingCount, 0);

  return {
    coverage,
    completeRequirements,
    incompleteRequirements,
    totalRequiredImages,
    totalApprovedImages,
    totalMissingImages,
    isComplete: incompleteRequirements.length === 0,
  };
}

function imageMeetsRequirement(
  image: MarketImageRegistryEntry,
  requirement: ProductionMarketAssetRequirement,
) {
  return (
    image.market === requirement.market &&
    image.region === requirement.region &&
    imageUsageIncludes(image.usage, requirement.usage) &&
    approvedStatuses.has(image.status) &&
    image.source !== "temporary" &&
    image.source !== "unsplash" &&
    image.source !== "pexels" &&
    Boolean(image.license || image.licenseNotes) &&
    image.desktopApproved &&
    image.mobileApproved &&
    !image.premiumReplacementRequired
  );
}

function imageUsageIncludes(imageUsage: ImageUsage | ImageUsage[], requiredUsage: ImageUsage) {
  return Array.isArray(imageUsage) ? imageUsage.includes(requiredUsage) : imageUsage === requiredUsage;
}
