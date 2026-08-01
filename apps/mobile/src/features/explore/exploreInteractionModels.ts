import type { Airport } from "../flow/airportData";

export type DestinationProduct = "flights" | "hotels";

export function navigateFromDestination(
  airport: Airport,
  product: DestinationProduct,
  close: () => void,
  navigate: (product: DestinationProduct, destination: string) => void,
  navigationLock?: { current: boolean },
) {
  if (navigationLock?.current) return false;
  if (navigationLock) navigationLock.current = true;
  const destination = airport.city;
  close();
  navigate(product, destination);
  return true;
}

export function selectFromBrowser(
  airport: Airport,
  closeBrowser: () => void,
  openActions: (airport: Airport) => void,
  afterClose: (open: () => void) => void = (open) => open(),
) {
  closeBrowser();
  afterClose(() => openActions(airport));
}
