import { z } from "zod";
import { flightSearchSchema } from "@/lib/validation";
import { adaptKayakFlightSearch, adaptKayakHotelSearch, adaptKayakCarSearch } from "./kayakSearchAdapter";
import type { KayakSearch, KayakVertical, SandboxPlace } from "./kayakSandbox";
import { hotelDestinations } from "@/data/hotelDestinations";

export const regularKayakRequest = z.object({
  action: z.literal("regular-search"),
  vertical: z.enum(["flights", "hotels", "cars"]),
  criteria: z.record(z.string().max(80), z.string().max(250)).refine(value => Object.keys(value).length <= 35),
});
type Resolution = { supported: true; search: KayakSearch } | { supported: false; reason: string; choices?: SandboxPlace[] };
const airportCode = (value = "") => /^[A-Z]{3}$/.test(value) ? value : value.match(/\(([A-Z]{3})\)$/)?.[1] || value;
const normalizePlace = (value: string) => value.trim().toLocaleLowerCase("en-US")
  .normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

function canonicalHotelMatch(criteria: Record<string, string>, candidates: SandboxPlace[]) {
  const destination = hotelDestinations.find(candidate => candidate.id === criteria.destinationId);
  if (!destination) return undefined;
  const expected = normalizePlace([destination.name, destination.region, destination.country].filter(Boolean).join(" "));
  return candidates.filter(candidate => {
    const label = normalizePlace(candidate.label);
    return label === expected || label.startsWith(`${expected} `);
  }).sort((a, b) => normalizePlace(a.label).length - normalizePlace(b.label).length)[0];
}

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
  const exact = candidates.filter(place => normalizePlace(place.label) === normalizePlace(term));
  const match = canonicalHotelMatch(criteria, candidates)
    || (exact.length === 1 ? exact[0] : candidates.length === 1 ? candidates[0] : undefined);
  if (!match) return { supported: false,
    reason: "KAYAK has no unambiguous matching test destination. Other providers are unaffected." };
  return adaptKayakHotelSearch({ ...input, destinationId: match.value });
}
