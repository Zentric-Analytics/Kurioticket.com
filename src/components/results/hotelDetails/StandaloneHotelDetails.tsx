"use client";

import { useSyncExternalStore } from "react";
import { MobileHotelDetails } from "./MobileHotelDetails";
import { DesktopHotelDetails } from "./DesktopHotelDetails";
import type { HotelAmenityPresentationItem } from "@/components/results/hotelAmenityPresentation";
import type { HotelSearchParams, PublicHotelPropertyDetails, PublicHotelResult } from "@/lib/types";
import type { PublicHotelProviderDetails } from "@/lib/hotels/hotelProviderDetails";
import type { HotelDetailsGallery } from "./HotelDetailsGallery";
import type { HotelDetailsSearchContext, HotelDetailsProviderOffer } from "./hotelDetailsPresentation";
type DisplayPrice = {
  amount?: number;
  currency?: string;
  formatted: string;
  title?: string;
  ariaLabel: string;
  providerFormatted: string;
  isConvertedEstimate: boolean;
};

type RoomChoice = {
  id: string;
  name: string;
  details: string;
  nightly: string;
  total: string;
  cancellationInfo?: string;
};

type GalleryProps = Parameters<typeof HotelDetailsGallery>[0];

export type StandaloneHotelDetailsProps = {
  locationIsSimulated?: boolean;
  hotelName: string;
  starRating: number | null;
  starRatingAriaLabel: string;
  locationParts: string[];
  propertyDetails: PublicHotelPropertyDetails | null;
  locationDetails?: PublicHotelPropertyDetails | null;
  providerDetails?: PublicHotelProviderDetails | null;
  reviewScore: string;
  mobileReviewScale?: number | null;
  reviewLabel: string;
  reviewCountText: string;
  reviewSource?: string | null;
  relatedHotels: PublicHotelResult[];
  relatedSearchContext?: HotelDetailsSearchContext;
  priceAlert?: { search: HotelSearchParams; hotel: PublicHotelResult };
  amenityItems: HotelAmenityPresentationItem[];
  isSaved: boolean;
  savedHotelLabel: string;
  saveText: string;
  onSave: () => void;
  resultsHref: string;
  staySummary: {
    dateText: string;
    occupancyText: string;
    nightText: string;
  } | null;
  totalDisplayPrice: DisplayPrice | null;
  nightlyDisplayPrice: DisplayPrice | null;
  estimatedTotalText: string;
  perNightText: string;
  taxesText: string;
  planningPriceText: string;
  roomChoices: RoomChoice[];
  galleryProps: GalleryProps;
  providerOffers?: HotelDetailsProviderOffer[];
  onProviderOfferHandoff?: (providerOfferId: string, targetWindow?: Window | null) => void | Promise<void>;
  mobileProviderOffer?: HotelDetailsProviderOffer;
  onMobileProviderHandoff?: () => Promise<void>;
  labels: {
    backToResults: string;
    share: string;
    shared: string;
    map: string;
    streetView: string;
    yourStay: string;
    edit: string;
    continueBooking: string;
    viewDeal: string;
    roomTitle: string;
    closeRooms: string;
    roomTerms: string;
    moreHotelsIn: string;
    viewHotel: string;
    pricePerNight: string;
    estimatedStayTotal: string;
    priceUnavailable: string;
    imageUnavailable: string;
    imageAlt: string;
    nearLocation: string;
    starHotelAria: string;
  };
};

function subscribeMobileDetails(callback: () => void) {
  const query = window.matchMedia("(max-width: 1023px)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

export function StandaloneHotelDetails(props: StandaloneHotelDetailsProps) {
  const mobile = useSyncExternalStore(subscribeMobileDetails, () => window.matchMedia("(max-width: 1023px)").matches, () => false);
  return <>
    {props.locationIsSimulated ? <p data-hotel-test-location role="note" className="mx-4 my-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Provider test location: the supplied address and coordinates may be synthetic. They are not verified for travel; maps and directions are unavailable for this test offer.</p> : null}
    {mobile ? <MobileHotelDetails {...props} /> : <DesktopHotelDetails {...props} />}
  </>;
}
