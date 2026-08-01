import { airports, type Airport } from "../flow/airportData";

export type Destination = {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  airportCodes: readonly string[];
  primaryAirportCode: string;
  airportNames: readonly string[];
  searchAliases: readonly string[];
};

type Override = { name: string; slug: string; aliases?: readonly string[] };

/** Explicit travel-facing names that intentionally differ from source airport cities. */
export const DESTINATION_OVERRIDES: Readonly<Record<string, Override>> = {
  "ID|denpasar": { name: "Bali", slug: "bali", aliases: ["Denpasar", "Ngurah Rai"] },
};

export const normalizeDestinationText = (value: string) => value.trim().replace(/\s+/g, " ")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();

const slugify = (value: string) => normalizeDestinationText(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const sourceKey = (airport: Airport) => `${airport.countryCode.toUpperCase()}|${normalizeDestinationText(airport.city)}`;

export function deriveDestinations(source: readonly Airport[]): Destination[] {
  const groups = new Map<string, Airport[]>();
  for (const airport of source) groups.set(sourceKey(airport), [...(groups.get(sourceKey(airport)) ?? []), airport]);
  return [...groups.entries()].map(([key, group]) => {
    const first = group[0]!;
    const override = DESTINATION_OVERRIDES[key];
    const name = override?.name ?? first.city;
    const ordered = [...group].sort((a, b) => b.priority - a.priority || a.code.localeCompare(b.code));
    return {
      id: `${first.countryCode.toLocaleLowerCase()}-${override?.slug ?? slugify(name)}`,
      name,
      country: first.country,
      countryCode: first.countryCode.toUpperCase(),
      airportCodes: ordered.map((airport) => airport.code),
      primaryAirportCode: ordered[0]!.code,
      airportNames: [...new Set(group.map((airport) => airport.airport))].sort(),
      searchAliases: [...new Set([...group.map((airport) => airport.city), ...(override?.aliases ?? [])])].sort(),
    };
  }).sort(compareDestinations);
}

export function compareDestinations(a: Destination, b: Destination) {
  return a.name.localeCompare(b.name) || a.countryCode.localeCompare(b.countryCode) || a.id.localeCompare(b.id);
}

export const destinations = deriveDestinations(airports);
export const destinationById = new Map(destinations.map((destination) => [destination.id, destination]));
export const destinationByAirportCode = new Map(destinations.flatMap((destination) => destination.airportCodes.map((code) => [code, destination] as const)));

export function destinationByUnambiguousName(value: string): Destination | undefined {
  const normalized = normalizeDestinationText(value);
  const matches = destinations.filter((destination) => [destination.name, ...destination.searchAliases].some((name) => normalizeDestinationText(name) === normalized));
  return matches.length === 1 ? matches[0] : undefined;
}
