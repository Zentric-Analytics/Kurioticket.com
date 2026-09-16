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

/**
 * KAYAK sandbox specs are normalized by kayakSandbox.ts in this fixed order:
 * passengers, bags, doors, transmission. Use those provider-owned labels instead
 * of the legacy required canonical defaults used to keep the shared car schema portable.
 */
export function nativeCarPrimarySpecLabels(result: CarResult): NativeCarPrimarySpecLabels {
  if (isKayakSandboxCar(result)) {
    const specs = result.sandboxPresentation?.specs ?? [];
    return {
      passengers: specs[0] || "Passengers not supplied",
      bags: specs[1] || "Baggage capacity not supplied",
      doors: specs[2] || "Doors not supplied",
      transmission: specs[3] || "Transmission not supplied",
    };
  }
  return {
    passengers: `${result.passengers} passengers`,
    bags: `${result.bags} bags`,
    doors: `${result.doors} doors`,
    transmission: capitalize(result.transmission),
  };
}
