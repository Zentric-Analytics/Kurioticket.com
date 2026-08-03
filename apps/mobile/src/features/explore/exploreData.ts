import type { FlowIconName } from "../flow/FlowIcon";
import { curatedPopularLocations } from "../flow/locationCatalogue";

export const HERO_SLIDES = [
  { id: "coast", label: "Beach escapes", destinationId: "id-bali" },
  { id: "paris", label: "City breaks", destinationId: "fr-paris" },
  { id: "london", label: "Culture and landmarks", destinationId: "gb-london" },
  { id: "new-york", label: "City skylines", destinationId: "us-new-york" },
] as const;

export const POPULAR_DESTINATIONS = curatedPopularLocations;

export const INTERESTS = [
  { name: "Beach escapes", destinationId: "id-bali", icon: "beach" },
  { name: "City breaks", destinationId: "fr-paris", icon: "city" },
  { name: "Culture and landmarks", destinationId: "gb-london", icon: "culture" },
  { name: "City skylines", destinationId: "us-new-york", icon: "city" },
] as const satisfies readonly { name: string; destinationId: string; icon: FlowIconName }[];
