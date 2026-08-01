import { airports, type Airport } from "./airportData";
import { destinationById, destinations, type Destination } from "../explore/destinationCatalogue";
import { destinationImage } from "../explore/destinationMedia";

export type LocationPresentation = { destination: Destination; airport: Airport; image?: number };
const FEATURED_DESTINATION_IDS = ["fr-paris", "id-bali", "gb-london", "us-new-york"] as const;

function locationById(id: string): LocationPresentation {
  const destination = destinationById.get(id);
  if (!destination) throw new Error(`Missing featured destination: ${id}`);
  const airport = airports.find((item) => item.code === destination.primaryAirportCode);
  if (!airport) throw new Error(`Missing primary airport for: ${id}`);
  return { destination, airport, image: destinationImage(id) as number | undefined };
}

export const featuredLocations = FEATURED_DESTINATION_IDS.map(locationById);
export const locationImages = Object.fromEntries(destinations.flatMap((destination) => {
  const image = destinationImage(destination.id) as number | undefined;
  return image ? destination.airportCodes.map((code) => [code, image]) : [];
}));

export function locationImageByCity(city: string): number | undefined {
  return destinationImage(destinations.find((item) => item.name === city)?.id ?? "") as number | undefined;
}
