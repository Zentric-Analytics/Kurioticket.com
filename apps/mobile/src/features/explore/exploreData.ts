import type { FlowIconName } from "../flow/FlowIcon";
import { curatedPopularLocations } from "../flow/locationCatalogue";

export const HERO_SLIDES = [
  { id: "coast", label: "Beach escapes", image: require("../../../assets/heroes/explore-tropical-beach.png"), destination: "Bali" },
  { id: "paris", label: "City breaks", image: require("../../../assets/destinations/paris.jpg"), destination: "Paris" },
  { id: "london", label: "Culture and landmarks", image: require("../../../assets/destinations/london.jpg"), destination: "London" },
  { id: "new-york", label: "City skylines", image: require("../../../assets/destinations/new-york.jpg"), destination: "New York" },
] as const;

export const POPULAR_DESTINATIONS = curatedPopularLocations;

export const INTERESTS = [
  { name: "Beach escapes", destination: "Bali", icon: "beach", image: require("../../../assets/heroes/explore-tropical-beach.png") },
  { name: "City breaks", destination: "Paris", icon: "city", image: require("../../../assets/destinations/paris.jpg") },
  { name: "Culture and landmarks", destination: "London", icon: "culture", image: require("../../../assets/destinations/london.jpg") },
  { name: "City skylines", destination: "New York", icon: "city", image: require("../../../assets/destinations/new-york.jpg") },
] as const satisfies readonly { name: string; destination: string; icon: FlowIconName; image: number }[];
