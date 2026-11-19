import { formatAirportLabel, getAirportByCode } from "@/data/airports";

export function canonicalHomepageAirportField(
  value: string,
  locale?: string | null,
) {
  const trimmed = value.trim();
  const normalized = trimmed.toUpperCase();
  const code =
    normalized.match(/^[A-Z]{3}$/)?.[0] ??
    normalized.match(/\(([A-Z]{3})\)\s*$/)?.[1] ??
    "";
  const airport = code ? getAirportByCode(code) : undefined;
  return {
    text: airport ? formatAirportLabel(airport, locale) : trimmed,
    code,
  };
}
