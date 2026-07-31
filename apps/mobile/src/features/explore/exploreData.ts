import type { FlowIconName } from "../flow/FlowIcon";
import { featuredLocations } from "../flow/locationCatalogue";

export const HERO_SLIDES = [
  { id: "coast", label: "Coastal adventure", image: require("../../../assets/heroes/explore-tropical-beach.png"), destination: "Bali" },
  { id: "santorini", label: "Santorini", image: require("../../../assets/heroes/home-santorini.png"), destination: "Santorini" },
  { id: "london", label: "London", image: require("../../../assets/destinations/london.jpg"), destination: "London" },
  { id: "balloons", label: "Balloon adventure", image: require("../../../assets/heroes/deals-balloons.png"), destination: "Cappadocia" },
] as const;

export const FEATURED_DESTINATIONS = featuredLocations;

export const QUICK_DESTINATIONS = [
  ["New York", "search"], ["London", "search"], ["Dubai", "search"],
  ["Rome", "search"], ["Barcelona", "search"], ["Bangkok", "search"],
] as const satisfies readonly (readonly [string, FlowIconName])[];

export const INTERESTS = [
  { name: "Beaches", destination: "Bali", icon: "beach", image: require("../../../assets/heroes/explore-tropical-beach.png") },
  { name: "Cities", destination: "New York", icon: "city", image: require("../../../assets/destinations/new-york.jpg") },
  { name: "Adventure", destination: "London", icon: "adventure", image: require("../../../assets/destinations/london.jpg") },
  { name: "Nature", destination: "Bali", icon: "nature", image: require("../../../assets/heroes/explore-tropical-beach.png") },
  { name: "Culture", destination: "Paris", icon: "culture", image: require("../../../assets/destinations/paris.jpg") },
  { name: "Family", destination: "Santorini", icon: "family", image: require("../../../assets/heroes/home-santorini.png") },
] as const satisfies readonly { name: string; destination: string; icon: FlowIconName; image: number }[];
