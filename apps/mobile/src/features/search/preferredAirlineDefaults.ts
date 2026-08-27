import { airlines } from "../../../../../src/data/airlines";

const airlineNameByCode = new Map(
  airlines.map((airline) => [airline.code.trim().toUpperCase(), airline.name]),
);

export function normalizePreferredAirlineFilterValues(
  savedCodes: readonly unknown[] | null | undefined,
  availableAirlines: readonly string[],
) {
  if (!Array.isArray(savedCodes) || savedCodes.length === 0 || availableAirlines.length === 0) return [];

  const available = new Set(availableAirlines);
  const seenCodes = new Set<string>();
  const normalized: string[] = [];

  for (const savedCode of savedCodes) {
    if (typeof savedCode !== "string") continue;
    const code = savedCode.trim().toUpperCase();
    const airlineName = airlineNameByCode.get(code);
    if (!airlineName || seenCodes.has(code) || !available.has(airlineName)) continue;
    seenCodes.add(code);
    normalized.push(airlineName);
  }

  return normalized;
}
