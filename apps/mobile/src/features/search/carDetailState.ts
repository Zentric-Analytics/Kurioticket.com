import type { CarResult } from "../../api/travelApi";

type CarOffer = CarResult["offers"][number];

export function validHttpsBookingUrl(value: unknown): value is string {
  if (typeof value !== "string" || value !== value.trim() || !/^https:\/\/[^/]/.test(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && Boolean(url.hostname) && url.username === "" && url.password === "";
  } catch {
    return false;
  }
}

export function canBookCarOffer(bookable: boolean, offer?: CarOffer): boolean {
  return bookable && validHttpsBookingUrl(offer?.bookingUrl);
}

export function sortedValidCarOffers(offers: CarOffer[]): CarOffer[] {
  return [...offers]
    .filter((offer) => Number.isFinite(offer.totalPrice) && offer.totalPrice >= 0)
    .sort((a, b) => a.totalPrice - b.totalPrice || a.id.localeCompare(b.id));
}

/** Returns at most three real offers with distinct displayed per-day prices, cheapest total first. */
export function comparisonCarOffers(offers: CarOffer[], limit = 3): CarOffer[] {
  const cappedLimit = Math.max(0, Math.floor(limit));
  if (!cappedLimit) return [];
  const seenPrices = new Set<string>();
  const selected: CarOffer[] = [];
  const sorted = [...offers]
    .filter((offer) => Number.isFinite(offer.totalPrice) && offer.totalPrice >= 0 && Number.isFinite(offer.pricePerDay) && offer.pricePerDay >= 0)
    .sort((a, b) => a.totalPrice - b.totalPrice || a.pricePerDay - b.pricePerDay || a.id.localeCompare(b.id));
  for (const offer of sorted) {
    const priceKey = `${offer.currency}:${offer.pricePerDay}`;
    if (seenPrices.has(priceKey)) continue;
    seenPrices.add(priceKey);
    selected.push(offer);
    if (selected.length >= cappedLimit) break;
  }
  return selected;
}

/** Mirrors the standalone web detail page's authoritative offer selection. */
export function primaryValidCarOffer(offers: CarOffer[]): CarOffer | undefined {
  return [...offers]
    .filter((offer) => Number.isFinite(offer.totalPrice) && offer.totalPrice >= 0)
    .sort((a, b) => a.totalPrice - b.totalPrice || a.pricePerDay - b.pricePerDay || a.id.localeCompare(b.id))[0];
}
