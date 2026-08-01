import { airports, type Airport } from "../flow/airportData";
import { INTEREST_DESTINATIONS } from "./interestMappings";

const normalize = (value: string) => value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
const score = (value: string, query: string) => value === query ? 0 : value.startsWith(query) ? 1 : value.includes(query) ? 2 : 99;
export type ExploreSearchResult = { airport: Airport; match: "destination" | "interest"; interest?: string; rank: number };
export type DestinationGroup = { name: string; destinations: Airport[] };
export type DestinationSection = DestinationGroup & { lead: Airport };

export function searchExplore(queryValue: string): ExploreSearchResult[] {
  const query = normalize(queryValue);
  if (!query) return [];
  const interest = INTEREST_DESTINATIONS.find(([name]) => normalize(name) === query);
  if (interest) {
    const airport = airports.find((item) => item.city === interest[1]);
    return airport ? [{ airport, match: "interest", interest: interest[0], rank: 0 }] : [];
  }
  return airports.flatMap((airport) => {
    const values = [airport.city, airport.code, ...searchableCountryValues(airport)].map(normalize);
    const rank = Math.min(...values.map((value) => score(value, query)));
    return rank < 99 ? [{ airport, match: "destination" as const, rank }] : [];
  }).sort((a, b) => a.rank - b.rank || a.airport.city.localeCompare(b.airport.city) || a.airport.code.localeCompare(b.airport.code));
}

/** Returns the only exact catalogue or maintained-interest match, if one exists. */
export function exactExploreResult(results: readonly ExploreSearchResult[]): Airport | undefined {
  const exact = results.filter((result) => result.rank === 0);
  return exact.length === 1 ? exact[0]?.airport : undefined;
}

export function searchableCountryValues(airport: Airport): string[] {
  return airport.country === "USA" ? ["USA", "United States"] : [airport.country];
}

export const REGION_BY_AIRPORT = {
  JFK: "North America", LAX: "North America", LHR: "Europe", CDG: "Europe", DXB: "Middle East",
  DPS: "Southeast Asia", JTR: "Europe", NRT: "East Asia", FCO: "Europe", BCN: "Europe",
  BKK: "Southeast Asia", IST: "Türkiye (catalogue grouping)",
} as const satisfies Record<Airport["code"], string>;

export function countries(): DestinationGroup[] {
  return groupBy((airport) => airport.country === "USA" ? "United States" : airport.country);
}

export function regions(): DestinationGroup[] {
  return groupBy((airport) => REGION_BY_AIRPORT[airport.code]);
}

function groupBy(label: (airport: Airport) => string): DestinationGroup[] {
  const groups = new Map<string, Airport[]>();
  for (const airport of airports) groups.set(label(airport), [...(groups.get(label(airport)) ?? []), airport]);
  return [...groups].map(([name, destinations]) => ({ name, destinations })).sort((a, b) => a.name.localeCompare(b.name));
}

const SECTION_LEADS = [
  ["Europe", "CDG"],
  ["Southeast Asia", "DPS"],
  ["North America", "JFK"],
] as const;

/** Product-maintained, neutral Explore sections derived entirely from the current catalogue. */
export function destinationSections(): DestinationSection[] {
  const grouped = new Map(regions().map((group) => [group.name, group]));
  return SECTION_LEADS.flatMap(([name, code]) => {
    const group = grouped.get(name);
    const lead = group?.destinations.find((airport) => airport.code === code) ?? group?.destinations[0];
    return group && lead ? [{ ...group, lead }] : [];
  });
}

export function destinationCardLayout(screenWidth: number) {
  const viewport = Math.max(240, screenWidth - 36);
  const gap = 14;
  const preview = Math.min(42, Math.max(24, viewport * .1));
  const cardWidth = viewport - preview;
  return { cardWidth, gap, snapInterval: cardWidth + gap };
}

export function exploreActionCardLayout(screenWidth: number) {
  const contentWidth = Math.max(240, screenWidth - 36);
  const gap = 12;
  const columns = contentWidth < 300 ? 1 : 2;
  const cardWidth = columns === 1 ? contentWidth : (contentWidth - gap) / 2;
  return { columns, cardWidth, gap };
}

export function shouldShowExploreFloatingAction(input: {
  tab: "Destinations" | "Inspiration" | "Compare";
  queryActive: boolean;
  keyboardVisible: boolean;
  modalOpen: boolean;
}) {
  return input.tab === "Destinations" && !input.queryActive && !input.keyboardVisible && !input.modalOpen;
}

export function exploreBottomPadding(tabBarHeight: number, safeBottom: number) {
  return tabBarHeight + Math.max(safeBottom, 10) + 18;
}
