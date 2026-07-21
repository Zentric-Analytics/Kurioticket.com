import type {
  ImageMarketCode,
  ImageRegionCode,
  ImageUsage,
} from "./imageTypes";

export const productionAssetIntakeMarkets = [
  "US",
  "GH",
  "NG",
  "KE",
  "ZA",
  "BR",
  "GB",
  "AE",
  "IN",
  "CA",
] as const satisfies ImageMarketCode[];

export type ProductionAssetIntakeMarket = (typeof productionAssetIntakeMarkets)[number];

export type ProductionAssetRequirementStatus =
  | "needed"
  | "sourcing"
  | "purchased"
  | "uploaded"
  | "registered"
  | "crop-approved"
  | "production-approved";

export type ProductionMarketAssetRequirement = {
  id: string;
  market: ProductionAssetIntakeMarket;
  region: ImageRegionCode;
  usage: ImageUsage;
  requiredCount: number;
  priority: "p0" | "p1" | "p2";
  brief: string;
  mustHave: string[];
  mustAvoid: string[];
  recommendedAspectRatios: string[];
  status: ProductionAssetRequirementStatus;
  notes?: string;
};

const marketRegions: Record<ProductionAssetIntakeMarket, ImageRegionCode> = {
  US: "north-america",
  GH: "west-africa",
  NG: "west-africa",
  KE: "east-africa",
  ZA: "southern-africa",
  BR: "latin-america",
  GB: "western-europe",
  AE: "middle-east",
  IN: "south-asia",
  CA: "north-america",
};

const marketLabels: Record<ProductionAssetIntakeMarket, string> = {
  US: "United States",
  GH: "Ghana",
  NG: "Nigeria",
  KE: "Kenya",
  ZA: "South Africa",
  BR: "Brazil",
  GB: "United Kingdom",
  AE: "United Arab Emirates",
  IN: "India",
  CA: "Canada",
};

export const productionMarketAssetRequirements: ProductionMarketAssetRequirement[] =
  productionAssetIntakeMarkets.flatMap((market) => {
    const label = marketLabels[market];
    const region = marketRegions[market];

    return [
      {
        id: `${market.toLowerCase()}-homepage-hero-production-asset-requirement`,
        market,
        region,
        usage: "homepage-hero",
        requiredCount: 1,
        priority: "p0",
        brief: `${label} marketplace homepage hero that feels local, trustworthy, premium, and travel-oriented without using misleading landmarks.`,
        mustHave: [
          "commercial web and mobile-web license or owned asset approval",
          "clear subject or destination context with room for homepage text overlay",
          "desktop and mobile crop potential",
          "authentic local or market-relevant visual context",
        ],
        mustAvoid: [
          "watermarks",
          "random free-stock URLs",
          "misleading landmarks or wrong-country visuals",
          "busy compositions that conflict with hero text",
        ],
        recommendedAspectRatios: ["16:9", "3:2", "4:3 source crop-safe"],
        status: "needed",
      },
      {
        id: `${market.toLowerCase()}-homepage-destination-card-production-asset-requirement`,
        market,
        region,
        usage: "homepage-destination-card",
        requiredCount: 8,
        priority: "p1",
        brief: `${label} marketplace destination card set for local or high-intent travel discovery.`,
        mustHave: [
          "city or destination-specific visual relevance",
          "commercial license or owned asset approval",
          "consistent quality across the card set",
          "meaningful alt text plan",
        ],
        mustAvoid: [
          "duplicate source identity across multiple cards unless intentional",
          "generic airport-only visuals for destination cards",
          "stretched or low-resolution crops",
        ],
        recommendedAspectRatios: ["4:3", "3:2", "1:1 crop-safe"],
        status: "needed",
      },
      {
        id: `${market.toLowerCase()}-flight-inspiration-production-asset-requirement`,
        market,
        region,
        usage: "flight-inspiration-card",
        requiredCount: 4,
        priority: "p1",
        brief: `${label} flight inspiration image set for route discovery and market-aware travel motivation.`,
        mustHave: [
          "clear travel intent",
          "premium or owned source",
          "safe crop for responsive cards",
          "no visible airline brand misuse unless licensed",
        ],
        mustAvoid: [
          "unlicensed airline logos as the main subject",
          "generic screenshots or UI mockups",
          "visuals that imply unavailable inventory",
        ],
        recommendedAspectRatios: ["16:9", "4:3", "3:2"],
        status: "needed",
      },
    ];
  });

export function getProductionAssetRequirementsForMarket(market: ProductionAssetIntakeMarket) {
  return productionMarketAssetRequirements.filter((requirement) => requirement.market === market);
}
