import type { MarketImageRegistryEntry } from "../imageTypes";
import { priorityMarketImagePacks } from "./priorityMarkets";
import { regionalMarketImagePacks } from "./regions";

export { priorityMarketCodes, priorityMarketImagePacks } from "./priorityMarkets";
export { regionalMarketImagePacks } from "./regions";

export const marketImagePacks: MarketImageRegistryEntry[] = [
  ...regionalMarketImagePacks,
  ...priorityMarketImagePacks,
];
