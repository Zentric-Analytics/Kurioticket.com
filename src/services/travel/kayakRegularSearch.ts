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
  const normalizedInput = normalizePlace(criteria.destination || "");
  const textMatches = hotelDestinations.filter(candidate => {
    const names = [candidate.name, candidate.searchValue, ...(candidate.aliases || [])]
      .map(normalizePlace);
    return names.includes(normalizedInput);
  });
  const destination = hotelDestinations.find(candidate => candidate.id === criteria.destinationId)
    || (textMatches.length === 1 ? textMatches[0] : undefined);
  if (!destination) return undefined;
  const name = normalizePlace(destination.name.replace(/\s+Airport area$/i, ""));
  const region = normalizePlace(destination.region || "");
  const country = normalizePlace(destination.country);
  const countryCode = normalizePlace(destination.countryCode);
  const ranked = candidates.flatMap(candidate => {
    const label = normalizePlace(candidate.label);
    const firstPart = normalizePlace(candidate.label.split(",")[0]);
    const aliases = (destination.aliases || []).map(normalizePlace);
    const nameMatch = firstPart === name || aliases.includes(firstPart)
      || (destination.kind === "airport-area" && label.includes(name));
    if (!nameMatch) return [];
    const words = ` ${label} `;
    let score = 100;
    if (region && words.includes(` ${region} `)) score += 30;
    if (country && words.includes(` ${country} `)) score += 40;
    if (countryCode && words.includes(` ${countryCode} `)) score += 20;
    const kind = normalizePlace(candidate.kind || "");
    if (destination.kind === "city") score += kind === "city" ? 50 : kind.includes("airport") ? -30 : 0;
    if (destination.kind === "airport-area") score += kind.includes("airport") ? 50 : 0;
    return [{ candidate, score, length: label.length }];
  }).sort((a, b) => b.score - a.score || a.length - b.length);
  if (!ranked.length) return undefined;
  if (ranked.length > 1 && ranked[0].score === ranked[1].score && ranked[0].length === ranked[1].length) return undefined;
  return ranked[0].candidate;
}

/** Additive sandbox provider: never change the query used by the existing providers. */
export async function resolveRegularKayakSearch(
  vertical: KayakVertical,
  criteria: Record<string, string>,
  places: (term: string, vertical?: KayakVertical) => Promise<SandboxPlace[]>,
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
    let pickup = airportCode(pickupInput);
    let dropoff = airportCode(dropoffInput);
    if (!/^[A-Z]{3}$/.test(pickup)) {
      const candidates = await places(pickupInput, "cars");
      pickup = candidates[0]?.value || pickup;
    }
    if (dropoffInput === pickupInput) dropoff = pickup;
    else if (!/^[A-Z]{3}$/.test(dropoff)) {
      const candidates = await places(dropoffInput, "cars");
      dropoff = candidates[0]?.value || dropoff;
    }
    return adaptKayakCarSearch({ ...input, pickupLocation: pickup,
      dropoffLocation: dropoff,
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
