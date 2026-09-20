"use client";

import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Heart,
  Info,
  MapPin,
  Share2,
  Users,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { HotelAmenityPresentationItem } from "@/components/results/hotelAmenityPresentation";
import { HotelPriceComparisonSection } from "./HotelPriceComparisonSection";
import { HotelAboutSection } from "./HotelAboutSection";
import {
  HotelDetailsSectionNav,
  type HotelDetailsTab,
} from "./HotelDetailsSectionNav";
import { HotelReviewsSection } from "./HotelReviewsSection";
import type {
  PublicHotelPropertyDetails,
  PublicHotelResult,
} from "@/lib/types";
import type { PublicHotelProviderDetails } from "@/lib/hotels/hotelProviderDetails";
import { buildHotelAddress } from "@/lib/hotels/hotelMap";
import { HotelDetailsGallery } from "@/components/results/hotelDetails/HotelDetailsGallery";
import { HotelLocationSection } from "@/components/results/hotelDetails/HotelLocationSection";
import { HotelDetailsGoogleMap } from "@/components/results/hotelDetails/HotelDetailsGoogleMap";
import { RelatedHotelsSection } from "@/components/results/hotelDetails/RelatedHotelsSection";
import type { HotelDetailsSearchContext } from "@/components/results/hotelDetails/hotelDetailsPresentation";
import type { HotelDetailsProviderOffer } from "@/components/results/hotelDetails/hotelDetailsPresentation";
import {
  buildKurioticketHotelDetailsProviderOffer,
  isActionableExternalHotelProviderOffer,
  isActionableHotelProviderOffer,
  resolveHotelBookingContinuation,
  resolveSelectedHotelProviderOfferId,
} from "./hotelBookingContinuation";

type DisplayPrice = {
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
};

type GalleryProps = Parameters<typeof HotelDetailsGallery>[0];

