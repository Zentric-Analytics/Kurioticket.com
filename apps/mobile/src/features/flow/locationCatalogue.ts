import { airports, type Airport } from "./airportData";
import { destinationById, destinations, type Destination } from "../explore/destinationCatalogue";
import { destinationImage } from "../explore/destinationMedia";

export type LocationPresentation = { destination: Destination; airport: Airport; image?: number };
export const CURATED_POPULAR_DESTINATION_IDS = [
  "fr-paris",
  "gb-london",
  "us-new-york",
  "id-bali",
  "ng-lagos",
  "ae-dubai",
  "jp-tokyo",
  "za-cape-town",
  "it-rome",
  "tr-istanbul",
  "th-bangkok",
  "es-barcelona",
  "eg-cairo",
  "ma-marrakesh",
  "sg-singapore",
  "nl-amsterdam",
  "ca-toronto",
  "us-los-angeles",
  "ng-abuja",
  "gh-accra",
  "za-johannesburg",
  "ke-nairobi",
  "pt-lisbon",
  "au-sydney",
  "br-rio-de-janeiro",
] as const;

function locationById(id: string): LocationPresentation {
  const destination = destinationById.get(id);
  if (!destination) throw new Error(`Missing curated popular destination: ${id}`);
  const airport = airports.find((item) => item.code === destination.primaryAirportCode);
  if (!airport) throw new Error(`Missing primary airport for: ${id}`);
  return { destination, airport, image: destinationImage(id) as number | undefined };
}

export const curatedPopularLocations = CURATED_POPULAR_DESTINATION_IDS.map(locationById);
export const locationImages = Object.fromEntries(destinations.flatMap((destination) => {
  const image = destinationImage(destination.id) as number | undefined;
  return image ? destination.airportCodes.map((code) => [code, image]) : [];
}));

export function locationImageByCity(city: string): number | undefined {
  return destinationImage(destinations.find((item) => item.name === city)?.id ?? "") as number | undefined;
}
