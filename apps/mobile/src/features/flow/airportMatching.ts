import { airports, type Airport } from "./airportData";

export function findAirportByDestination(destination: string): Airport | undefined {
  const query = destination.trim().toLocaleLowerCase();
  if (!query) return undefined;

  return airports.find((airport) =>
    [airport.city, airport.country, airport.code].some(
      (value) => value.toLocaleLowerCase() === query,
    ),
  );
}
