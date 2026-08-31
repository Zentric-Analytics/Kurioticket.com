import { airports } from "@/data/airports";
import { carRentalAreas } from "@/data/carRentalAreas";
import { countryCodeToCountryName } from "@/lib/geo/context";
import { fromCarLocation } from "@/lib/locations/adapters";
import { searchLocations } from "@/lib/locations/search";
import type { CanonicalLocation } from "@/lib/locations/types";

export type CarLocationSuggestionKind = "airport" | "city" | "area" | "custom";

export type CarLocationSuggestion = {
  id: string;
  kind: CarLocationSuggestionKind;
  value: string;
  primaryText: string;
  secondaryText: string;
  city?: string;
  countryCode?: string;
  airportCode?: string;
  providerPlaceId?: string;
  canonical?: CanonicalLocation;
  validation?: "owned-catalog" | "unverified-text";
  isProviderValidated?: false;
};

type SearchOptions = { limit?: number; country?: string | null };
type Candidate = CarLocationSuggestion & { priority: number; terms: string[] };

const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 10;

export function normalizeCarLocationSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’]/g, "'")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

const normalizeCountryHint = (country?: string | null) => {
  const normalized = country?.trim().toUpperCase();
  return normalized && /^[A-Z]{2}$/.test(normalized) ? normalized : undefined;
};

const countryName = (countryCode?: string) => countryCodeToCountryName(countryCode) ?? countryCode ?? "";

const airportCandidates: Candidate[] = airports.map((airport) => ({
  id: `airport-${airport.code.toLowerCase()}`,
  kind: "airport",
  value: `${airport.airport} (${airport.code})`,
  primaryText: airport.airport,
  secondaryText: `${airport.city}, ${countryName(airport.countryCode)}`,
  city: airport.city,
  countryCode: airport.countryCode,
  airportCode: airport.code,
  priority: airport.priority ?? 0,
  terms: [airport.code, airport.airport, airport.name ?? "", airport.city, airport.country ?? "", countryName(airport.countryCode)],
}));

const cityCandidates = Array.from(
  airports.reduce((cities, airport) => {
    const key = `${normalizeCarLocationSearchText(airport.city)}-${airport.countryCode ?? ""}`;
    const current = cities.get(key);
    const priority = airport.priority ?? 0;
    if (!current || priority > current.priority) {
      cities.set(key, {
        id: `city-${(airport.countryCode ?? "xx").toLowerCase()}-${normalizeCarLocationSearchText(airport.city).replace(/\s/g, "-")}`,
        kind: "city" as const,
        value: `${airport.city}, ${countryName(airport.countryCode)}`,
        primaryText: airport.city,
        secondaryText: countryName(airport.countryCode),
        city: airport.city,
        countryCode: airport.countryCode,
        priority,
        terms: [airport.city, airport.country ?? "", countryName(airport.countryCode)],
      });
    }
    return cities;
  }, new Map<string, Candidate>()).values(),
);

const areaCandidates: Candidate[] = carRentalAreas.map((area) => ({
  id: `area-${area.id}`,
  kind: "area",
  value: `${area.name}, ${area.city}`,
  primaryText: area.name,
  secondaryText: `${area.city}, ${countryName(area.countryCode)}`,
  city: area.city,
  countryCode: area.countryCode,
  priority: area.priority ?? 0,
  terms: [area.name, area.city, countryName(area.countryCode), ...(area.aliases ?? [])],
}));

const allCandidates = [...airportCandidates, ...cityCandidates, ...areaCandidates];

const popularIds = [
  "city-ng-lagos", "airport-los", "area-ng-lagos-victoria-island", "area-ng-lagos-ikeja", "city-ng-abuja", "airport-abv", "area-ng-abuja-central-area",
  "city-gb-london", "airport-lhr", "city-us-new-york", "airport-jfk", "city-ae-dubai", "airport-dxb", "city-jp-tokyo", "city-fr-paris", "city-sg-singapore",
];

const globalPopularIds = ["city-gb-london", "airport-lhr", "city-us-new-york", "airport-jfk", "city-ae-dubai", "airport-dxb", "city-jp-tokyo", "city-sg-singapore"];

function popularSuggestions(limit: number, countryHint?: string) {
  const preferred = countryHint
    ? allCandidates.filter((candidate) => candidate.countryCode === countryHint).sort((a, b) => b.priority - a.priority).slice(0, Math.min(7, limit))
    : [];
  const byId = new Map(allCandidates.map((candidate) => [candidate.id, candidate]));
  const seeded = (countryHint === "NG" ? popularIds : globalPopularIds).map((id) => byId.get(id)).filter(Boolean) as Candidate[];
  return dedupe([...preferred, ...seeded, ...globalPopularIds.map((id) => byId.get(id)).filter(Boolean) as Candidate[]]).slice(0, limit);
}

