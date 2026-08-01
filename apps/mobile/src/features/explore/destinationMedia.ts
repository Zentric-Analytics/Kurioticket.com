import type { ImageSourcePropType } from "react-native";
import { destinationById } from "./destinationCatalogue";

export type DestinationMedia = {
  destinationId: string;
  localImage?: ImageSourcePropType;
  remoteUrl?: string;
  accessibilityLabel: string;
  focalPoint?: "center" | "top" | "bottom";
};

/** Only repository assets whose depicted destination can be confidently identified. */
export const DESTINATION_MEDIA: readonly DestinationMedia[] = [
  { destinationId: "us-new-york", localImage: require("../../../assets/destinations/new-york.jpg"), accessibilityLabel: "New York skyline", focalPoint: "center" },
  { destinationId: "gb-london", localImage: require("../../../assets/destinations/london.jpg"), accessibilityLabel: "London city view", focalPoint: "center" },
  { destinationId: "fr-paris", localImage: require("../../../assets/destinations/paris.jpg"), accessibilityLabel: "Paris city view", focalPoint: "center" },
  { destinationId: "id-bali", localImage: require("../../../assets/destinations/bali.jpg"), accessibilityLabel: "Bali landscape", focalPoint: "center" },
] as const;

export const destinationMediaById = new Map(DESTINATION_MEDIA.map((media) => [media.destinationId, media]));
export function destinationImage(destinationId: string) { return destinationMediaById.get(destinationId)?.localImage; }
export function assertDestinationMediaIsValid() {
  for (const media of DESTINATION_MEDIA) if (!destinationById.has(media.destinationId)) throw new Error(`Unknown media destination: ${media.destinationId}`);
}
