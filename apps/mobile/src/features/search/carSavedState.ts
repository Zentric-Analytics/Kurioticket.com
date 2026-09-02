import type { CarResult } from "../../api/travelApi";
import { useCanonicalSaved } from "../../storage/useCanonicalSaved";
import { carSavedSignature } from "../../storage/savedMapping";

/** Account-backed canonical Car save state shared by iOS and Android. */
export function useSavedCar(result: CarResult, searchParams: Record<string, unknown>) {
  const savedState = useCanonicalSaved();
  const signature = carSavedSignature(result, searchParams);
  return {
    saved: signature ? savedState.cars.has(signature) : false,
    toggle: () => savedState.toggleCar(result, searchParams),
  };
}
