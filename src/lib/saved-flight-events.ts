export const SAVED_FLIGHTS_INVALIDATED_EVENT = "kurioticket:saved-flights-invalidated";

export function invalidateSavedFlightsClientCache() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SAVED_FLIGHTS_INVALIDATED_EVENT));
  }
}
