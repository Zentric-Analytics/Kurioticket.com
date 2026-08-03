import { airports, type Airport } from "./airportData";
import { destinationById, destinations, type Destination } from "../explore/destinationCatalogue";
import { destinationImage } from "../explore/destinationMedia";
import { CURATED_POPULAR_EXPLORE_DESTINATION_IDS } from "../../../../../src/shared/destinations/exploreDestinationContent";

export type LocationPresentation = { destination: Destination; airport: Airport; image?: number };
export const CURATED_POPULAR_DESTINATION_IDS =
  CURATED_POPULAR_EXPLORE_DESTINATION_IDS;

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
