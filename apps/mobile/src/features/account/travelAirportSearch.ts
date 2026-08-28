import { parseFlightPlaceSuggestions, searchFlightPlaces, type FlightPlaceSuggestion } from "../../api/locationSuggestions";

export type TravelAirportSuggestion = FlightPlaceSuggestion;
export const parseTravelAirportSuggestions = parseFlightPlaceSuggestions;

export async function searchTravelAirports(
  query: string,
  options: { signal?: AbortSignal; fetcher?: typeof fetch } = {},
): Promise<TravelAirportSuggestion[]> {
  return searchFlightPlaces(query, { ...options, context: "origin" });
}
