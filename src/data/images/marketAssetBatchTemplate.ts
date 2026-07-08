import type { MarketAssetManifest, MarketAssetManifestEntry } from "./marketAssetManifest";
import {
  getProductionAssetRequirementsForMarket,
  productionAssetIntakeMarkets,
  type ProductionAssetIntakeMarket,
} from "./productionMarketAssetRequirements";

const marketLocales: Record<ProductionAssetIntakeMarket, string> = {
  US: "en-US",
  GH: "en-GH",
  NG: "en-NG",
  KE: "en-KE",
  ZA: "en-ZA",
  BR: "pt-BR",
  GB: "en-GB",
  AE: "en-AE",
  IN: "en-IN",
  CA: "en-CA",
};

export const marketAssetTemplatePlaceholderDimensions: MarketAssetManifestEntry["dimensions"] =
  "0 x 0";

export type MarketAssetBatchTemplateOptions = {
  batchId?: string;
  createdAt?: string;
  owner?: string;
};

export function buildMarketAssetBatchTemplate(
  market: ProductionAssetIntakeMarket,
  options: MarketAssetBatchTemplateOptions = {},
): MarketAssetManifest {
  const createdAt = options.createdAt ?? "YYYY-MM-DD";
  const batchId = options.batchId ?? `market-assets-${createdAt}-${market.toLowerCase()}-001`;
  const owner = options.owner ?? "Zentric Analytics";
  const requirements = getProductionAssetRequirementsForMarket(market);

  return {
    batchId,
    createdAt,
    owner,
    entries: requirements.flatMap((requirement) =>
      Array.from({ length: requirement.requiredCount }, (_, index) =>
        buildTemplateEntry(market, requirement.region, requirement.usage, index + 1),
      ),
    ),
  };
}

export function isProductionAssetIntakeMarket(market: string): market is ProductionAssetIntakeMarket {
  return productionAssetIntakeMarkets.includes(market as ProductionAssetIntakeMarket);
}

function buildTemplateEntry(
  market: ProductionAssetIntakeMarket,
  region: MarketAssetManifestEntry["region"],
  usage: MarketAssetManifestEntry["usage"],
  index: number,
): MarketAssetManifestEntry {
  const lowerMarket = market.toLowerCase();
  const fileSlug = usage.replaceAll("-", "/");
  const slotNumber = String(index).padStart(2, "0");

  return {
    id: `${lowerMarket}-${usage}-${slotNumber}`,
    market,
    region,
    locale: marketLocales[market],
    audience: "local",
    product: usage === "flight-inspiration-card" ? "flights" : "global",
    usage,
    source: "premium-stock",
    sourceFilePath: `assets/markets/${lowerMarket}/${fileSlug}/${slotNumber}-source.jpg`,
    publicImagePath: `/images/markets/${lowerMarket}/${fileSlug}/${slotNumber}.jpg`,
    alt: `TODO: Write approved ${market} ${usage} alt text ${slotNumber}`,
    intendedSlot: `${market} ${usage} ${slotNumber}`,
    sourcePage: "TODO: Add source or asset purchase URL",
    license: "TODO: Add commercial license type",
    licenseNotes: "TODO: Add approved license notes for web and mobile-web use",
    dimensions: marketAssetTemplatePlaceholderDimensions,
    cropNotes: "TODO: Add desktop and mobile crop approval notes",
    focalPoint: "center",
    desktopApproved: false,
    mobileApproved: false,
    pageSurfaces: [usageToPageSurface(usage)],
    reviewer: "TODO: Add reviewer name or team",
    notes: `Template placeholder for ${market} ${usage} asset ${slotNumber}. Replace ${marketAssetTemplatePlaceholderDimensions} dimensions before conversion. Do not convert until all TODOs are replaced and crop approvals are true.`,
  };
}

function usageToPageSurface(usage: MarketAssetManifestEntry["usage"]): string {
  if (usage === "homepage-hero") return "Homepage hero";
  if (usage === "homepage-destination-card") return "Homepage destination card";
  if (usage === "flight-inspiration-card") return "Flight inspiration card";
  return usage;
}
