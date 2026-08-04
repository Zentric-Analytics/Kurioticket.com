import type { FlowIconName } from "../flow/FlowIcon";
import { curatedPopularLocations } from "../flow/locationCatalogue";

export const POPULAR_DESTINATIONS = curatedPopularLocations;

export const INTERESTS = [
  { name: "Beach escapes", destinationId: "id-bali", icon: "beach" },
  { name: "City breaks", destinationId: "fr-paris", icon: "city" },
  { name: "Culture and landmarks", destinationId: "gb-london", icon: "culture" },
  { name: "City skylines", destinationId: "us-new-york", icon: "city" },
] as const satisfies readonly { name: string; destinationId: string; icon: FlowIconName }[];
