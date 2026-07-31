import type { FlowIconName } from "../flow/FlowIcon";

export const HERO_SLIDES = [
  { id: "coast", label: "Coastal adventure", image: require("../../../assets/heroes/explore-tropical-beach.png"), destination: "Bali" },
  { id: "santorini", label: "Santorini", image: require("../../../assets/heroes/home-santorini.png"), destination: "Santorini" },
  { id: "london", label: "London", image: require("../../../assets/destinations/london.jpg"), destination: "London" },
  { id: "balloons", label: "Balloon adventure", image: require("../../../assets/heroes/deals-balloons.png"), destination: "Cappadocia" },
] as const;

export const POPULAR_DESTINATIONS = [
  { name: "Paris", region: "France", price: "$420", image: require("../../../assets/destinations/paris.jpg") },
  { name: "Bali", region: "Indonesia", price: "$680", image: require("../../../assets/destinations/bali.jpg") },
  { name: "Santorini", region: "Greece", price: "$350", image: require("../../../assets/heroes/home-santorini.png") },
  { name: "New York", region: "United States", price: "$540", image: require("../../../assets/destinations/new-york.jpg") },
] as const;

export const TRENDING = [
  ["New York", "trending"], ["London", "search"], ["Dubai", "trending"],
  ["Rome", "search"], ["Barcelona", "trending"], ["Bangkok", "search"],
] as const satisfies readonly (readonly [string, FlowIconName])[];

export const INTERESTS = [
  { name: "Beaches", destination: "Bali", icon: "beach", image: require("../../../assets/destinations/bali.jpg") },
  { name: "Cities", destination: "New York", icon: "city", image: require("../../../assets/destinations/new-york.jpg") },
  { name: "Adventure", destination: "London", icon: "adventure", image: require("../../../assets/destinations/london.jpg") },
  { name: "Nature", destination: "Bali", icon: "nature", image: require("../../../assets/heroes/explore-tropical-beach.png") },
  { name: "Culture", destination: "Paris", icon: "culture", image: require("../../../assets/destinations/paris.jpg") },
  { name: "Family", destination: "Santorini", icon: "family", image: require("../../../assets/heroes/home-santorini.png") },
] as const satisfies readonly { name: string; destination: string; icon: FlowIconName; image: number }[];
