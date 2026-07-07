import type { MarketImageRegistryEntry } from "../imageTypes";
import { marketHeroContract } from "./shared";

export const regionalMarketImagePacks: MarketImageRegistryEntry[] = [
  marketHeroContract({ id: "north-america-homepage-hero-contract-001", region: "north-america", locale: "en-US", label: "North America fallback hero" }),
  marketHeroContract({ id: "latin-america-homepage-hero-contract-001", region: "latin-america", locale: "pt-BR", label: "Latin America fallback hero" }),
  marketHeroContract({ id: "west-africa-homepage-hero-contract-001", region: "west-africa", locale: "en-GH", label: "West Africa fallback hero" }),
  marketHeroContract({ id: "east-africa-homepage-hero-contract-001", region: "east-africa", locale: "en-KE", label: "East Africa fallback hero" }),
  marketHeroContract({ id: "southern-africa-homepage-hero-contract-001", region: "southern-africa", locale: "en-ZA", label: "Southern Africa fallback hero" }),
  marketHeroContract({ id: "middle-east-homepage-hero-contract-001", region: "middle-east", locale: "en-AE", label: "Middle East fallback hero" }),
  marketHeroContract({ id: "south-asia-homepage-hero-contract-001", region: "south-asia", locale: "en-IN", label: "South Asia fallback hero" }),
  marketHeroContract({ id: "western-europe-homepage-hero-contract-001", region: "western-europe", locale: "en-GB", label: "Western Europe fallback hero" }),
  marketHeroContract({ id: "east-asia-homepage-hero-contract-001", region: "east-asia", locale: "ja-JP", label: "East Asia fallback hero" }),
  marketHeroContract({ id: "oceania-homepage-hero-contract-001", region: "oceania", locale: "en-AU", label: "Oceania fallback hero" }),
];
