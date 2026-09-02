export const SAVED_CARS_INVALIDATED_EVENT = "kurioticket:saved-cars-invalidated";

export function invalidateSavedCarsClientCache() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(SAVED_CARS_INVALIDATED_EVENT));
}
