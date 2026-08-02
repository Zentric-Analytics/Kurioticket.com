import {
  AIRPORT_RESULT_LIMIT,
  airports as sharedAirports,
  searchAirports as searchSharedAirports,
  type AirportOption,
} from "../../../../../src/shared/airports";

/** Native-safe view of the repository's platform-neutral airport record. */
export type Airport = AirportOption & Required<Pick<AirportOption,
  "country" | "countryCode" | "latitude" | "longitude" | "priority"
>>;

// Every shared seed supplies these fields; the narrower type keeps existing
// mobile form code honest without copying or transforming the catalogue.
export const airports = sharedAirports as readonly Airport[];
export const AIRPORT_SEARCH_RESULT_LIMIT = AIRPORT_RESULT_LIMIT;
export const searchAirports = (query: string, limit = AIRPORT_SEARCH_RESULT_LIMIT): Airport[] =>
  searchSharedAirports(query, limit) as Airport[];
