export const SAVED_FLIGHTS_INVALIDATED_EVENT = "kurioticket:saved-flights-invalidated";

let savedFlightsInvalidationRevision = 0;

export function getSavedFlightsInvalidationRevision() {
  return savedFlightsInvalidationRevision;
}

export function invalidateSavedFlightsClientCache() {
  savedFlightsInvalidationRevision += 1;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SAVED_FLIGHTS_INVALIDATED_EVENT));
  }
}