function dedupe(candidates: Candidate[]) {
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    const key = `${candidate.kind}-${normalizeCarLocationSearchText(candidate.value)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export type CarCatalogSearchResult = {
  suggestions: CarLocationSuggestion[];
  provenance: {
    source: "owned-catalog";
    catalogVersion: "legacy-catalog-v1";
    isLiveAvailability: false;
  };
  recovery?: {
      kind: "unverified" | "continue-typing";
      coverage: "unverified" | "none";
      canSubmit: boolean;
      canSubmitQuery: boolean;
    message: string;
  };
};

const canonicalCandidate = (candidate: Candidate) => ({
  ...fromCarLocation(stripInternalFields(candidate)),
  aliases: candidate.terms,
});

const publicOwnedSuggestion = (candidate: Candidate): CarLocationSuggestion => {
  const suggestion = stripInternalFields(candidate);
  return {
    ...suggestion,
    canonical: canonicalCandidate(candidate),
    validation: "owned-catalog",
    isProviderValidated: false,
  };
};

export async function searchCanonicalCarCatalog(query: string, options: SearchOptions = {}): Promise<CarCatalogSearchResult> {
  const limit = Math.min(MAX_LIMIT, Math.max(1, Math.trunc(options.limit ?? DEFAULT_LIMIT)));
  const countryHint = normalizeCountryHint(options.country);
  const trimmedQuery = query.trim().replace(/\s+/g, " ");
  const normalizedQuery = normalizeCarLocationSearchText(trimmedQuery);

  if (!normalizedQuery && !trimmedQuery) {
    return {
      suggestions: popularSuggestions(limit, countryHint).map(publicOwnedSuggestion),
      provenance: { source: "owned-catalog", catalogVersion: "legacy-catalog-v1", isLiveAvailability: false },
    };
  }
  if (!normalizedQuery) {
    return {
      suggestions: [],
      provenance: { source: "owned-catalog", catalogVersion: "legacy-catalog-v1", isLiveAvailability: false },
        recovery: { kind: "continue-typing", coverage: "none", canSubmit: false, canSubmitQuery: false, message: "Continue typing to search or use an unverified location." },
    };
  }

  const candidatesById = new Map(allCandidates.map((candidate) => [`car:${candidate.id}`, candidate]));
  const localMatches = countryHint
    ? searchLocations(allCandidates.filter((candidate) => candidate.countryCode === countryHint).map(canonicalCandidate), trimmedQuery, 25)
    : [];
  const rankedMatches = [...localMatches, ...searchLocations(allCandidates.map(canonicalCandidate), trimmedQuery, 25)]
    .filter((entry, index, entries) => entries.findIndex((candidate) => candidate.match.location.id === entry.match.location.id) === index);
  const ranked = rankedMatches
    .map(({ match, index }) => ({ candidate: candidatesById.get(match.location.id), match, index }))
    .filter((entry): entry is typeof entry & { candidate: Candidate } => Boolean(entry.candidate))
    .sort((a, b) => {
      const aLocal = Number(Boolean(countryHint && a.candidate.countryCode === countryHint));
      const bLocal = Number(Boolean(countryHint && b.candidate.countryCode === countryHint));
      const kindDelta = Number(b.candidate.kind === "city") - Number(a.candidate.kind === "city");
      return bLocal - aLocal || b.match.score - a.match.score || kindDelta || b.candidate.priority - a.candidate.priority || a.index - b.index;
    })
    .map((entry) => entry.candidate);

  const deduped = dedupe(ranked);
  const hasExactValue = deduped.some((candidate) =>
    normalizeCarLocationSearchText(candidate.value) === normalizedQuery ||
    normalizeCarLocationSearchText(candidate.primaryText) === normalizedQuery ||
    normalizeCarLocationSearchText(candidate.airportCode ?? "") === normalizedQuery ||
    candidate.terms.some((term) => normalizeCarLocationSearchText(term) === normalizedQuery),
  );

  if (trimmedQuery.length >= 2 && !hasExactValue) {
    deduped.push({
      id: `custom-${normalizedQuery.replace(/\s/g, "-").slice(0, 80)}`,
      kind: "custom",
      value: trimmedQuery,
      primaryText: `Use “${trimmedQuery}”`,
      secondaryText: "Unverified typed location",
      priority: -1,
      terms: [trimmedQuery],
    });
  }

  const ownedSuggestions = deduped.filter((candidate) => candidate.kind !== "custom").slice(0, limit).map(publicOwnedSuggestion);
  const hasCustom = deduped.some((candidate) => candidate.kind === "custom");
  const suggestions = hasCustom && ownedSuggestions.length < limit
    ? [
        ...ownedSuggestions,
        {
          ...stripInternalFields(deduped.find((candidate) => candidate.kind === "custom")!),
          canonical: fromCarLocation(stripInternalFields(deduped.find((candidate) => candidate.kind === "custom")!)),
          validation: "unverified-text" as const,
          isProviderValidated: false as const,
        },
      ]
    : ownedSuggestions;

  const hasOwnedMatch = ownedSuggestions.length > 0;
  return {
    suggestions,
    provenance: { source: "owned-catalog", catalogVersion: "legacy-catalog-v1", isLiveAvailability: false },
    recovery: !hasOwnedMatch
      ? trimmedQuery.length >= 2
          ? { kind: "unverified", coverage: "unverified", canSubmit: true, canSubmitQuery: true, message: "No verified catalogue match. You can use this unverified typed location; static cars may be unavailable." }
          : { kind: "continue-typing", coverage: "none", canSubmit: false, canSubmitQuery: false, message: "Continue typing to search or use an unverified location." }
      : undefined,
  };
}

export async function searchCarLocationSuggestions(query: string, options: SearchOptions = {}): Promise<CarLocationSuggestion[]> {
  return (await searchCanonicalCarCatalog(query, options)).suggestions;
}

function stripInternalFields(candidate: Candidate): CarLocationSuggestion {
  return {
    id: candidate.id,
    kind: candidate.kind,
    value: candidate.value,
    primaryText: candidate.primaryText,
    secondaryText: candidate.secondaryText,
    city: candidate.city,
    countryCode: candidate.countryCode,
    airportCode: candidate.airportCode,
    providerPlaceId: candidate.providerPlaceId,
  };
}
