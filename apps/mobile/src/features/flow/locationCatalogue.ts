import { airports, type Airport } from "./airportData";

export type LocationPresentation = { airport: Airport; image?: number };

const imagesByAirportCode: Partial<Record<Airport["code"], number>> = {
  JFK: require("../../../assets/destinations/new-york.jpg"),
  LHR: require("../../../assets/destinations/london.jpg"),
  CDG: require("../../../assets/destinations/paris.jpg"),
  JTR: require("../../../assets/heroes/home-santorini.png"),
};

export function locationByCity(city: Airport["city"]): LocationPresentation {
  const airport = airports.find((item) => item.city === city);
  if (!airport) throw new Error(`Unknown catalogue city: ${city}`);
  return { airport, image: imagesByAirportCode[airport.code] };
}

export const featuredLocations = (["Paris", "Bali", "Santorini", "New York"] as const).map(locationByCity);
export const locationImages = imagesByAirportCode;

export function locationImageByCity(city: string): number | undefined {
  const airport = airports.find((item) => item.city === city);
  return airport ? imagesByAirportCode[airport.code] : undefined;
}
