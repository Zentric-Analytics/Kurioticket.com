import { z } from "zod";
import { flightSearchSchema } from "@/lib/validation";
import { adaptKayakFlightSearch, adaptKayakHotelSearch, adaptKayakCarSearch } from "./kayakSearchAdapter";
import type { KayakSearch, KayakVertical, SandboxPlace } from "./kayakSandbox";
import { searchLocationSchema, verifiedProviderValue } from "@/lib/locations/searchTarget";

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
    const parsed = flightSearchSchema.safeParse(input);
    return parsed.success ? adaptKayakFlightSearch(parsed.data) : { supported: false, reason: "KAYAK could not use these flight search details." };
  }
  if (vertical === "cars") {
    const pickupInput = criteria.pickupLocation || "";
    const dropoffInput = criteria.dropoffLocation || pickupInput;
    const pickupTarget = parseTarget(criteria.pickupLocationTarget);
    const dropoffTarget = parseTarget(criteria.dropoffLocationTarget);
    let pickup = pickupTarget?.success ? verifiedProviderValue(pickupTarget.data, "kayak") : undefined;
    let dropoff = dropoffTarget?.success ? verifiedProviderValue(dropoffTarget.data, "kayak") : undefined;
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
  const boundDestination = hotelTarget?.success ? verifiedProviderValue(hotelTarget.data, "kayak") : undefined;
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
