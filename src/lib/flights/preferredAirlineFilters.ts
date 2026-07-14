import { airlines } from "@/data/airlines";

export type TravelPreferencesAirlinePayload = {
  preferences?: {
    preferredAirlines?: string[] | null;
  } | null;
};

const supportedAirlineNameByCode = new Map(
  airlines.map((airline) => [airline.code.trim().toUpperCase(), airline.name]),
);

export function normalizePreferredAirlineFilterValues(
  values: readonly string[] | null | undefined,
  availableFilterValues: readonly string[],
) {
  if (!Array.isArray(values) || values.length === 0) return [];

  const availableFilters = new Set(availableFilterValues);
  const seenCodes = new Set<string>();
  const nextFilters: string[] = [];

  for (const value of values) {
    const code = value.trim().toUpperCase();
    const airlineName = supportedAirlineNameByCode.get(code);

    if (
      !airlineName ||
      seenCodes.has(code) ||
      !availableFilters.has(airlineName)
    ) {
      continue;
    }

    seenCodes.add(code);
    nextFilters.push(airlineName);
  }

  return nextFilters;
}

export function hasAirlineFilterSearchParam(params: URLSearchParams) {
  return params.has("fAirline");
}
