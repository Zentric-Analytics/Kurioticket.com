import type { MarketImageRegistryEntry } from "../imageTypes";

export type StagedProductionMarketImagePack = {
  batchId: string;
  market: string;
  entries: MarketImageRegistryEntry[];
  notes: string;
};

export const stagedProductionMarketImagePacks: StagedProductionMarketImagePack[] = [];

export const stagedProductionMarketImages = stagedProductionMarketImagePacks.flatMap(
  (pack) => pack.entries,
);
