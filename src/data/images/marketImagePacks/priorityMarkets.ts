import type { ImageMarketCode, MarketImageRegistryEntry } from "../imageTypes";
import { marketHeroContract } from "./shared";

const priorityMarkets: Array<{ market: ImageMarketCode; region: MarketImageRegistryEntry["region"]; locale: string; label: string }> = [
  { market: "US", region: "north-america", locale: "en-US", label: "US marketplace hero" },
  { market: "GB", region: "western-europe", locale: "en-GB", label: "UK marketplace hero" },
  { market: "CA", region: "north-america", locale: "en-CA", label: "Canada marketplace hero" },
  { market: "BR", region: "latin-america", locale: "pt-BR", label: "Brazil marketplace hero" },
  { market: "MX", region: "latin-america", locale: "es-MX", label: "Mexico marketplace hero" },
  { market: "GH", region: "west-africa", locale: "en-GH", label: "Ghana marketplace hero" },
  { market: "NG", region: "west-africa", locale: "en-NG", label: "Nigeria marketplace hero" },
  { market: "KE", region: "east-africa", locale: "en-KE", label: "Kenya marketplace hero" },
  { market: "ZA", region: "southern-africa", locale: "en-ZA", label: "South Africa marketplace hero" },
  { market: "AE", region: "middle-east", locale: "en-AE", label: "UAE marketplace hero" },
  { market: "IN", region: "south-asia", locale: "en-IN", label: "India marketplace hero" },
  { market: "FR", region: "western-europe", locale: "fr-FR", label: "France marketplace hero" },
  { market: "DE", region: "western-europe", locale: "de-DE", label: "Germany marketplace hero" },
  { market: "ES", region: "western-europe", locale: "es-ES", label: "Spain marketplace hero" },
  { market: "IT", region: "western-europe", locale: "it-IT", label: "Italy marketplace hero" },
  { market: "NL", region: "western-europe", locale: "nl-NL", label: "Netherlands marketplace hero" },
  { market: "TR", region: "middle-east", locale: "tr-TR", label: "Turkey marketplace hero" },
  { market: "JP", region: "east-asia", locale: "ja-JP", label: "Japan marketplace hero" },
  { market: "KR", region: "east-asia", locale: "ko-KR", label: "Korea marketplace hero" },
  { market: "AU", region: "oceania", locale: "en-AU", label: "Australia marketplace hero" },
];

export const priorityMarketImagePacks: MarketImageRegistryEntry[] = priorityMarkets.map((entry) =>
  marketHeroContract({
    id: `${entry.market.toLowerCase()}-homepage-hero-contract-001`,
    market: entry.market,
    region: entry.region,
    locale: entry.locale,
    label: entry.label,
  }),
);

export const priorityMarketCodes = priorityMarkets.map((entry) => entry.market);
