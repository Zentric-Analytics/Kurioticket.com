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
const authoredMissingSpecLabels = new Set([
  "Passengers not supplied",
  "Baggage capacity not supplied",
  "Doors not supplied",
  "Transmission not supplied",
  "Specifications not supplied",
]);
const providerSpec = (value: string | undefined) => {
  const trimmed = value?.trim() || "";
  return authoredMissingSpecLabels.has(trimmed) ? "" : trimmed;
};

/**
 * KAYAK sandbox specs are normalized by kayakSandbox.ts in this fixed order:
 * passengers, bags, doors, transmission. Use only provider-owned values in the
 * native UI; authored missing-data labels are treated as absent presentation.
 */
export function nativeCarPrimarySpecLabels(result: CarResult): NativeCarPrimarySpecLabels {
  if (isKayakSandboxCar(result)) {
    const specs = result.sandboxPresentation?.specs ?? [];
    return {
      passengers: providerSpec(specs[0]),
      bags: providerSpec(specs[1]),
      doors: providerSpec(specs[2]),
      transmission: providerSpec(specs[3]),
    };
  }
  return {
    passengers: `${result.passengers} passengers`,
    bags: `${result.bags} bags`,
    doors: `${result.doors} doors`,
    transmission: capitalize(result.transmission),
  };
}
