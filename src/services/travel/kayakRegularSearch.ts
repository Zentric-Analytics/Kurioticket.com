import { z } from "zod";
import { flightSearchSchema } from "@/lib/validation";
import { adaptKayakFlightSearch, adaptKayakHotelSearch, adaptKayakCarSearch } from "./kayakSearchAdapter";
import type { KayakSearch, KayakVertical, SandboxPlace } from "./kayakSandbox";

export const regularKayakRequest = z.object({
  action: z.literal("regular-search"),
  vertical: z.enum(["flights", "hotels", "cars"]),
  criteria: z.record(z.string().max(80), z.string().max(250)).refine(value => Object.keys(value).length <= 35),
});
type Resolution = { supported: true; search: KayakSearch } | { supported: false; reason: string; choices?: SandboxPlace[] };
const airportCode = (value = "") => /^[A-Z]{3}$/.test(value) ? value : value.match(/\(([A-Z]{3})\)$/)?.[1] || value;

/** Additive sandbox provider: never change the query used by the existing providers. */
export async function resolveRegularKayakSearch(
  vertical: KayakVertical,
  criteria: Record<string, string>,
  places: (term: string) => Promise<SandboxPlace[]>,
): Promise<Resolution> {
  // Sandbox prices remain explicitly USD, not a fabricated currency conversion.
  const input = { ...criteria, currency: "USD" };
  if (vertical === "flights") {
    const parsed = flightSearchSchema.safeParse(input);
    return parsed.success ? adaptKayakFlightSearch(parsed.data) : { supported: false, reason: "KAYAK could not use these flight search details." };
  }
  if (vertical === "cars") {
    return adaptKayakCarSearch({ ...input, pickupLocation: airportCode(criteria.pickupLocation),
      dropoffLocation: airportCode(criteria.dropoffLocation || criteria.pickupLocation),
      pickupTime: criteria.pickupTime || "10:00", dropoffTime: criteria.dropoffTime || "10:00" });
  }
  if (/^kplace:\d+$/.test(criteria.destinationId || "")) return adaptKayakHotelSearch(input);
  const term = (criteria.destination || "").trim();
  if (term.length < 2 || term.length > 80) return { supported: false, reason: "Choose a hotel destination to search KAYAK." };
  // Validate dates/occupancy before spending an autocomplete request.
  const validation = adaptKayakHotelSearch({ ...input, destinationId: "kplace:1" });
  if (!validation.supported) return validation;
  const candidates = await places(term);
  const normalize = (value: string) => value.trim().toLocaleLowerCase("en-US").replace(/\s+/g, " ");
  const exact = candidates.filter(place => normalize(place.label) === normalize(term));
  const match = exact.length === 1 ? exact[0] : candidates.length === 1 ? candidates[0] : undefined;
  if (!match) return { supported: false,
    reason: candidates.length ? "Choose the matching KAYAK destination; other providers keep their original search." : "KAYAK has no matching test destination. Other providers are unaffected.",
    choices: candidates };
  return adaptKayakHotelSearch({ ...input, destinationId: match.value });
}
