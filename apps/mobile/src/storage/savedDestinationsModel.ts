import { airports, type Airport } from "../features/flow/airportData";

export function parseSavedDestinationIds(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function resolveSavedDestinationIds(ids: readonly string[]): Airport["code"][] {
  const resolved = ids.flatMap((id) => {
    const normalized = id.trim().toLocaleLowerCase();
    const airport = airports.find((item) => item.code.toLocaleLowerCase() === normalized || item.city.toLocaleLowerCase() === normalized);
    return airport ? [airport.code] : [];
  });
  return [...new Set(resolved)];
}
