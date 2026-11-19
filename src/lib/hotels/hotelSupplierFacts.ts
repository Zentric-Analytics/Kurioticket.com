import type { PublicHotelProviderDetails, PublicHotelProviderFact } from "./hotelProviderDetails";

/** Accepts only typed, sanitized customer facts, never raw transport data. */
export function hotelSupplierFacts(details?: PublicHotelProviderDetails | null, includeRate = true): PublicHotelProviderFact[] {
  if (!details) return [];
  const facts: PublicHotelProviderFact[] = [];
  const value = (label: string, item: string | boolean | undefined) => {
    if (item !== undefined && item !== "") facts.push({ label, value: typeof item === "boolean" ? item ? "Yes" : "No" : item });
  };
  const rows = (prefix: string, items?: PublicHotelProviderFact[]) => items?.forEach(item => facts.push({ label: `${prefix} · ${item.label}`, value: item.value }));
  value("Address", details.overview?.address);
  value("Country", details.overview?.countryCode);
  value("Self-rated classification", details.overview?.selfRated);
  rows("Property information", details.overview?.place);
  rows("Property policy", details.overview?.policies);
  value("Provider guest sentiment", details.reviews?.sentiment);
  rows("Provider review quotation", details.reviews?.quotes);
  if (includeRate) {
    value("Room", details.rate?.roomName);
    value("Free cancellation", details.rate?.freeCancellation);
    value("Pay later", details.rate?.payLater);
    value("Bundled rate", details.rate?.bundledRate);
    rows("Rate breakdown", details.rate?.rateBreakdown);
    rows("Rate condition", details.rate?.conditions);
  }
  return facts;
}
