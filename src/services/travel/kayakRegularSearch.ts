import { z } from "zod";
import { flightSearchSchema } from "@/lib/validation";
import { adaptKayakFlightSearch, adaptKayakHotelSearch, adaptKayakCarSearch } from "./kayakSearchAdapter";
import type { KayakSearch, KayakVertical, SandboxPlace } from "./kayakSandbox";
import { searchLocationSchema } from "@/lib/locations/searchTarget";
import { resolveProviderSelection } from "@/lib/locations/selectionAuthority";
import { hotelDestinations } from "@/data/hotelDestinations";
import { timezones as airportTimeZones } from "./airportTimeZones";
import {
  getRentalLocationClock,
  pickupHasPassedAtClock,
} from "@/shared/cars/rentalLocationClock";

export const regularKayakRequest = z.object({
  action: z.literal("regular-search"),
  vertical: z.enum(["flights", "hotels", "cars"]),
  criteria: z.record(z.string().max(80), z.string().max(250)).refine(value => Object.keys(value).length <= 35),
});
type Resolution =
  | { supported: true; search: KayakSearch }
  | {
      supported: false;
      reason: string;
      choices?: SandboxPlace[];
      reasonCode?: "pickup_time_past" | "unsupported_search";
    };
type ResolveRegularKayakSearchOptions = { now?: Date };
const airportCode = (value = "") => /^[A-Z]{3}$/.test(value) ? value : value.match(/\(([A-Z]{3})\)$/)?.[1] || value;
const parseTarget = (value?: string) => {
  if (!value) return undefined;
  try { return searchLocationSchema.safeParse(JSON.parse(value)); } catch { return undefined; }
};
const normalizePlace = (value: string) => value.trim().toLocaleLowerCase("en-US")
  .normalize("NFKD").replace(/\p{M}/gu, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();

/**
 * A Kurioticket label is only a user-facing canonical location.  This function
 * selects a matching identifier returned by the provider; it never invents an
 * identifier or treats the catalogue label as one.
 */
function providerPlaceMatch(
  term: string,
  candidates: SandboxPlace[],
  { preferExactName = false }: { preferExactName?: boolean } = {},
) {
  const normalizedInput = normalizePlace(term);
  const requestedName = normalizePlace(term.split(",")[0] || term);
  const catalogue = hotelDestinations.find(destination => {
    const names = [destination.name, destination.searchValue, ...(destination.aliases || [])]
      .map(normalizePlace);
    const catalogueName = normalizePlace(destination.name);
    return names.includes(normalizedInput)
      || ((preferExactName ? requestedName === catalogueName : normalizedInput.startsWith(`${catalogueName} `))
        && normalizedInput.includes(normalizePlace(destination.country)));
  });
  const expectedName = normalizePlace(catalogue?.name || term.split(",")[0] || term);
  const expectedKind = catalogue?.kind === "airport-area" ? "airport" : catalogue?.kind;
  const parts = term.split(",").map(part => part.trim()).filter(Boolean);
  const expectedCountry = normalizePlace(catalogue?.country || (parts.length > 1 ? parts.at(-1)! : ""));
  const expectedRegion = normalizePlace(catalogue?.region || "");
  if (!expectedName || (!catalogue && !term.includes(","))) return undefined;

  const ranked = candidates.flatMap(candidate => {
    const label = normalizePlace(candidate.label);
    const firstPart = normalizePlace(candidate.label.split(",")[0] || "");
    if (firstPart !== expectedName && !label.startsWith(`${expectedName} `)) return [];
    const kind = normalizePlace(candidate.kind || "");
    if (expectedKind === "city" && !kind.includes("city")) return [];
    if (expectedKind === "airport" && !kind.includes("airport")) return [];
    if (expectedKind === "district" && !kind.includes("district")) return [];
    if (expectedKind === "landmark" && !kind.includes("landmark")) return [];
    let score = 100;
    const words = ` ${label} `;
    // A provider reporting a different country cannot win by name or short-label ranking.
    if (expectedCountry && candidate.label.includes(",") && !words.includes(` ${expectedCountry} `)) return [];
    if (expectedCountry && words.includes(` ${expectedCountry} `)) score += 40;
    if (expectedRegion && words.includes(` ${expectedRegion} `)) score += 30;
    if (catalogue?.kind === "city") score += kind === "city" ? 50 : kind.includes("airport") ? 15 : 0;
    if (catalogue?.kind === "airport-area") score += kind.includes("airport") ? 50 : 0;
    return [{ candidate, score, length: label.length, name: firstPart }];
  }).sort((left, right) => right.score - left.score || left.length - right.length);
  // Prefer the submitted city before a broader catalogue alias. Canonical aliases
  // such as NYC still work when no provider city uses the submitted name.
  const requestedMatches = preferExactName ? ranked.filter(match => match.name === requestedName) : [];
  const exactMatches = requestedMatches.length ? requestedMatches
    : preferExactName ? ranked.filter(match => match.name === expectedName) : [];
  const matches = exactMatches.length ? exactMatches : ranked;
  if (!matches.length) return undefined;
  if (matches.length > 1 && matches[0].score === matches[1].score && matches[0].candidate.value !== matches[1].candidate.value) return undefined;
  return matches[0].candidate;
}

/** Additive sandbox provider: never change the query used by the existing providers. */
export async function resolveRegularKayakSearch(
  vertical: KayakVertical,
  criteria: Record<string, string>,
  places: (term: string, vertical?: KayakVertical) => Promise<SandboxPlace[]>,
  options: ResolveRegularKayakSearchOptions = {},
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
    const pickupTargetValue = criteria.pickupLocationTarget?.trim();
    const dropoffTargetValue = criteria.dropoffLocationTarget?.trim();
    const pickupTarget = parseTarget(criteria.pickupLocationTarget);
    const dropoffTarget = parseTarget(criteria.dropoffLocationTarget);
    let pickup: string | undefined;
    let dropoff: string | undefined;
    if (pickupTargetValue) {
      if (!pickupTarget?.success) return { supported: false, reason: "The selected pick-up location could not be verified. Choose a location from the suggestions again." };
      const resolution = resolveProviderSelection(pickupTarget.data, "cars", "kayak");
      if (!resolution.ok) return { supported: false, reason: "KAYAK has no verified car-search match for the selected pick-up location. Choose a supported suggestion or another provider." };
      pickup = resolution.value;
    }
    if (dropoffTargetValue) {
      if (!dropoffTarget?.success) return { supported: false, reason: "The selected drop-off location could not be verified. Choose a location from the suggestions again." };
      const resolution = resolveProviderSelection(dropoffTarget.data, "cars", "kayak");
      if (!resolution.ok) return { supported: false, reason: "KAYAK has no verified car-search match for the selected drop-off location. Choose a supported suggestion or another provider." };
      dropoff = resolution.value;
    }
    // IATA codes are an exact, provider-supported public namespace. Free text is not.
    pickup ||= /^[A-Z]{3}$/.test(airportCode(pickupInput)) ? airportCode(pickupInput) : undefined;
    if (!pickup) pickup = providerPlaceMatch(pickupInput, await places(pickupInput, "cars"))?.value;
    if (!pickup) return { supported: false, reason: "KAYAK does not support the selected pickup location. Other providers are unaffected." };
    if (dropoffInput === pickupInput) dropoff = pickup;
    else dropoff ||= /^[A-Z]{3}$/.test(airportCode(dropoffInput)) ? airportCode(dropoffInput) : undefined;
    if (!dropoff) dropoff = providerPlaceMatch(dropoffInput, await places(dropoffInput, "cars"))?.value;
    if (!dropoff) return { supported: false, reason: "KAYAK does not support the selected drop-off location. Other providers are unaffected." };

    const pickupTime = criteria.pickupTime || "10:00";
    const rentalClock = getRentalLocationClock(
      options.now ?? new Date(),
      airportTimeZones[pickup],
    );
    if (
      rentalClock &&
      /^\d{4}-\d{2}-\d{2}$/.test(criteria.pickupDate || "") &&
      /^([01]\d|2[0-3]):[0-5]\d$/.test(pickupTime) &&
      pickupHasPassedAtClock(criteria.pickupDate, pickupTime, rentalClock)
    ) {
      return {
        supported: false,
        reason:
          "The selected pick-up time has already passed at the rental location. Choose a later pick-up time or date.",
        reasonCode: "pickup_time_past",
      };
    }

    return adaptKayakCarSearch({ ...input, pickupLocation: pickup,
      dropoffLocation: dropoff,
      pickupTime, dropoffTime: criteria.dropoffTime || "10:00" });
  }
  const hotelTarget = parseTarget(criteria.destinationLocation);
  if (criteria.destinationLocation?.trim() && !hotelTarget?.success) {
    return { supported: false, reason: "The selected hotel destination could not be verified. Choose a destination from the suggestions again." };
  }
  const boundDestination = hotelTarget?.success ? (() => { const value = resolveProviderSelection(hotelTarget.data, "hotels", "kayak"); return value.ok ? value.value : undefined; })() : undefined;
  if (hotelTarget?.success && !boundDestination) {
    return { supported: false, reason: "KAYAK has no verified hotel-search match for the selected destination. Choose a supported suggestion or another provider." };
  }
  if (boundDestination) return adaptKayakHotelSearch({ ...input, destinationId: boundDestination });
  if (/^kplace:\d+$/.test(criteria.destinationId || "")) return adaptKayakHotelSearch(input);
  const term = (criteria.destination || "").trim();
  if (term.length < 2 || term.length > 80) return { supported: false, reason: "Choose a hotel destination to search KAYAK." };
  // Validate dates/occupancy before spending an autocomplete request.
  const validation = adaptKayakHotelSearch({ ...input, destinationId: "kplace:1" });
  if (!validation.supported) return validation;
  const match = providerPlaceMatch(term, await places(term, "hotels"), { preferExactName: true });
  if (!match) return { supported: false,
    reason: "KAYAK has no verified binding for this destination. Other providers are unaffected." };
  return adaptKayakHotelSearch({ ...input, destinationId: match.value });
}
