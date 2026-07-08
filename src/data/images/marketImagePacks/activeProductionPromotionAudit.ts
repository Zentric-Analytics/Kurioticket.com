import { marketImagePacks } from "./index";
import type { MarketImageRegistryEntry } from "../imageTypes";

export type ActiveProductionPromotionAuditResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
  market: string;
  productionEntryCount: number;
};

function isProductionEntry(entry: MarketImageRegistryEntry, market: string): boolean {
  return (
    entry.market === market &&
    entry.status !== "replace-before-launch" &&
    entry.status !== "temporary" &&
    entry.contentRole !== "replacement-needed"
  );
}

export function auditActiveProductionPromotionForMarket(
  market: string,
  activeEntries: MarketImageRegistryEntry[] = marketImagePacks,
): ActiveProductionPromotionAuditResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!market.trim()) {
    errors.push("market is required for active production promotion audit.");
  }

  const productionEntries = activeEntries.filter((entry) => isProductionEntry(entry, market));

  productionEntries.forEach((entry) => {
    const label = `${entry.market ?? "unknown"}:${entry.id}`;

    if (entry.premiumReplacementRequired) {
      errors.push(`${label} still requires premium replacement.`);
    }

    if (!entry.desktopApproved || !entry.mobileApproved) {
      errors.push(`${label} is missing desktop or mobile crop approval.`);
    }

    if (!entry.license && !entry.licenseNotes) {
      errors.push(`${label} is missing license metadata.`);
    }

    if (entry.launchCritical && entry.status !== "premium-approved" && entry.status !== "provider-real") {
      errors.push(`${label} is launch-critical but not production-approved.`);
    }

    if (!entry.pageSurfaces.length) {
      warnings.push(`${label} does not list page surfaces.`);
    }
  });

  if (market.trim() && productionEntries.length === 0) {
    warnings.push(`${market} does not have active production-promoted market entries yet.`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    market,
    productionEntryCount: productionEntries.length,
  };
}
