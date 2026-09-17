import type { CarResult } from "../../api/travelApi";

export type NativeCarPrimarySpecLabels = {
  passengers: string;
  transmission: string;
  doors: string;
  bags: string;
};

export const isKayakSandboxCar = (result: CarResult) =>
  result.searchPolicy.source === "kayak-sandbox" || result.inventorySource === "kayak-sandbox";

const capitalize = (value: string) => `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
const supplied = (value: string | undefined) => value?.trim() || "";

/**
 * KAYAK sandbox specs are normalized by kayakSandbox.ts in this fixed order:
 * passengers, bags, doors, transmission. Use only those provider-owned labels.
 * If the provider omitted a value, leave that slot empty so callers can omit it
 * instead of rendering Kurioticket-authored fallback claims.
 */
export function nativeCarPrimarySpecLabels(result: CarResult): NativeCarPrimarySpecLabels {
  if (isKayakSandboxCar(result)) {
    const specs = result.sandboxPresentation?.specs ?? [];
    return {
      passengers: supplied(specs[0]),
      bags: supplied(specs[1]),
      doors: supplied(specs[2]),
      transmission: supplied(specs[3]),
    };
  }
  return {
    passengers: `${result.passengers} passengers`,
    bags: `${result.bags} bags`,
    doors: `${result.doors} doors`,
    transmission: capitalize(result.transmission),
  };
}
