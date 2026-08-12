export type MobileExploreDestination = {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  primaryAirportCode: string;
  airportCodes: string[];
  airportNames: string[];
  searchAliases: string[];
  imageDestinationId: string;
  imageUrl: string | null;
  summary: string | null;
  description: string | null;
  highlights: string[];
  relatedDestinationIds: string[];
};

export type MobileExploreRegion = {
  id: string;
  name: string;
  slug: string;
  destinations: MobileExploreDestination[];
};

export type MobileExploreCatalogue = {
  version: string;
  regions: MobileExploreRegion[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

const isNullableString = (value: unknown): value is string | null =>
  value === null || typeof value === "string";

function parseDestination(value: unknown): MobileExploreDestination | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.id !== "string" || !value.id ||
    typeof value.name !== "string" || !value.name ||
    typeof value.country !== "string" || !value.country ||
    typeof value.countryCode !== "string" || !value.countryCode ||
    typeof value.primaryAirportCode !== "string" || !value.primaryAirportCode ||
    !isStringArray(value.airportCodes) || !value.airportCodes.length ||
    !isStringArray(value.airportNames) || !value.airportNames.length ||
    !isStringArray(value.searchAliases) ||
    typeof value.imageDestinationId !== "string" || !value.imageDestinationId ||
    !isNullableString(value.imageUrl) ||
    !isNullableString(value.summary) ||
    !isNullableString(value.description) ||
    !isStringArray(value.highlights) ||
    !isStringArray(value.relatedDestinationIds)
  ) return null;

  return {
    id: value.id,
    name: value.name,
    country: value.country,
    countryCode: value.countryCode,
    primaryAirportCode: value.primaryAirportCode,
    airportCodes: value.airportCodes,
    airportNames: value.airportNames,
    searchAliases: value.searchAliases,
    imageDestinationId: value.imageDestinationId,
    imageUrl: value.imageUrl,
    summary: value.summary,
    description: value.description,
    highlights: value.highlights,
    relatedDestinationIds: value.relatedDestinationIds,
  };
}

export function parseMobileExploreCatalogue(value: unknown): MobileExploreCatalogue | null {
  if (!isRecord(value) || typeof value.version !== "string" || !value.version || !Array.isArray(value.regions)) {
    return null;
  }

  const regionIds = new Set<string>();
  const regionSlugs = new Set<string>();
  const destinationIds = new Set<string>();
  const regions: MobileExploreRegion[] = [];

  for (const candidate of value.regions) {
    if (!isRecord(candidate) ||
      typeof candidate.id !== "string" || !candidate.id ||
      typeof candidate.name !== "string" || !candidate.name ||
      typeof candidate.slug !== "string" || !candidate.slug ||
      !Array.isArray(candidate.destinations) ||
      regionIds.has(candidate.id) || regionSlugs.has(candidate.slug)
    ) return null;

    regionIds.add(candidate.id);
    regionSlugs.add(candidate.slug);
    const destinations: MobileExploreDestination[] = [];

    for (const destinationCandidate of candidate.destinations) {
      const destination = parseDestination(destinationCandidate);
      if (!destination || destinationIds.has(destination.id)) return null;
      destinationIds.add(destination.id);
      destinations.push(destination);
    }

    regions.push({
      id: candidate.id,
      name: candidate.name,
      slug: candidate.slug,
      destinations,
    });
  }

  for (const region of regions) {
    for (const destination of region.destinations) {
      if (destination.relatedDestinationIds.some((id) => !destinationIds.has(id))) return null;
    }
  }

  return { version: value.version, regions };
}
