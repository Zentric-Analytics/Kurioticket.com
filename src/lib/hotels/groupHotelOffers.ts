import type { PublicHotelResult } from "@/lib/types";

/** Call after filtering/sorting: the first eligible offer represents the group.
 * Only an explicit, search-scoped provider property key can join offers.
 * Display names are never evidence of cross-provider property identity. */
export function groupHotelOffers(offers: PublicHotelResult[]) {
  const groups = new Map<string, PublicHotelResult[]>();
  for (const offer of offers) {
    const key = JSON.stringify([offer.provider, offer.propertyGroupId ?? offer.id]);
    const group = groups.get(key);
    if (group) group.push(offer);
    else groups.set(key, [offer]);
  }
  return [...groups.values()];
}
