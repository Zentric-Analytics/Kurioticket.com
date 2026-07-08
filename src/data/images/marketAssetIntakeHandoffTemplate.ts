import type { ProductionAssetIntakeMarket } from "./productionMarketAssetRequirements";
import { buildMarketAssetBatchTemplate } from "./marketAssetBatchTemplate";

export type MarketAssetIntakeHandoffItem = {
  id: string;
  market: ProductionAssetIntakeMarket;
  usage: string;
  intendedSlot: string;
  sourceAssetPath: string;
  purchaseOrSourceUrl: string;
  licenseType: string;
  licenseNotes: string;
  altText: string;
  dimensions: string;
  desktopCropNotes: string;
  mobileCropNotes: string;
  reviewer: string;
  approvedAt: string;
  readyForManifest: boolean;
  notes: string;
};

export type MarketAssetIntakeHandoff = {
  batchId: string;
  market: ProductionAssetIntakeMarket;
  createdAt: string;
  owner: string;
  items: MarketAssetIntakeHandoffItem[];
};

export type MarketAssetIntakeHandoffTemplateOptions = {
  batchId?: string;
  createdAt?: string;
  owner?: string;
};

export function buildMarketAssetIntakeHandoffTemplate(
  market: ProductionAssetIntakeMarket,
  options: MarketAssetIntakeHandoffTemplateOptions = {},
): MarketAssetIntakeHandoff {
  const manifest = buildMarketAssetBatchTemplate(market, options);

  return {
    batchId: manifest.batchId,
    market,
    createdAt: manifest.createdAt,
    owner: manifest.owner,
    items: manifest.entries.map((entry) => ({
      id: entry.id,
      market,
      usage: entry.usage,
      intendedSlot: entry.intendedSlot,
      sourceAssetPath: "TODO: Add approved source asset path",
      purchaseOrSourceUrl: "TODO: Add purchase, license, or owned-source URL",
      licenseType: "TODO: Add commercial license type",
      licenseNotes: "TODO: Add approved web and mobile-web license notes",
      altText: "TODO: Add approved alt text",
      dimensions: "TODO: Add real source dimensions",
      desktopCropNotes: "TODO: Add desktop crop approval notes",
      mobileCropNotes: "TODO: Add mobile crop approval notes",
      reviewer: "TODO: Add reviewer name or team",
      approvedAt: "YYYY-MM-DD",
      readyForManifest: false,
      notes: "Do not mark ready until license, alt text, dimensions, and crop approvals are complete.",
    })),
  };
}
