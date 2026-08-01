import type { ImageSourcePropType } from "react-native";
import { destinationById } from "./destinationCatalogue";

export type DestinationMedia = {
  destinationId: string;
  source: ImageSourcePropType;
  accessibilityLabel: string;
  focalPoint?: "center" | "top" | "bottom";
  provenance: "verified-local" | "fallback";
};

/** Only repository assets whose depicted destination can be confidently identified. */
export const EXPLICIT_DESTINATION_MEDIA: readonly DestinationMedia[] = [
  { destinationId: "us-new-york", source: require("../../../assets/destinations/new-york.jpg"), accessibilityLabel: "New York skyline", focalPoint: "center", provenance: "verified-local" },
  { destinationId: "gb-london", source: require("../../../assets/destinations/london.jpg"), accessibilityLabel: "London city view", focalPoint: "center", provenance: "verified-local" },
  { destinationId: "fr-paris", source: require("../../../assets/destinations/paris.jpg"), accessibilityLabel: "Paris city view", focalPoint: "center", provenance: "verified-local" },
] as const;

const FALLBACK_SOURCE = require("../../../assets/heroes/explore-tropical-beach.png") as ImageSourcePropType;
const explicitMediaById = new Map(EXPLICIT_DESTINATION_MEDIA.map((media) => [media.destinationId, media]));

/** Complete presentation manifest: every catalogue destination resolves to an image source. */
export const DESTINATION_MEDIA: readonly DestinationMedia[] = [...destinationById.keys()].map((destinationId) =>
  explicitMediaById.get(destinationId) ?? {
    destinationId,
    source: FALLBACK_SOURCE,
    accessibilityLabel: "Representative travel landscape",
    focalPoint: "center",
    provenance: "fallback",
  },
);

export const destinationMediaById = new Map(DESTINATION_MEDIA.map((media) => [media.destinationId, media]));
export function destinationImage(destinationId: string) { return destinationMediaById.get(destinationId)?.source; }
export function assertDestinationMediaIsValid() {
  for (const media of DESTINATION_MEDIA) if (!destinationById.has(media.destinationId)) throw new Error(`Unknown media destination: ${media.destinationId}`);
  for (const destinationId of destinationById.keys()) if (!destinationMediaById.has(destinationId)) throw new Error(`Missing destination media: ${destinationId}`);
}
