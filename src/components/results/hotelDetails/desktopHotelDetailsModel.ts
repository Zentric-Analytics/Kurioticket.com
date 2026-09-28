import type { HotelDetailsProviderOffer } from "./hotelDetailsPresentation";

/** Price and provider always travel together; never borrow a total from another offer. */
export function desktopHotelOfferPrice(offer: HotelDetailsProviderOffer | undefined, totalLabel: string, nightlyLabel: string) {
  if (!offer) return null;
  return {
    amount: offer.totalPrice || offer.nightlyPrice,
    basis: offer.totalPrice ? totalLabel : nightlyLabel.replace("{{price}}", "").trim(),
    provider: offer.providerName,
    title: offer.totalPrice ? undefined : offer.nightlyPriceTitle,
    ariaLabel: offer.totalPrice ? undefined : offer.nightlyPriceAriaLabel,
    terms: offer.taxesAndFeesLabel,
  };
}

export function desktopHotelReviewScore(score: string, scale?: number | null) {
  if (!score || score.includes("/") || !scale) return score;
  return `${score} / ${scale}`;
}
