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
