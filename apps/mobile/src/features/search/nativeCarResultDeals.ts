import type { CarResult } from "../../api/travelApi";
import type { CarOffer } from "../../../../../src/lib/cars/types";
import { getCarDealPickerGroups, getPrimaryCarOffer } from "../../../../../src/lib/cars/carResults";
import { sandboxBookingUrl } from "../../../../../src/services/travel/kayakSandboxPublic";
import { validHttpsBookingUrl } from "./carDetailState";

/**
 * Mirror the web result-card provider picker without inventing offers.
 * Only an actual, safe provider URL can activate a result-card deal action.
 * The standalone result card never navigates to the Cars details page.
 */
export function nativeCarOfferBookingUrl(
  result: Pick<CarResult, "inventorySource">,
  offer?: CarOffer,
): string | null {
  if (!offer?.bookingUrl) return null;
  return result.inventorySource === "kayak-sandbox"
    ? sandboxBookingUrl(offer.bookingUrl)
    : validHttpsBookingUrl(offer.bookingUrl) ? offer.bookingUrl : null;
}

export function nativeCarPrimaryBookingUrl(result: CarResult): string | null {
  const offerUrl = nativeCarOfferBookingUrl(result, getPrimaryCarOffer(result));
  if (offerUrl) return offerUrl;

  // Preserve an explicitly supplied provider action when no offer link exists.
  // Internal-detail routes must never become the result-card CTA.
  const action = result.searchPolicy.action;
  if (action.kind !== "provider") return null;
  return result.inventorySource === "kayak-sandbox"
    ? sandboxBookingUrl(action.href)
    : validHttpsBookingUrl(action.href) ? action.href : null;
}

export function nativeCarResultDealChoices(result: CarResult) {
  return getCarDealPickerGroups(result)
    .filter((group) => Number.isFinite(group.primaryOffer.pricePerDay) && group.primaryOffer.pricePerDay >= 0)
    .slice(0, 3)
    .map((group) => ({
      key: group.key,
      providerName: group.providerName,
      logoUrl: group.logoUrl,
      offer: group.primaryOffer,
      bookingUrl: nativeCarOfferBookingUrl(result, group.primaryOffer),
    }));
}
