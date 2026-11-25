import type { NormalizedHotelResult } from "@/lib/types";

/** Sandbox offers are provider supplied, but are not live bookable inventory.
 * Historical catalogue records must not return through persisted caches. */
export function isProviderHotelResult(result: Pick<NormalizedHotelResult, "id" | "provider" | "dataSource" | "inventoryProvenance">): boolean {
  if (/^Kurioticket (?:catalogue|static catalogue|verified destination coverage)$/i.test(result.provider)) return false;
  return Boolean(result.inventoryProvenance?.providerId) || result.dataSource === "live" ||
    (result.provider === "KAYAK sandbox" && result.id.startsWith("kayak-sandbox:"));
}
