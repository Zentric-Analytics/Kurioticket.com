import { curatedDestinationImage } from "../../data/destinationImages";
import type { AirportOption } from "../airports";

export type ExploreDestinationProvenance = {
  airports: "shared-airport-catalogue";
  image: "website-curated" | "mobile-or-fallback";
};

export type CanonicalExploreDestination = {
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
};

type DestinationOverride = {
  name: string;
  slug: string;
  aliases?: readonly string[];
};

/** Explicit travel-facing labels for known differences from airport city data. */
export const EXPLORE_DESTINATION_OVERRIDES: Readonly<Record<string, DestinationOverride>> = {
  "ID|denpasar": {
    name: "Bali",
    slug: "bali",
    aliases: ["Denpasar", "Ngurah Rai"],
  },
};

export const normalizeExploreDestinationText = (value: string) =>
  value.trim().replace(/\s+/g, " ").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();

const slugify = (value: string) =>
  normalizeExploreDestinationText(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const sourceKey = (airport: AirportOption) =>
  `${airport.countryCode?.toUpperCase()}|${normalizeExploreDestinationText(airport.city)}`;

/** Constructs the canonical, airport-backed catalogue without editorial enrichment. */
export function buildCanonicalExploreDestinations(
  source: readonly AirportOption[],
): CanonicalExploreDestination[] {
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
      searchAliases: [...new Set([...group.map((airport) => airport.city), ...(override?.aliases ?? [])])].sort(),
      imageDestinationId: id,
      provenance: {
        airports: "shared-airport-catalogue" as const,
        image: curatedDestinationImage(id) ? ("website-curated" as const) : ("mobile-or-fallback" as const),
      },
    };
  });

  const ids = new Set<string>();
  for (const record of records) {
    if (ids.has(record.id)) throw new Error(`Duplicate Explore destination ID: ${record.id}`);
    ids.add(record.id);
  }
  return records;
}
