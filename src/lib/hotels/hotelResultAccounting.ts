import { hotelPropertyKey } from "./groupHotelOffers";

/** Operational inventory totals, not customer views or filter selections.
 * A versioned pair describes one exact returned inventory; resultCount retains
 * its existing offer-row semantics. A missing pair is deliberately unknown. */
export type HotelResultAccounting = {
  version: 1;
  offerCount: number;
  propertyCount: number;
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}

export function countHotelInventory(offers: readonly unknown[]): HotelResultAccounting | null {
  const properties = new Set<string>();
  for (const offer of offers) {
    const row = record(offer);
    if (!row || typeof row.id !== "string" || !row.id ||
        typeof row.provider !== "string" || !row.provider ||
        (row.propertyGroupId != null && typeof row.propertyGroupId !== "string")) return null;
    properties.add(hotelPropertyKey({
      id: row.id, provider: row.provider,
      propertyGroupId: typeof row.propertyGroupId === "string" ? row.propertyGroupId : undefined,
    }));
  }
  return { version: 1, offerCount: offers.length, propertyCount: properties.size };
}

function count(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

/** Never infer a property count from an old scalar, name or other search.
 * Reject an inconsistent pair rather than mislabel an old or corrupted count. */
export function readHotelResultAccounting(query: unknown, resultCount: unknown): HotelResultAccounting | null {
  const pair = record(record(query)?.hotelResultAccounting);
  if (!pair || pair.version !== 1 || !count(pair.offerCount) || !count(pair.propertyCount) ||
      pair.offerCount !== resultCount || pair.propertyCount > pair.offerCount ||
      (pair.offerCount > 0 && pair.propertyCount === 0)) return null;
  return { version: 1, offerCount: pair.offerCount, propertyCount: pair.propertyCount };
}

export function recordedHotelPropertyCount(product: unknown, query: unknown, resultCount: unknown): number | null {
  return product === "HOTEL" ? readHotelResultAccounting(query, resultCount)?.propertyCount ?? null : null;
}

/** Called inside the existing request-key transaction. Keep metadata from the
 * original search (session, environment, network, criteria, snapshot). Move
 * the two counts as one pair from the same cumulative response. Never combine
 * an older property count with a larger offer count or sum page counts. */
export function advanceHotelResultAccounting(
  original: Record<string, unknown>, previousOffers: number,
  incoming: Record<string, unknown>, incomingOffers: number,
): Record<string, unknown> {
  const previous = readHotelResultAccounting(original, previousOffers);
  const next = readHotelResultAccounting(incoming, incomingOffers);
  const chosen = incomingOffers > previousOffers ? next
    : incomingOffers === previousOffers ? previous ?? next : previous;
  const { hotelResultAccounting: _old, ...rest } = original;
  return chosen ? { ...rest, hotelResultAccounting: chosen } : rest;
}

/** Only use at presentation boundaries for hotel records. Legacy totals may
 * have other historical semantics; do not retroactively relabel them. */
export function hotelResultSummary(offers: number, propertyCount: number | null | undefined): string {
  const format = (value: number) => new Intl.NumberFormat("en-US").format(value);
  if (!count(propertyCount) || !count(offers) || propertyCount > offers ||
      (offers > 0 && propertyCount === 0)) return "Property groups not recorded · " + format(offers) + " recorded results";
  return format(propertyCount) + (propertyCount === 1 ? " property group" : " property groups") +
    " · " + format(offers) + (offers === 1 ? " offer" : " offers");
}
