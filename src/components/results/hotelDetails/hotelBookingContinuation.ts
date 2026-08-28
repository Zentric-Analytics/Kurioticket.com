import type { HotelDetailsProviderOffer } from "./hotelDetailsPresentation";
import type { HotelAmenityPresentationItem } from "@/components/results/hotelAmenityPresentation";

export type HotelBookingContinuation =
  | { kind: "internal-room-flow" }
  | { kind: "provider-handoff"; providerOfferId: string }
  | { kind: "selection-required" }
  | { kind: "unavailable" };

export function buildKurioticketHotelDetailsProviderOffer({ nightlyPrice, nightlyPriceTitle, nightlyPriceAriaLabel, amenities }: { nightlyPrice: string; nightlyPriceTitle?: string; nightlyPriceAriaLabel?: string; amenities: HotelAmenityPresentationItem[] }): HotelDetailsProviderOffer {
  return { id: "kurioticket", providerName: "Kurioticket", providerLogoUrl: "/brand/kurioticket-logo-primary-light-bg.svg", amenities: amenities.slice(0, 3), nightlyPrice, nightlyPriceTitle, nightlyPriceAriaLabel, action: { kind: "internal-room-flow" } };
}

export function isActionableExternalHotelProviderOffer(offer: HotelDetailsProviderOffer): boolean {
  return offer.action.kind === "provider-handoff" && offer.action.providerOfferId.trim().length > 0;
}

export function isActionableHotelProviderOffer(offer: HotelDetailsProviderOffer, internalRoomFlowAvailable: boolean): boolean {
  return offer.action.kind === "internal-room-flow" ? internalRoomFlowAvailable : isActionableExternalHotelProviderOffer(offer);
}

export function resolveSelectedHotelProviderOfferId({ selectedOfferId, offers, internalRoomFlowAvailable }: { selectedOfferId: string | null; offers: readonly HotelDetailsProviderOffer[]; internalRoomFlowAvailable: boolean }): string | null {
  const actionableOffers = offers.filter((offer) => isActionableHotelProviderOffer(offer, internalRoomFlowAvailable));
  if (selectedOfferId && actionableOffers.some((offer) => offer.id === selectedOfferId)) return selectedOfferId;
  return actionableOffers.length === 1 ? actionableOffers[0].id : null;
}

export function resolveHotelBookingContinuation({ selectedOfferId, offers, internalRoomFlowAvailable }: { selectedOfferId: string | null; offers: readonly HotelDetailsProviderOffer[]; internalRoomFlowAvailable: boolean }): HotelBookingContinuation {
  const actionableOffers = offers.filter((offer) => isActionableHotelProviderOffer(offer, internalRoomFlowAvailable));
  if (actionableOffers.length === 0) return { kind: "unavailable" };
  const selectedOffer = actionableOffers.find((offer) => offer.id === selectedOfferId);
  if (!selectedOffer) return { kind: "selection-required" };
  if (selectedOffer.action.kind === "internal-room-flow") return { kind: "internal-room-flow" };
  return { kind: "provider-handoff", providerOfferId: selectedOffer.action.providerOfferId };
}
