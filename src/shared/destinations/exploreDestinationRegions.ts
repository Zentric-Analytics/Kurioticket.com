import type { CanonicalExploreDestination } from "./exploreDestinationCatalogue";

export const EXPLORE_REGIONS = [
  "Africa",
  "Asia",
  "Europe",
  "North America",
  "Central America",
  "Caribbean",
  "South America",
  "Oceania & Pacific",
] as const;

export type ExploreRegion = (typeof EXPLORE_REGIONS)[number];

/**
 * Product navigation taxonomy for the canonical Explore catalogue.
 * Country membership is explicit and intentionally independent of editorial and Popular data.
 */
const REGION_COUNTRY_CODES: Readonly<Record<ExploreRegion, readonly string[]>> = {
  Africa: ["AO", "BF", "BI", "BJ", "BW", "CD", "CG", "CI", "CM", "DJ", "DZ", "EG", "ET", "GA", "GH", "GM", "GN", "KE", "LR", "LY", "MA", "MG", "ML", "MU", "MZ", "NA", "NE", "NG", "RE", "RW", "SC", "SD", "SL", "SN", "SO", "SS", "TG", "TN", "TZ", "UG", "ZA", "ZM", "ZW"],
  Asia: ["AE", "AM", "AZ", "BD", "BH", "BN", "BT", "CN", "GE", "HK", "ID", "IL", "IN", "IQ", "IR", "JO", "JP", "KG", "KH", "KR", "KW", "KZ", "LA", "LB", "LK", "MM", "MN", "MO", "MV", "MY", "NP", "OM", "PH", "PK", "QA", "SA", "SG", "TH", "TJ", "TL", "TM", "TW", "UZ", "VN"],
  Europe: ["AL", "AT", "BA", "BE", "BG", "CH", "CZ", "DE", "DK", "EE", "ES", "FI", "FR", "GB", "GR", "HR", "HU", "IE", "IS", "IT", "LT", "LU", "LV", "ME", "MK", "NL", "NO", "PL", "PT", "RO", "RS", "RU", "SE", "SI", "TR", "UA", "CY"],
  "North America": ["CA", "MX", "US"],
  "Central America": ["CR", "GT", "HN", "NI", "PA", "SV"],
  Caribbean: ["AG", "AW", "BB", "BS", "CU", "DO", "JM", "TT"],
  "South America": ["AR", "BO", "BR", "CL", "CO", "EC", "PE", "PY", "UY"],
  "Oceania & Pacific": ["AU", "CK", "FJ", "GU", "MP", "NZ", "PF", "PG", "SB", "TO", "VU", "WS"],
};

const regionByCountryCode = new Map<string, ExploreRegion>();
for (const region of EXPLORE_REGIONS) {
  for (const countryCode of REGION_COUNTRY_CODES[region]) {
    if (regionByCountryCode.has(countryCode)) {
      throw new Error(`Explore country belongs to multiple regions: ${countryCode}`);
    }
    regionByCountryCode.set(countryCode, region);
  }
}

export function exploreRegionForDestination(
  destination: Pick<CanonicalExploreDestination, "id" | "countryCode">,
): ExploreRegion {
  const region = regionByCountryCode.get(destination.countryCode);
  if (!region) throw new Error(`Unclassified Explore destination: ${destination.id}`);
  return region;
}

export function groupExploreDestinationsByRegion<T extends CanonicalExploreDestination>(
  destinations: readonly T[],
): ReadonlyMap<ExploreRegion, readonly T[]> {
  const grouped = new Map<ExploreRegion, T[]>(
    EXPLORE_REGIONS.map((region) => [region, []]),
  );
  for (const destination of destinations) {
    grouped.get(exploreRegionForDestination(destination))!.push(destination);
  }
  return grouped;
}

export function exploreRegionSlug(region: ExploreRegion) {
  return region.toLocaleLowerCase().replace(/ & /g, "-").replace(/ /g, "-");
}

export function exploreRegionFromSlug(value: string): ExploreRegion | undefined {
  return EXPLORE_REGIONS.find((region) => exploreRegionSlug(region) === value);
}