export type StandaloneHotelDetailsProps = {
  hotelName: string;
  starRating: number | null;
  starRatingAriaLabel: string;
  locationParts: string[];
  propertyDetails: PublicHotelPropertyDetails | null;
  providerDetails?: PublicHotelProviderDetails | null;
  reviewScore: string;
  reviewLabel: string;
  reviewCountText: string;
  reviewSource?: string | null;
  relatedHotels: PublicHotelResult[];
  relatedSearchContext?: HotelDetailsSearchContext;
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
  onProviderOfferHandoff?: (providerOfferId: string) => void | Promise<void>;
  labels: {
    share: string;
    shared: string;
    map: string;
    streetView: string;
    yourStay: string;
    edit: string;
    continueBooking: string;
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

export function StandaloneHotelDetails(props: StandaloneHotelDetailsProps) {
  const [shareComplete, setShareComplete] = useState(false);
  const [roomsOpen, setRoomsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<HotelDetailsTab>("compare");
  const [pendingProviderOfferId, setPendingProviderOfferId] = useState<string | null>(null);
  const [providerHandoffError, setProviderHandoffError] = useState<string | null>(null);
  const providerHandoffPendingRef = useRef(false);
  const roomOptionsButtonRef = useRef<HTMLButtonElement>(null);
  const roomDialogRef = useRef<HTMLElement>(null);
  const description = props.propertyDetails?.description || "";
  const canonicalAddress = props.propertyDetails
    ? buildHotelAddress(props.propertyDetails)
    : "";
  const providerFacts: ReadonlyArray<readonly [string, string]> = props.providerDetails?.source === "KAYAK"
    ? ([
        props.providerDetails.overview?.address ? ["Address", props.providerDetails.overview.address] : null,
        props.providerDetails.overview?.countryCode ? ["Country code", props.providerDetails.overview.countryCode] : null,
        props.providerDetails.overview?.selfRated !== undefined ? ["Provider self-rated", props.providerDetails.overview.selfRated ? "Yes" : "No"] : null,
        ...(props.providerDetails.overview?.place ?? []).map((fact) => [fact.label, fact.value] as const),
        ...(props.providerDetails.overview?.policies ?? []).map((fact) => [fact.label, fact.value] as const),
        props.providerDetails.reviews?.sentiment ? ["Guest rating sentiment", props.providerDetails.reviews.sentiment] : null,
        ...(props.providerDetails.reviews?.quotes ?? []).map((fact) => [fact.label, fact.value] as const),
        props.providerDetails.rate?.roomName ? ["Room", props.providerDetails.rate.roomName] : null,
        props.providerDetails.rate?.freeCancellation !== undefined ? ["Free cancellation", props.providerDetails.rate.freeCancellation ? "Yes" : "No"] : null,
        props.providerDetails.rate?.payLater !== undefined ? ["Pay later", props.providerDetails.rate.payLater ? "Yes" : "No"] : null,
        props.providerDetails.rate?.bundledRate !== undefined ? ["Bundled rate", props.providerDetails.rate.bundledRate ? "Yes" : "No"] : null,
        ...(props.providerDetails.rate?.rateBreakdown ?? []).map((fact) => [fact.label, fact.value] as const),
        ...(props.providerDetails.rate?.conditions ?? []).map((fact) => [fact.label, fact.value] as const),
      ] as Array<readonly [string, string] | null>).filter((fact): fact is readonly [string, string] => fact !== null && Boolean(fact[1].trim()))
    : [];

  useEffect(() => {
    if (!roomsOpen) return;

    const dialog = roomDialogRef.current;
    const trigger = roomOptionsButtonRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusableSelector =
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusable = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLElement>(focusableSelector) ?? [],
      );
    const focusFrame = window.requestAnimationFrame(() => {
      focusable()[0]?.focus();
    });

    function handleDialogKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setRoomsOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleDialogKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleDialogKeyDown);
      document.body.style.overflow = previousOverflow;
      window.requestAnimationFrame(() => trigger?.focus());
    };
  }, [roomsOpen]);

  async function sharePage() {
    const shareData = { title: props.hotelName, url: window.location.href };
    if (navigator.share) await navigator.share(shareData);
    else await navigator.clipboard.writeText(window.location.href);
    setShareComplete(true);
    window.setTimeout(() => setShareComplete(false), 1800);
  }

  function openRoomOptions(trigger: HTMLButtonElement) {
    roomOptionsButtonRef.current = trigger;
    setRoomsOpen(true);
  }

  const internalRoomFlowAvailable = props.roomChoices.length > 0;
  const kurioticketOffer = buildKurioticketHotelDetailsProviderOffer({
    nightlyPrice: props.nightlyDisplayPrice?.formatted || props.labels.priceUnavailable,
    nightlyPriceTitle: props.nightlyDisplayPrice?.title,
    nightlyPriceAriaLabel: props.nightlyDisplayPrice?.ariaLabel,
    amenities: props.amenityItems,
  });
  const externalProviderOffers = props.onProviderOfferHandoff
    ? (props.providerOffers ?? []).filter(isActionableExternalHotelProviderOffer)
    : [];
  const providerOffers = [kurioticketOffer, ...externalProviderOffers];
  const selectableProviderOfferIds = new Set(
    providerOffers
      .filter((offer) => isActionableHotelProviderOffer(offer, internalRoomFlowAvailable))
      .map((offer) => offer.id),
  );
  const selectableProviderOfferIdKey = [...selectableProviderOfferIds].join("\u0000");
  const [selectedProviderOfferId, setSelectedProviderOfferId] = useState<string | null>(() =>
    resolveSelectedHotelProviderOfferId({
      selectedOfferId: null,
      offers: providerOffers,
      internalRoomFlowAvailable,
    }),
  );
  const [selectionOfferKey, setSelectionOfferKey] = useState(selectableProviderOfferIdKey);
  if (selectionOfferKey !== selectableProviderOfferIdKey) {
    setSelectionOfferKey(selectableProviderOfferIdKey);
    setSelectedProviderOfferId((current) =>
      resolveSelectedHotelProviderOfferId({
        selectedOfferId: current,
        offers: providerOffers,
        internalRoomFlowAvailable,
      }),
    );
  }

  const bookingContinuation = resolveHotelBookingContinuation({
    selectedOfferId: selectedProviderOfferId,
    offers: providerOffers,
    internalRoomFlowAvailable,
  });

  function focusComparePrices(targetId = "hotel-compare-heading") {
    setActiveTab("compare");
    window.requestAnimationFrame(() => {
      const target = document.getElementById(targetId);
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      target?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      target?.focus({ preventScroll: true });
    });
  }

  async function runProviderOfferHandoff(providerOfferId: string) {
    if (providerHandoffPendingRef.current || !props.onProviderOfferHandoff) return;
    providerHandoffPendingRef.current = true;
    setPendingProviderOfferId(providerOfferId);
    setProviderHandoffError(null);
    try {
      await props.onProviderOfferHandoff(providerOfferId);
    } catch {
      setProviderHandoffError("We couldn't open this provider offer. Please try again.");
      focusComparePrices("hotel-provider-handoff-error");
    } finally {
      providerHandoffPendingRef.current = false;
      setPendingProviderOfferId(null);
    }
  }

  function continueBooking(trigger: HTMLButtonElement) {
    if (bookingContinuation.kind === "internal-room-flow") {
      openRoomOptions(trigger);
    } else if (bookingContinuation.kind === "provider-handoff") {
      void runProviderOfferHandoff(bookingContinuation.providerOfferId);
    }
  }

  return (
    <div
      className="min-w-0 pb-[calc(8.5rem+env(safe-area-inset-bottom))] lg:pb-0"
      data-standalone-hotel-details
      data-mobile-web-hotel-details
    >
      <div
        className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_334px] lg:items-stretch lg:gap-7"
        data-standalone-hotel-main-grid
      >
        <div className="min-w-0">
          <article className="flex min-w-0 flex-col bg-white lg:rounded-[17px] lg:border lg:border-slate-200/80 lg:p-6 lg:shadow-[0_5px_24px_rgba(15,23,42,0.045)]">
            <div className="relative order-1 lg:order-2" data-mobile-hotel-hero-shell>
              <HotelDetailsGallery
                {...props.galleryProps}
                embedded
                layout="mosaic"
              />
              <div
                className="pointer-events-none absolute inset-x-0 top-3 z-40 flex items-center justify-between px-3 lg:hidden"
                data-mobile-hotel-hero-actions
              >
                <Link
                  href={props.resultsHref}
                  aria-label="Back to hotel results"
                  className="focus-ring pointer-events-auto inline-flex size-11 items-center justify-center rounded-full border border-white/70 bg-white/95 text-slate-900 shadow-[0_3px_14px_rgba(15,23,42,0.18)] backdrop-blur"
                >
                  <ArrowLeft className="h-5 w-5" strokeWidth={2.2} aria-hidden="true" />
                </Link>
                <div className="pointer-events-auto flex h-11 items-center rounded-full border border-white/70 bg-white/95 shadow-[0_3px_14px_rgba(15,23,42,0.18)] backdrop-blur">
                  <button
                    type="button"
                    aria-pressed={props.isSaved}
                    aria-label={props.savedHotelLabel}
                    onClick={props.onSave}
                    className="focus-ring inline-flex size-11 items-center justify-center rounded-full text-slate-900 hover:bg-slate-100/80"
                  >
                    <Heart
                      className="h-5 w-5"
                      fill={props.isSaved ? "currentColor" : "none"}
                      aria-hidden="true"
                    />
                  </button>
                  <button
                    type="button"
                    aria-label={props.labels.share}
                    onClick={() => void sharePage()}
                    className="focus-ring inline-flex size-11 items-center justify-center rounded-full text-slate-900 hover:bg-slate-100/80"
                  >
                    <Share2 className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>

            <header className="order-2 px-4 pb-2 pt-3 lg:order-1 lg:mb-4 lg:px-0 lg:py-0" data-mobile-property-header>
              <div className="grid min-w-0 grid-cols-1 items-start gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-col items-start gap-y-1.5 lg:flex-row lg:flex-wrap lg:items-center lg:gap-x-4">
                    <h1 className="min-w-0 break-words text-[24px] font-extrabold leading-[30px] tracking-[-0.025em] text-slate-950 lg:text-[30px] lg:leading-tight">
                      {props.hotelName}
                    </h1>
                    {props.starRating ? (
                      <span
                        aria-label={props.starRatingAriaLabel}
                        className="hidden whitespace-nowrap text-[15px] tracking-[0.08em] text-amber-500 lg:inline"
                      >
                        <span aria-hidden="true">
                          {"★".repeat(props.starRating)}
                        </span>
                      </span>
                    ) : null}
                  </div>
                  {props.locationParts.length ? (
                    <p className="mt-2 hidden flex-wrap items-center gap-x-2 text-[13px] font-medium text-slate-600 lg:flex">
                      <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                      {props.locationParts.map((part, index) => (
                        <span key={part}>
                          {index ? <span aria-hidden="true"> · </span> : null}
                          {part}
                        </span>
                      ))}
                    </p>
                  ) : null}
                  {canonicalAddress ? (
                    <div
                      className={`mt-1 hidden min-w-0 text-xs leading-5 text-slate-600 lg:flex ${props.locationParts.length ? "ps-6" : "items-start gap-2"}`}
                      data-desktop-hotel-address-row
                    >
                      {!props.locationParts.length ? (
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                      ) : null}
                      <p className="min-w-0 break-words" title={canonicalAddress}>
                        {canonicalAddress}
                      </p>
                    </div>
                  ) : null}
                  {props.reviewScore ? (
                    <div
                      className="mt-2 hidden items-center gap-2 lg:flex"
                      data-hotel-review-identity
                    >
                      <span
                        className="flex size-10 items-center justify-center rounded-md bg-blue text-lg font-extrabold text-white"
                        aria-label={`${props.reviewScore}, ${props.reviewLabel}`}
                      >
                        {props.reviewScore}
                      </span>
                      <span className="hidden text-xs sm:block">
                        <strong className="block text-slate-950">{props.reviewLabel}</strong>
                        <span className="text-slate-600">{props.reviewCountText}</span>
                      </span>
                    </div>
                  ) : null}

                  <div
                    className="mt-1.5 space-y-1.5 lg:hidden"
                    data-mobile-hotel-identity
                    data-mobile-property-metadata
                  >
                    {props.starRating ? (
                      <div
                        aria-label={props.starRatingAriaLabel}
                        className="flex min-h-5 items-center text-[18px] leading-5 tracking-[0.08em] text-amber-500"
                        data-mobile-hotel-classification-stars
                      >
                        <span aria-hidden="true">{"★".repeat(props.starRating)}</span>
                      </div>
                    ) : null}
                    {props.reviewScore ? (
                      <div className="flex min-w-0 items-center gap-2 text-[14px] leading-5 text-slate-700" data-mobile-hotel-review-summary>
                        <span className="font-bold text-slate-950">{props.reviewScore}</span>
                        <span className="min-w-0 truncate">
                          <strong className="font-bold text-slate-950">{props.reviewLabel}</strong>
                          {props.reviewCountText ? <span className="font-medium text-slate-600"> · {props.reviewCountText}</span> : null}
                        </span>
                      </div>
                    ) : null}
                    {canonicalAddress ? (
                      <div
                        className="grid min-w-0 grid-cols-[1rem_minmax(0,1fr)] items-start gap-x-1.5 text-[13px] font-semibold leading-5 text-slate-700"
                        data-mobile-hotel-address-row
                      >
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" data-mobile-hotel-address-icon />
                        <p className="min-w-0 line-clamp-2" title={canonicalAddress}>{canonicalAddress}</p>
                      </div>
                    ) : null}
                    {props.staySummary ? (
                      <div className="grid gap-1">
                        <div
                          className="flex min-w-0 items-center gap-1.5 text-[13px] font-semibold leading-5 text-slate-700"
                          data-mobile-hotel-stay-dates
                        >
                          <CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />
                          <span>{props.staySummary.dateText} · {props.staySummary.nightText}</span>
                        </div>
                        <div
                          className="flex min-w-0 items-center gap-1.5 text-[13px] font-semibold leading-5 text-slate-700"
                          data-mobile-hotel-stay-guests
                        >
                          <Users className="h-4 w-4 shrink-0" aria-hidden="true" />
                          <span>{props.staySummary.occupancyText}</span>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="hidden shrink-0 gap-3 lg:flex" data-property-header-actions>
                  <button
                    type="button"
                    aria-pressed={props.isSaved}
                    aria-label={props.savedHotelLabel}
                    onClick={props.onSave}
                    className="focus-ring inline-flex h-10 w-auto items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                  >
                    <Heart className="h-5 w-5" fill={props.isSaved ? "currentColor" : "none"} aria-hidden="true" />
                    <span>{props.saveText}</span>
                  </button>
                  <button
                    type="button"
                    aria-label={props.labels.share}
                    onClick={() => void sharePage()}
                    className="focus-ring inline-flex h-10 w-auto items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                  >
                    <Share2 className="h-5 w-5" aria-hidden="true" />
                    <span>{shareComplete ? props.labels.shared : props.labels.share}</span>
                  </button>
                </div>
              </div>
            </header>

            <HotelDetailsSectionNav
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />

            <div
              className="order-4"
              id={`hotel-${activeTab}-panel`}
              role="tabpanel"
              aria-labelledby={`hotel-${activeTab}-tab`}
              tabIndex={0}
              data-hotel-details-active-panel={activeTab}
            >
              {activeTab === "compare" ? (
                <>
                  <HotelPriceComparisonSection
                    stayContext={props.staySummary ? `${props.staySummary.dateText} · ${props.staySummary.occupancyText}` : undefined}
                    perNightText={props.perNightText}
                    offers={providerOffers}
                    selectedOfferId={selectedProviderOfferId}
                    selectableOfferIds={selectableProviderOfferIds}
                    providerHandoffError={providerHandoffError}
                    onSelectOffer={setSelectedProviderOfferId}
                  />
                  <div className="hidden lg:block">
                    <RelatedHotelsSection
                      hotels={props.relatedHotels}
                      city={props.propertyDetails?.city || ""}
                      searchContext={props.relatedSearchContext}
                      labels={{
                      heading: props.labels.moreHotelsIn,
                      viewHotel: props.labels.viewHotel,
                      pricePerNight: props.labels.pricePerNight,
                      estimatedStayTotal: props.labels.estimatedStayTotal,
                      priceUnavailable: props.labels.priceUnavailable,
                      imageUnavailable: props.labels.imageUnavailable,
                      imageAlt: props.labels.imageAlt,
                      nearLocation: props.labels.nearLocation,
                      starHotelAria: props.labels.starHotelAria,
                    }}
                    />
                  </div>
                </>
              ) : null}

              {activeTab === "about" ? (
                <>
                  <HotelAboutSection
                    description={description}
                    amenities={props.amenityItems}
                    starRating={props.starRating}
                    propertyType={props.propertyDetails?.propertyType}
                    roomSummary={props.propertyDetails?.roomSummary}
                    bedSummary={props.propertyDetails?.bedSummary}
                    accessibility={props.propertyDetails?.accessibility}
                    mobileAfterDescription={
                      props.propertyDetails ? (
                        <HotelLocationSection
                          hotelName={props.hotelName}
                          propertyDetails={props.propertyDetails}
                          locationLabel="Location"
                          mapLabel={props.labels.map}
                          streetViewLabel={props.labels.streetView}
                          stayFitFacts={[
                            props.propertyDetails.neighbourhood ? `${props.propertyDetails.neighbourhood} neighborhood` : "",
                            props.propertyDetails.businessSuitable ? "Work-friendly property" : "",
                            props.propertyDetails.familySuitable ? "Family-friendly" : "",
                            props.propertyDetails.interestTags?.some((tag) => /sightseeing|culture|history|art|theatre/i.test(tag)) ? "Good for sightseeing" : "",
                            props.propertyDetails.accessibility?.length ? "Accessibility details available" : "",
                          ].filter(Boolean)}
                          accessibilityDetails={props.propertyDetails.accessibility}
                        />
                      ) : (
                        <section className="border-b border-slate-200 px-4 py-5" aria-labelledby="hotel-overview-location-heading">
                          <h2 id="hotel-overview-location-heading" className="text-[17px] font-bold text-slate-950">Location</h2>
                          <p className="mt-2 text-[13px] leading-5 text-slate-600">Verified location details are not available for this property yet.</p>
                        </section>
                      )
                    }
                  />
                  {providerFacts.length ? (
                    <section className="hidden border-b border-slate-200 px-4 py-8 lg:block lg:px-0 lg:py-10" aria-labelledby="provider-details-heading" data-provider-hotel-details>
                      <h2 id="provider-details-heading" className="text-xl font-extrabold text-slate-950">KAYAK-provided details</h2>
                      <p className="mt-2 text-sm text-slate-600">Information supplied for this exact sandbox offer.</p>
                      <dl className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2">
                        {providerFacts.map(([label, value], index) => (
                          <div key={`${label}-${value}-${index}`} className="min-w-0">
                            <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</dt>
                            <dd className="mt-1 break-words text-sm font-medium leading-6 text-slate-900">{value}</dd>
                          </div>
                        ))}
                      </dl>
                    </section>
                  ) : null}
                  {providerFacts.length ? (
                    <section className="border-b border-slate-200 px-4 py-3 lg:hidden" data-mobile-provider-hotel-details>
                      <details>
                        <summary className="focus-ring inline-flex min-h-11 cursor-pointer list-none items-center text-[14px] font-semibold text-blue [&::-webkit-details-marker]:hidden">
                          Provider details
                        </summary>
                        <dl className="space-y-3 pb-2">
                          {providerFacts.map(([label, value], index) => (
                            <div key={`mobile-${label}-${value}-${index}`} className="min-w-0">
                              <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</dt>
                              <dd className="mt-0.5 break-words text-[13px] font-medium leading-5 text-slate-800">{value}</dd>
                            </div>
                          ))}
                        </dl>
                      </details>
                    </section>
                  ) : null}

                  <div className="lg:hidden" data-hotel-mobile-overview-related>
                    <RelatedHotelsSection
                      hotels={props.relatedHotels}
                      city={props.propertyDetails?.city || ""}
                      searchContext={props.relatedSearchContext}
                      labels={{
                      heading: props.labels.moreHotelsIn,
                      viewHotel: props.labels.viewHotel,
                      pricePerNight: props.labels.pricePerNight,
                      estimatedStayTotal: props.labels.estimatedStayTotal,
                      priceUnavailable: props.labels.priceUnavailable,
                      imageUnavailable: props.labels.imageUnavailable,
                      imageAlt: props.labels.imageAlt,
                      nearLocation: props.labels.nearLocation,
                      starHotelAria: props.labels.starHotelAria,
                    }}
                    />
                  </div>
                </>
              ) : null}

              {activeTab === "reviews" ? (
                <HotelReviewsSection
                  score={props.reviewScore}
                  label={props.reviewLabel}
                  countText={props.reviewCountText}
                  source={props.reviewSource}
                />
              ) : null}

              {activeTab === "location" ? props.propertyDetails ? (
                <HotelLocationSection
                  hotelName={props.hotelName}
                  propertyDetails={props.propertyDetails}
                  locationLabel="Location & stay fit"
                  mapLabel={props.labels.map}
                  streetViewLabel={props.labels.streetView}
                  stayFitFacts={[
                    props.propertyDetails.neighbourhood ? `${props.propertyDetails.neighbourhood} neighborhood` : "",
                    props.propertyDetails.businessSuitable ? "Work-friendly property" : "",
                    props.propertyDetails.familySuitable ? "Family-friendly" : "",
                    props.propertyDetails.interestTags?.some((tag) => /sightseeing|culture|history|art|theatre/i.test(tag)) ? "Good for sightseeing" : "",
                    props.propertyDetails.accessibility?.length ? "Accessibility details available" : "",
                  ].filter(Boolean)}
                  accessibilityDetails={props.propertyDetails.accessibility}
                />
              ) : (
                <section className="border-b border-slate-200 px-4 py-8 lg:px-0 lg:py-10" aria-labelledby="hotel-location-heading"><h2 id="hotel-location-heading" className="text-xl font-extrabold text-slate-950">Location &amp; stay fit</h2><p className="mt-3 text-sm text-slate-600">Verified location details are not available for this property yet.</p></section>
              ) : null}
            </div>
          </article>
        </div>

        <aside
          className="hidden min-w-0 lg:flex lg:flex-col"
          data-standalone-stay-summary
        >
          <section
            className="rounded-[17px] border border-slate-200/80 bg-white p-5 shadow-[0_5px_24px_rgba(15,23,42,0.045)] sm:p-6"
            aria-labelledby="your-stay-heading"
          >
            <h2
              id="your-stay-heading"
              className="text-xl font-extrabold text-slate-950"
            >
              {props.labels.yourStay}
            </h2>
            {props.staySummary ? (
              <div className="mt-5 space-y-5">
                <div className="flex gap-3">
                  <CalendarDays
                    className="mt-0.5 h-[18px] w-[18px] shrink-0 text-slate-700"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-[13px] font-semibold leading-5 text-slate-800">
                      {props.staySummary.dateText}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {props.staySummary.nightText}
                    </p>
                  </div>
                </div>
                <div className="flex min-h-11 items-center gap-3">
                  <Users
                    className="h-[18px] w-[18px] shrink-0 text-slate-700"
                    aria-hidden="true"
                  />
                  <p className="min-w-0 flex-1 text-[13px] font-semibold text-slate-800">
                    {props.staySummary.occupancyText}
                  </p>
                  <a
                    href={props.resultsHref}
                    className="focus-ring inline-flex min-h-11 items-center text-xs font-bold text-blue hover:underline"
                  >
                    {props.labels.edit}
                  </a>
                </div>
              </div>
            ) : null}
            <div className="my-5 border-t border-slate-200" />
            <p className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-600">
              {props.estimatedTotalText}
              <Info className="h-3.5 w-3.5" aria-hidden="true" />
            </p>
            {props.totalDisplayPrice && props.nightlyDisplayPrice ? (
              <>
                <p
                  className="mt-1.5 text-[36px] font-extrabold leading-tight tracking-[-0.025em] text-slate-950"
                  dir="ltr"
                  title={props.totalDisplayPrice.title}
                  aria-label={props.totalDisplayPrice.ariaLabel}
                >
                  {props.totalDisplayPrice.formatted}
                </p>
                <p
                  className="mt-2 text-[13px] font-semibold text-slate-600"
                  title={props.nightlyDisplayPrice.title}
                >
                  {props.perNightText.replace(
                    "{{price}}",
                    props.nightlyDisplayPrice.formatted,
                  )}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {props.taxesText || props.planningPriceText}
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm font-semibold text-slate-700">
                {props.planningPriceText}
              </p>
            )}
            <button
              type="button"
              disabled={bookingContinuation.kind === "unavailable" || bookingContinuation.kind === "selection-required" || pendingProviderOfferId !== null}
              onClick={(event) => continueBooking(event.currentTarget)}
              className="focus-ring mt-6 flex h-12 w-full items-center justify-center rounded-lg bg-blue px-4 text-sm font-bold text-white hover:bg-blue-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {props.labels.continueBooking}
            </button>
          </section>
          {activeTab === "compare" && props.propertyDetails ? (
            <div className="min-h-0 flex-1 pt-6" data-hotel-desktop-map>
              <HotelDetailsGoogleMap
                hotelName={props.hotelName}
                propertyDetails={props.propertyDetails}
                fillHeight
              />
            </div>
          ) : null}
        </aside>
      </div>

      <section
        className="fixed inset-x-0 bottom-0 z-[90] rounded-t-[22px] border-t border-slate-200 bg-white px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-8px_28px_rgba(15,23,42,0.14)] lg:hidden"
        data-mobile-hotel-stay-dock
      >
        <div className="mx-auto grid max-w-3xl grid-cols-[minmax(0,1fr)_minmax(132px,0.9fr)] items-center gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1 text-[12px] font-semibold leading-4 text-slate-600">
              {props.estimatedTotalText}
              <Info className="h-3 w-3" aria-hidden="true" />
            </p>
            {props.totalDisplayPrice ? (
              <p
                className="text-[clamp(1.25rem,6vw,1.5rem)] font-extrabold leading-tight text-slate-950"
                title={props.totalDisplayPrice.title}
                aria-label={props.totalDisplayPrice.ariaLabel}
              >
                {props.totalDisplayPrice.formatted}
              </p>
            ) : (
              <p className="text-sm font-bold text-slate-700">
                {props.labels.priceUnavailable}
              </p>
            )}
            {props.nightlyDisplayPrice ? (
              <p
                className="text-[12px] leading-4 text-slate-600"
                title={props.nightlyDisplayPrice.title}
              >
                {props.perNightText.replace(
                  "{{price}}",
                  props.nightlyDisplayPrice.formatted,
                )}
              </p>
            ) : null}
          </div>
          <div>
            <button
              type="button"
              disabled={bookingContinuation.kind === "unavailable" || bookingContinuation.kind === "selection-required" || pendingProviderOfferId !== null}
              onClick={(event) => continueBooking(event.currentTarget)}
              className="focus-ring min-h-12 w-full rounded-lg bg-blue px-3 text-[13px] font-bold leading-[18px] text-white disabled:opacity-50"
            >
              {props.labels.continueBooking}
            </button>
          </div>
        </div>
      </section>

      {roomsOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4"
          role="presentation"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) setRoomsOpen(false);
          }}
        >
          <section
            ref={roomDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="room-options-title"
            className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="room-options-title"
                  className="text-xl font-extrabold text-slate-950"
                >
                  {props.labels.roomTitle}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {props.planningPriceText}
                </p>
              </div>
              <button
                type="button"
                aria-label={props.labels.closeRooms}
                onClick={() => setRoomsOpen(false)}
                className="focus-ring rounded-lg p-2 hover:bg-slate-100"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-5 space-y-3">
              {props.roomChoices.map((room) => (
                <article
                  key={room.id}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-slate-950">{room.name}</h3>
                      <p className="mt-1 text-sm text-slate-600">
                        {room.details}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-bold text-slate-950">{room.total}</p>
                      <p className="text-xs text-slate-500">{room.nightly}</p>
                    </div>
                  </div>
                  <p className="mt-3 flex items-center gap-2 text-xs text-slate-600">
                    <Check
                      className="h-4 w-4 text-emerald-600"
                      aria-hidden="true"
                    />
                    {props.labels.roomTerms}
                  </p>
                </article>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
