/**
 * Operational accounting for one server-returned car inventory. The existing
 * resultCount stays the returned group-row count, never the nested offer count.
 * Do not group by model name or deduplicate/modify any returned offer rows.
 */
export type CarResultAccounting = {
  version: 1;
  groupCount: number;
  offerCount: number;
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}
function count(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}
function id(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
function validPair(groups: unknown, offers: unknown): boolean {
  return count(groups) && count(offers) && offers >= groups &&
    (groups !== 0 || offers === 0);
}

/** Count the exact classified (or finally authorized) result groups and
 * nested offer rows. A malformed or ambiguous group makes the pair unknown,
 * not a fabricated total. Distinct search-scoped IDs remain distinct even
 * when their model names match.
 */
export function countCarInventory(results: readonly unknown[]): CarResultAccounting | null {
  const groups = new Set<string>();
  let offerCount = 0;
  for (const value of results) {
    const car = record(value);
    if (!car || !id(car.id) || groups.has(car.id) ||
        !Array.isArray(car.offers) || !car.offers.length ||
        car.offers.some(offer => !id(record(offer)?.id))) return null;
    groups.add(car.id);
    offerCount += car.offers.length;
    if (!count(offerCount)) return null;
  }
  return { version: 1, groupCount: groups.size, offerCount };
}

/** Only trust a versioned pair that agrees with the original scalar. */
export function readCarResultAccounting(query: unknown, resultCount: unknown): CarResultAccounting | null {
  const pair = record(record(query)?.carResultAccounting);
  if (!pair || pair.version !== 1 || !count(pair.groupCount) || !count(pair.offerCount) ||
      pair.groupCount !== resultCount || !validPair(pair.groupCount, pair.offerCount)) return null;
  return { version: 1, groupCount: pair.groupCount, offerCount: pair.offerCount };
}

export function recordedCarOfferCount(product: unknown, query: unknown, resultCount: unknown): number | null {
  return product === "CAR" ? readCarResultAccounting(query, resultCount)?.offerCount ?? null : null;
}

/** Old scalar counts may have other historical meanings; do not relabel
 * them as verified car groups or invent a rental offer count.
 */
export function carResultSummary(groups: number, offers: number | null | undefined): string {
  const format = (value: number) => new Intl.NumberFormat("en-US").format(value);
  if (!count(offers) || !validPair(groups, offers))
    return format(groups) + " recorded results · Rental offers not recorded";
  return format(groups) + (groups === 1 ? " car result group" : " car result groups") +
    " · " + format(offers) + (offers === 1 ? " rental offer" : " rental offers");
}
