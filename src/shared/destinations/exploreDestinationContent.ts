import { airports, type AirportOption } from "../airports";
import { curatedDestinationImage } from "../../data/destinationImages";

export type ExploreDestinationProvenance = {
  airports: "shared-airport-catalogue";
  image: "website-curated" | "mobile-or-fallback";
};

export type ExploreDestination = {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  primaryAirportCode: string;
  airportCodes: readonly string[];
  airportNames: readonly string[];
  searchAliases: readonly string[];
  imageDestinationId: string;
  provenance: ExploreDestinationProvenance;
  description?: string;
  summary?: string;
  highlights?: readonly string[];
  relatedDestinationIds?: readonly string[];
};

type DestinationOverride = {
  name: string;
  slug: string;
  aliases?: readonly string[];
};

/** Explicit travel-facing labels for known differences from airport city data. */
export const EXPLORE_DESTINATION_OVERRIDES: Readonly<
  Record<string, DestinationOverride>
> = {
  "ID|denpasar": {
    name: "Bali",
    slug: "bali",
    aliases: ["Denpasar", "Ngurah Rai"],
  },
};

export const normalizeExploreDestinationText = (value: string) =>
  value
    .trim()
    .replace(/\s+/g, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase();

const slugify = (value: string) =>
  normalizeExploreDestinationText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const sourceKey = (airport: AirportOption) =>
  `${airport.countryCode?.toUpperCase()}|${normalizeExploreDestinationText(airport.city)}`;

export function buildExploreDestinations(
  source: readonly AirportOption[],
): ExploreDestination[] {
  const grouped = new Map<string, AirportOption[]>();
  for (const airport of source) {
    const key = sourceKey(airport);
    grouped.set(key, [...(grouped.get(key) ?? []), airport]);
  }

  const records = [...grouped.entries()].map(([key, group]) => {
    const first = group[0]!;
    const countryCode = first.countryCode!.toUpperCase();
    const override = EXPLORE_DESTINATION_OVERRIDES[key];
    const name = override?.name ?? first.city;
    const id = `${countryCode.toLocaleLowerCase()}-${override?.slug ?? slugify(name)}`;
    const ordered = [...group].sort(
      (a, b) => (b.priority ?? 0) - (a.priority ?? 0) || a.code.localeCompare(b.code),
    );
    return {
      id,
      name,
      country: first.country!,
      countryCode,
      primaryAirportCode: ordered[0]!.code,
      airportCodes: ordered.map((airport) => airport.code),
      airportNames: ordered.map((airport) => airport.airport),
      searchAliases: [
        ...new Set([
          ...group.map((airport) => airport.city),
          ...(override?.aliases ?? []),
        ]),
      ].sort(),
      imageDestinationId: id,
      provenance: {
        airports: "shared-airport-catalogue" as const,
        image: curatedDestinationImage(id)
          ? ("website-curated" as const)
          : ("mobile-or-fallback" as const),
      },
    };
  });

  const ids = new Set<string>();
  for (const record of records) {
    if (ids.has(record.id)) throw new Error(`Duplicate Explore destination ID: ${record.id}`);
    ids.add(record.id);
  }
  return records.sort(compareExploreDestinations);
}

export function compareExploreDestinations(
  a: ExploreDestination,
  b: ExploreDestination,
) {
  return (
    a.name.localeCompare(b.name) ||
    a.countryCode.localeCompare(b.countryCode) ||
    a.id.localeCompare(b.id)
  );
}

export const exploreDestinations = buildExploreDestinations(airports);
export const exploreDestinationById = new Map(
  exploreDestinations.map((destination) => [destination.id, destination]),
);
export const exploreDestinationByAirportCode = new Map(
  exploreDestinations.flatMap((destination) =>
    destination.airportCodes.map((code) => [code, destination] as const),
  ),
);

export function exploreDestinationByAlias(value: string) {
  const normalized = normalizeExploreDestinationText(value);
  const matches = exploreDestinations.filter((destination) =>
    [destination.name, ...destination.searchAliases].some(
      (label) => normalizeExploreDestinationText(label) === normalized,
    ),
  );
  return matches.length === 1 ? matches[0] : undefined;
}

export function requireExploreDestination(id: string): ExploreDestination {
  const destination = exploreDestinationById.get(id);
  if (!destination) throw new Error(`Unknown Explore destination ID: ${id}`);
  return destination;
}

/** Maintained default Explore stack. The full catalogue remains searchable. */
export const CURATED_POPULAR_EXPLORE_DESTINATION_IDS = [
  "fr-paris", "gb-london", "us-new-york", "id-bali", "ng-lagos",
  "ae-dubai", "jp-tokyo", "za-cape-town", "it-rome", "tr-istanbul",
  "th-bangkok", "es-barcelona", "eg-cairo", "ma-marrakesh", "sg-singapore",
  "nl-amsterdam", "ca-toronto", "us-los-angeles", "ng-abuja", "gh-accra",
  "za-johannesburg", "ke-nairobi", "pt-lisbon", "au-sydney",
  "br-rio-de-janeiro",
] as const;

export const popularExploreDestinations =
  CURATED_POPULAR_EXPLORE_DESTINATION_IDS.map(requireExploreDestination);
