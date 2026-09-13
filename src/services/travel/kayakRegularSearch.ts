import { z } from "zod";
import { flightSearchSchema } from "@/lib/validation";
import { adaptKayakFlightSearch, adaptKayakHotelSearch, adaptKayakCarSearch } from "./kayakSearchAdapter";
import type { KayakSearch, KayakVertical, SandboxPlace } from "./kayakSandbox";
import { searchLocationSchema } from "@/lib/locations/searchTarget";
import { resolveProviderSelection } from "@/lib/locations/selectionAuthority";

export const regularKayakRequest = z.object({
  action: z.literal("regular-search"),
  vertical: z.enum(["flights", "hotels", "cars"]),
  criteria: z.record(z.string().max(80), z.string().max(250)).refine(value => Object.keys(value).length <= 35),
});
type Resolution = { supported: true; search: KayakSearch } | { supported: false; reason: string; choices?: SandboxPlace[] };
const airportCode = (value = "") => /^[A-Z]{3}$/.test(value) ? value : value.match(/\(([A-Z]{3})\)$/)?.[1] || value;
const parseTarget = (value?: string) => {
  if (!value) return undefined;
  try { return searchLocationSchema.safeParse(JSON.parse(value)); } catch { return undefined; }
};

/** Additive sandbox provider: never change the query used by the existing providers. */
export async function resolveRegularKayakSearch(
  vertical: KayakVertical,
  criteria: Record<string, string>,
  _places: (term: string, vertical?: KayakVertical) => Promise<SandboxPlace[]>,
): Promise<Resolution> {
  // Sandbox prices remain explicitly USD, not a fabricated currency conversion.
  const input = { ...criteria, currency: "USD" };
  if (vertical === "flights") {
    const originTarget = parseTarget(criteria.originLocation);
    const destinationTarget = parseTarget(criteria.destinationLocation);
    const parsed = flightSearchSchema.safeParse({ ...input,
      originLocation: originTarget?.success ? originTarget.data : undefined,
      destinationLocation: destinationTarget?.success ? destinationTarget.data : undefined });
    return parsed.success ? adaptKayakFlightSearch(parsed.data) : { supported: false, reason: "KAYAK could not use these flight search details." };
  }
  if (vertical === "cars") {
    const pickupInput = criteria.pickupLocation || "";
    const dropoffInput = criteria.dropoffLocation || pickupInput;
    const pickupTarget = parseTarget(criteria.pickupLocationTarget);
    const dropoffTarget = parseTarget(criteria.dropoffLocationTarget);
    let pickup = pickupTarget?.success ? (() => { const value = resolveProviderSelection(pickupTarget.data, "cars", "kayak"); return value.ok ? value.value : undefined; })() : undefined;
    let dropoff = dropoffTarget?.success ? (() => { const value = resolveProviderSelection(dropoffTarget.data, "cars", "kayak"); return value.ok ? value.value : undefined; })() : undefined;
    // IATA codes are an exact, provider-supported public namespace. Free text is not.
    pickup ||= /^[A-Z]{3}$/.test(airportCode(pickupInput)) ? airportCode(pickupInput) : undefined;
    if (!pickup) return { supported: false, reason: "KAYAK does not support the selected pickup location. Other providers are unaffected." };
    if (dropoffInput === pickupInput) dropoff = pickup;
    else dropoff ||= /^[A-Z]{3}$/.test(airportCode(dropoffInput)) ? airportCode(dropoffInput) : undefined;
    if (!dropoff) return { supported: false, reason: "KAYAK does not support the selected drop-off location. Other providers are unaffected." };
    return adaptKayakCarSearch({ ...input, pickupLocation: pickup,
      dropoffLocation: dropoff,
      pickupTime: criteria.pickupTime || "10:00", dropoffTime: criteria.dropoffTime || "10:00" });
  }
  const hotelTarget = parseTarget(criteria.destinationLocation);
  const boundDestination = hotelTarget?.success ? (() => { const value = resolveProviderSelection(hotelTarget.data, "hotels", "kayak"); return value.ok ? value.value : undefined; })() : undefined;
  if (boundDestination) return adaptKayakHotelSearch({ ...input, destinationId: boundDestination });
  if (/^kplace:\d+$/.test(criteria.destinationId || "")) return adaptKayakHotelSearch(input);
  const term = (criteria.destination || "").trim();
  if (term.length < 2 || term.length > 80) return { supported: false, reason: "Choose a hotel destination to search KAYAK." };
  // Validate dates/occupancy before spending an autocomplete request.
  const validation = adaptKayakHotelSearch({ ...input, destinationId: "kplace:1" });
  if (!validation.supported) return validation;
  return { supported: false,
    reason: "KAYAK has no verified binding for this destination. Choose a provider-backed suggestion; other providers are unaffected." };
}
