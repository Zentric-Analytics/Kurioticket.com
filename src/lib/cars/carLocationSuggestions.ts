import { airports } from "@/data/airports";
import { carRentalAreas } from "@/data/carRentalAreas";
import { countryCodeToCountryName } from "@/lib/geo/context";

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

const scoreCandidate = (candidate: Candidate, query: string, countryHint?: string) => {
  const normalizedTerms = candidate.terms.map(normalizeCarLocationSearchText).filter(Boolean);
  const exactCode = candidate.airportCode && normalizeCarLocationSearchText(candidate.airportCode) === query;
  const exactPrimary = normalizeCarLocationSearchText(candidate.primaryText) === query || normalizeCarLocationSearchText(candidate.value) === query;
  const exactTerm = normalizedTerms.some((term) => term === query);
  const prefix = normalizedTerms.some((term) => term.startsWith(query));
  const containedWord = normalizedTerms.some((term) => term.split(" ").some((word) => word.startsWith(query)) || term.includes(query));

  if (!exactCode && !exactPrimary && !exactTerm && !prefix && !containedWord) return undefined;

  const bucket = exactCode ? 0 : exactPrimary ? 1 : exactTerm ? 2 : prefix ? 3 : 4;
  const countryBoost = countryHint && candidate.countryCode === countryHint ? -2 : 0;
  const kindBoost = candidate.kind === "city" ? -0.08 : candidate.kind === "airport" ? -0.04 : 0;
  return bucket + countryBoost + kindBoost;
};

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

export async function searchCarLocationSuggestions(query: string, options: SearchOptions = {}): Promise<CarLocationSuggestion[]> {
  const limit = Math.min(MAX_LIMIT, Math.max(1, Math.trunc(options.limit ?? DEFAULT_LIMIT)));
  const countryHint = normalizeCountryHint(options.country);
  const trimmedQuery = query.trim().replace(/\s+/g, " ");
  const normalizedQuery = normalizeCarLocationSearchText(trimmedQuery);

  if (!normalizedQuery) return popularSuggestions(limit, countryHint).map(stripInternalFields);

  const ranked = allCandidates
    .map((candidate, index) => ({ candidate, index, score: scoreCandidate(candidate, normalizedQuery, countryHint) }))
    .filter((entry): entry is { candidate: Candidate; index: number; score: number } => entry.score !== undefined)
    .sort((a, b) => a.score - b.score || b.candidate.priority - a.candidate.priority || a.index - b.index)
    .map((entry) => entry.candidate);

  const deduped = dedupe(ranked);
  const hasExactValue = deduped.some((candidate) => normalizeCarLocationSearchText(candidate.value) === normalizedQuery || normalizeCarLocationSearchText(candidate.primaryText) === normalizedQuery);

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

  return deduped.slice(0, limit).map(stripInternalFields);
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
