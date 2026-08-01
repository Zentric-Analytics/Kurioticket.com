import type { FlowIconName } from "../flow/FlowIcon";
import { featuredLocations } from "../flow/locationCatalogue";

export const HERO_SLIDES = [
  { id: "coast", label: "Coastal adventure", image: require("../../../assets/heroes/explore-tropical-beach.png"), destination: "Bali" },
  { id: "santorini", label: "Santorini", image: require("../../../assets/heroes/home-santorini.png"), destination: "Santorini" },
  { id: "london", label: "London", image: require("../../../assets/destinations/london.jpg"), destination: "London" },
  { id: "balloons", label: "Balloon adventure", image: require("../../../assets/heroes/deals-balloons.png"), destination: "Cappadocia" },
] as const;

export const FEATURED_DESTINATIONS = featuredLocations;

export const INTERESTS = [
  { name: "Beach escapes", destination: "Bali", icon: "beach", image: require("../../../assets/heroes/explore-tropical-beach.png") },
  { name: "City breaks", destination: "Paris", icon: "city", image: require("../../../assets/destinations/paris.jpg") },
  { name: "Culture and landmarks", destination: "London", icon: "culture", image: require("../../../assets/destinations/london.jpg") },
  { name: "Island scenery", destination: "Santorini", icon: "nature", image: require("../../../assets/heroes/home-santorini.png") },
] as const satisfies readonly { name: string; destination: string; icon: FlowIconName; image: number }[];
