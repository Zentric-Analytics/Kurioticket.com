import type { ImageSourcePropType } from "react-native";
import { destinationById } from "./destinationCatalogue";

export type DestinationMedia = {
  destinationId: string;
  source: ImageSourcePropType;
  accessibilityLabel: string;
  focalPoint?: "center" | "top" | "bottom";
  provenance: "verified-local" | "generated-original" | "fallback";
};

/** Approved local assets for the featured Explore destinations. */
export const EXPLICIT_DESTINATION_MEDIA: readonly DestinationMedia[] = [
  { destinationId: "fr-paris", source: require("../../../assets/destinations/paris.jpg"), accessibilityLabel: "Paris skyline with the Eiffel Tower", focalPoint: "center", provenance: "generated-original" },
  { destinationId: "gb-london", source: require("../../../assets/destinations/london.jpg"), accessibilityLabel: "London skyline beside the River Thames", focalPoint: "center", provenance: "generated-original" },
  { destinationId: "us-new-york", source: require("../../../assets/destinations/new-york.jpg"), accessibilityLabel: "New York City skyline and bridge", focalPoint: "center", provenance: "generated-original" },
  { destinationId: "id-bali", source: require("../../../assets/destinations/bali.jpg"), accessibilityLabel: "Bali tropical coastline and temple", focalPoint: "center", provenance: "generated-original" },
  { destinationId: "ng-lagos", source: require("../../../assets/destinations/lagos.jpg"), accessibilityLabel: "Lagos waterfront skyline", focalPoint: "center", provenance: "generated-original" },
  { destinationId: "ae-dubai", source: require("../../../assets/destinations/dubai.jpg"), accessibilityLabel: "Dubai skyline and marina", focalPoint: "center", provenance: "generated-original" },
  { destinationId: "jp-tokyo", source: require("../../../assets/destinations/tokyo.jpg"), accessibilityLabel: "Tokyo skyline and landmarks", focalPoint: "center", provenance: "generated-original" },
  { destinationId: "za-cape-town", source: require("../../../assets/destinations/cape-town.jpg"), accessibilityLabel: "Cape Town waterfront and Table Mountain", focalPoint: "center", provenance: "generated-original" },
  { destinationId: "it-rome", source: require("../../../assets/destinations/rome.jpg"), accessibilityLabel: "The Colosseum in Rome", focalPoint: "center", provenance: "generated-original" },
  { destinationId: "tr-istanbul", source: require("../../../assets/destinations/istanbul.jpg"), accessibilityLabel: "Istanbul skyline beside the Bosphorus", focalPoint: "center", provenance: "generated-original" },
  { destinationId: "th-bangkok", source: require("../../../assets/destinations/bangkok.jpg"), accessibilityLabel: "Bangkok riverside temple at sunset", focalPoint: "center", provenance: "generated-original" },
  { destinationId: "es-barcelona", source: require("../../../assets/destinations/barcelona.jpg"), accessibilityLabel: "Barcelona cityscape and Sagrada Familia", focalPoint: "center", provenance: "generated-original" },
  { destinationId: "eg-cairo", source: require("../../../assets/destinations/cairo.jpg"), accessibilityLabel: "Cairo cityscape and pyramids", focalPoint: "center", provenance: "generated-original" },
  { destinationId: "ma-marrakesh", source: require("../../../assets/destinations/marrakesh.jpg"), accessibilityLabel: "Marrakesh medina and Atlas Mountains", focalPoint: "center", provenance: "generated-original" },
  { destinationId: "sg-singapore", source: require("../../../assets/destinations/singapore.jpg"), accessibilityLabel: "Singapore Marina Bay skyline", focalPoint: "center", provenance: "generated-original" },
  { destinationId: "nl-amsterdam", source: require("../../../assets/destinations/amsterdam.jpg"), accessibilityLabel: "Amsterdam canal and historic houses", focalPoint: "center", provenance: "generated-original" },
  { destinationId: "ca-toronto", source: require("../../../assets/destinations/toronto.jpg"), accessibilityLabel: "Toronto waterfront skyline and CN Tower", focalPoint: "center", provenance: "generated-original" },
  { destinationId: "us-los-angeles", source: require("../../../assets/destinations/los-angeles.jpg"), accessibilityLabel: "Los Angeles skyline and palm trees", focalPoint: "center", provenance: "generated-original" },
  { destinationId: "ng-abuja", source: require("../../../assets/destinations/abuja.jpg"), accessibilityLabel: "Abuja cityscape and surrounding hills", focalPoint: "center", provenance: "generated-original" },
  { destinationId: "gh-accra", source: require("../../../assets/destinations/accra.jpg"), accessibilityLabel: "Accra coastline and city skyline", focalPoint: "center", provenance: "generated-original" },
  { destinationId: "za-johannesburg", source: require("../../../assets/destinations/johannesburg.jpg"), accessibilityLabel: "Johannesburg skyline and bridge", focalPoint: "center", provenance: "generated-original" },
  { destinationId: "ke-nairobi", source: require("../../../assets/destinations/nairobi.jpg"), accessibilityLabel: "Nairobi skyline beside a green city park", focalPoint: "center", provenance: "generated-original" },
  { destinationId: "pt-lisbon", source: require("../../../assets/destinations/lisbon.jpg"), accessibilityLabel: "Lisbon tram and hillside cityscape", focalPoint: "center", provenance: "generated-original" },
  { destinationId: "au-sydney", source: require("../../../assets/destinations/sydney.jpg"), accessibilityLabel: "Sydney Opera House and Harbour Bridge", focalPoint: "center", provenance: "generated-original" },
  { destinationId: "br-rio-de-janeiro", source: require("../../../assets/destinations/rio-de-janeiro.jpg"), accessibilityLabel: "Rio de Janeiro coastline and mountains", focalPoint: "center", provenance: "generated-original" },
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
