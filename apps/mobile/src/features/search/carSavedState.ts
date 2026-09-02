import type { CarResult } from "../../api/travelApi";
import { useCanonicalSaved } from "../../storage/useCanonicalSaved";

/** Account-backed canonical Car save state shared by iOS and Android. */
export function useSavedCar(result: CarResult, searchParams: Record<string, unknown>) {
  const savedState = useCanonicalSaved();
  return {
    saved: savedState.cars.has(result.id),
    toggle: () => savedState.toggleCar(result, searchParams),
  };
}
