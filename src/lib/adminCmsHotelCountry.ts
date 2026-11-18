/** Hotel destinations are stored in the GLOBAL CMS market.
 * The visible directory displays draft payloads, so country filters must
 * match those same draft values, not an unrelated provider/market field. */
export function readCmsHotelCountry(payload: unknown): string {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return "";
  const country = (payload as Record<string, unknown>).country;
  if (typeof country !== "string") return "";
  const value = country.trim();
  return value.length > 0 && value.length <= 120 && !/[\u0000-\u001f\u007f]/.test(value) ? value : "";
}

export function cmsHotelCountryOptions(rows: readonly { draftPayload: unknown }[]): string[] {
  return [...new Set(rows.map(row => readCmsHotelCountry(row.draftPayload)).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right, "en"));
}

export function filterCmsHotelsByCountry<T extends { draftPayload: unknown }>(
  rows: readonly T[],
  country: string,
): T[] {
  return country ? rows.filter(row => readCmsHotelCountry(row.draftPayload) === country) : [...rows];
}
