import { airports, type Airport } from "../flow/airportData";
import { INTEREST_DESTINATIONS } from "./interestMappings";

const normalize = (value: string) => value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
const countryAlias = (value: string) => value === "united states" ? "usa" : value;
const score = (value: string, query: string) => value === query ? 0 : value.startsWith(query) ? 1 : value.includes(query) ? 2 : 99;
export type ExploreSearchResult = { airport: Airport; match: "destination" | "interest"; interest?: string; rank: number };

export function searchExplore(queryValue: string): ExploreSearchResult[] {
  const query = countryAlias(normalize(queryValue));
  if (!query) return [];
  const interest = INTEREST_DESTINATIONS.find(([name]) => normalize(name) === query);
  if (interest) {
    const airport = airports.find((item) => item.city === interest[1]);
    return airport ? [{ airport, match: "interest", interest: interest[0], rank: 0 }] : [];
  }
  return airports.flatMap((airport) => {
    const values = [airport.city, airport.code, countryAlias(normalize(airport.country))].map(normalize);
    const rank = Math.min(...values.map((value) => score(value, query)));
    return rank < 99 ? [{ airport, match: "destination" as const, rank }] : [];
  }).sort((a, b) => a.rank - b.rank || a.airport.city.localeCompare(b.airport.city) || a.airport.code.localeCompare(b.airport.code));
}

export const REGION_BY_AIRPORT = {
  JFK: "North America", LAX: "North America", LHR: "Europe", CDG: "Europe", DXB: "Middle East",
  DPS: "Southeast Asia", JTR: "Europe", NRT: "East Asia", FCO: "Europe", BCN: "Europe",
  BKK: "Southeast Asia", IST: "Türkiye (catalogue grouping)",
} as const satisfies Record<Airport["code"], string>;

export function countries() { return groupBy((airport) => airport.country === "USA" ? "United States" : airport.country); }
export function regions() { return groupBy((airport) => REGION_BY_AIRPORT[airport.code]); }
function groupBy(label: (airport: Airport) => string) {
  const groups = new Map<string, Airport[]>();
  for (const airport of airports) groups.set(label(airport), [...(groups.get(label(airport)) ?? []), airport]);
  return [...groups].map(([name, destinations]) => ({ name, destinations })).sort((a, b) => a.name.localeCompare(b.name));
}

export function destinationCardLayout(screenWidth: number) {
  const viewport = Math.max(240, screenWidth - 36);
  const gap = 14;
  const preview = Math.min(42, Math.max(24, viewport * .1));
  const cardWidth = viewport - preview;
  return { cardWidth, gap, snapInterval: cardWidth + gap };
}
export function exploreBottomPadding(tabBarHeight: number, safeBottom: number) { return tabBarHeight + Math.max(safeBottom, 10) + 18; }
