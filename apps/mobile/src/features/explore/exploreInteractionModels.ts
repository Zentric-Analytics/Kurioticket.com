import type { Destination } from "./destinationCatalogue";
export type DestinationProduct = "flights" | "hotels";
export type DestinationHandoff = { destinationId: string; primaryAirportCode: string; airportCodes: readonly string[] };
type DestinationHandoffInput = Pick<Destination, "id" | "name" | "primaryAirportCode" | "airportCodes">;
export function destinationHandoff(destination: DestinationHandoffInput): DestinationHandoff {
  return { destinationId: destination.id, primaryAirportCode: destination.primaryAirportCode, airportCodes: destination.airportCodes };
}
export function destinationDetailsRoute(destinationId: string) {
  return { pathname: "/explore/destination/[id]" as const, params: { id: destinationId } };
}
export function navigateFromDestination(destination: Destination, product: DestinationProduct, close: () => void, navigate: (product: DestinationProduct, destination: string, handoff: DestinationHandoff) => void, navigationLock?: { current: boolean }) {
  if (navigationLock?.current) return false;
  if (navigationLock) navigationLock.current = true;
  close(); navigate(product, destination.name, destinationHandoff(destination)); return true;
}
export function selectFromBrowser(destination: Destination, closeBrowser: () => void, openActions: (destination: Destination) => void, afterClose: (open: () => void) => void = (open) => open()) { closeBrowser(); afterClose(() => openActions(destination)); }
