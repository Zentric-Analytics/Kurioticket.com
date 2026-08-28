import type { HotelDetailsProviderOffer } from "./hotelDetailsPresentation";
import type { HotelAmenityPresentationItem } from "@/components/results/hotelAmenityPresentation";

export type HotelBookingContinuation =
  | { kind: "internal-room-flow" }
  | { kind: "provider-handoff"; providerOfferId: string }
  | { kind: "compare-prices" }
  | { kind: "unavailable" };

export function buildKurioticketHotelDetailsProviderOffer({
  nightlyPrice,
  nightlyPriceTitle,
  nightlyPriceAriaLabel,
  amenities,
}: {
  nightlyPrice: string;
  nightlyPriceTitle?: string;
  nightlyPriceAriaLabel?: string;
  amenities: HotelAmenityPresentationItem[];
}): HotelDetailsProviderOffer {
  return {
    id: "kurioticket",
    providerName: "Kurioticket",
    providerLogoUrl: "/brand/kurioticket-logo-primary-light-bg.svg",
    amenities: amenities.slice(0, 3),
    nightlyPrice,
    nightlyPriceTitle,
    nightlyPriceAriaLabel,
    action: { kind: "internal-room-flow" },
  };
}

export function isActionableExternalHotelProviderOffer(
  offer: HotelDetailsProviderOffer,
): boolean {
  return (
    offer.action.kind === "provider-handoff" &&
    offer.action.providerOfferId.trim().length > 0
  );
}

export function resolveHotelBookingContinuation(
  offers: readonly HotelDetailsProviderOffer[],
  internalRoomFlowAvailable: boolean,
): HotelBookingContinuation {
  const externalOffers = offers.filter(isActionableExternalHotelProviderOffer);

  if (externalOffers.length === 1) {
    const action = externalOffers[0].action;
    if (action.kind === "provider-handoff") {
      return { kind: "provider-handoff", providerOfferId: action.providerOfferId };
    }
  }
  if (externalOffers.length > 1) return { kind: "compare-prices" };
  if (internalRoomFlowAvailable) return { kind: "internal-room-flow" };
  return { kind: "unavailable" };
}
