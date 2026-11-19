import { normalizeAirportSearchText } from "../../../../../src/shared/airports";
import { nativeCarTrustedPickupCoordinates, type NativeCarTrustedPickupCoordinates } from "./nativeCarDetailsModel";

// Reviewed city references provide map context only. They do not identify a
// rental desk, meet-and-greet collection point, or airport.
const trustedCityMapReferences: Readonly<Record<string, NativeCarTrustedPickupCoordinates>> = {
  "paris, france": { latitude: 48.85341, longitude: 2.3488 },
};

export function nativeCarTrustedMapCoordinates(location: string): NativeCarTrustedPickupCoordinates | null {
  const exactPickup = nativeCarTrustedPickupCoordinates(location);
  if (exactPickup) return exactPickup;

  const identity = normalizeAirportSearchText(location);
  return trustedCityMapReferences[identity] ?? null;
}
