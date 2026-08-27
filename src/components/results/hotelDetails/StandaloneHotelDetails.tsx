"use client";

import {
  Award,
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
import { HotelDetailsSectionNav } from "./HotelDetailsSectionNav";
import { HotelReviewsSection } from "./HotelReviewsSection";
import type {
  PublicHotelPropertyDetails,
  PublicHotelResult,
} from "@/lib/types";
import {
  buildHotelAddress,
  buildHotelDirectionsUrl,
} from "@/lib/hotels/hotelMap";
import { HotelDetailsGallery } from "@/components/results/hotelDetails/HotelDetailsGallery";
import { HotelLocationSection } from "@/components/results/hotelDetails/HotelLocationSection";
import { RelatedHotelsSection } from "@/components/results/hotelDetails/RelatedHotelsSection";
import type { HotelDetailsSearchContext } from "@/components/results/hotelDetails/hotelDetailsPresentation";

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
  labels: {
    share: string;
    shared: string;
    directions: string;
    map: string;
    streetView: string;
    yourStay: string;
    edit: string;
    viewRooms: string;
    roomSupport: string;
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
  const roomOptionsButtonRef = useRef<HTMLButtonElement>(null);
  const roomDialogRef = useRef<HTMLElement>(null);
  const description = props.propertyDetails?.description || "";
  const canonicalAddress = props.propertyDetails
    ? buildHotelAddress(props.propertyDetails)
    : "";
  const directionsUrl = props.propertyDetails
    ? buildHotelDirectionsUrl({
        hotelName: props.hotelName,
        propertyDetails: props.propertyDetails,
      })
    : null;

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

  return (
    <div
      className="min-w-0 pb-[calc(8.5rem+env(safe-area-inset-bottom))] lg:pb-0"
      data-standalone-hotel-details
    >
      <div
        className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_334px] lg:items-start lg:gap-7"
        data-standalone-hotel-main-grid
      >
        <div className="min-w-0">
          <article className="min-w-0 bg-white lg:rounded-[17px] lg:border lg:border-slate-200/80 lg:p-6 lg:shadow-[0_5px_24px_rgba(15,23,42,0.045)]">
            <header className="mb-4 px-4 lg:px-0" data-mobile-property-header>
              <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-col items-start gap-y-1.5 lg:flex-row lg:flex-wrap lg:items-center lg:gap-x-4">
                    <h1 className="min-w-0 break-words text-[22px] font-extrabold leading-tight tracking-[-0.025em] text-slate-950 lg:text-[30px]">
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
                      className="mt-1 hidden min-w-0 items-center gap-3 text-xs leading-5 text-slate-600 lg:flex"
                      data-desktop-hotel-address-row
                    >
                      <p
                        className="min-w-0 flex-1 truncate"
                        title={canonicalAddress}
                      >
                        {canonicalAddress}
                      </p>
                      {directionsUrl ? (
                        <a
                          href={directionsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Show directions to ${props.hotelName}`}
                          className="focus-ring inline-flex min-h-11 shrink-0 items-center font-bold text-blue hover:underline"
                        >
                          Show directions
                        </a>
                      ) : null}
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
                        <strong className="block text-slate-950">
                          {props.reviewLabel}
                        </strong>
                        <span className="text-slate-600">
                          {props.reviewCountText}
                        </span>
                      </span>
                    </div>
                  ) : null}
                  <div
                    className="mt-2 space-y-1 lg:hidden"
                    data-mobile-hotel-identity
                    data-mobile-property-metadata
                  >
                    {props.staySummary ? (
                      <>
                        <div
                          className="flex min-w-0 items-center gap-1.5 text-xs font-semibold leading-5 text-slate-700"
                          data-mobile-hotel-stay-dates
                        >
                          <CalendarDays
                            className="h-4 w-4 shrink-0"
                            aria-hidden="true"
                          />
                          <span>
                            {props.staySummary.dateText} ·{" "}
                            {props.staySummary.nightText}
                          </span>
                        </div>
                        <div
                          className="flex min-w-0 items-center gap-1.5 text-xs font-semibold leading-5 text-slate-700"
                          data-mobile-hotel-stay-guests
                        >
                          <Users
                            className="h-4 w-4 shrink-0"
                            aria-hidden="true"
                          />
                          <span>{props.staySummary.occupancyText}</span>
                        </div>
                      </>
                    ) : null}
                    {canonicalAddress ? (
                      <div
                        className="grid min-w-0 grid-cols-[1rem_minmax(0,1fr)] items-start gap-x-1.5 text-xs font-semibold leading-5 text-slate-700"
                        data-mobile-hotel-address-row
                      >
                        <MapPin
                          className="mt-0.5 h-4 w-4 shrink-0"
                          aria-hidden="true"
                          data-mobile-hotel-address-icon
                        />
                        <p
                          className="min-w-0 break-words"
                          title={canonicalAddress}
                        >
                          {canonicalAddress}
                        </p>
                      </div>
                    ) : null}
                    {props.starRating ? (
                      <div
                        aria-label={props.starRatingAriaLabel}
                        className="flex min-h-5 items-center gap-1.5 text-[15px] tracking-[0.08em] text-amber-500"
                        data-mobile-hotel-classification-stars
                      >
                        <Award
                          className="h-4 w-4 shrink-0 text-slate-500"
                          aria-hidden="true"
                          data-mobile-hotel-classification-icon
                        />
                        <span className="text-amber-500" aria-hidden="true">
                          {"★".repeat(props.starRating)}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>
                <div
                  className="flex shrink-0 gap-0 lg:gap-3"
                  data-property-header-actions
                >
                  <button
                    type="button"
                    aria-pressed={props.isSaved}
                    aria-label={props.savedHotelLabel}
                    onClick={props.onSave}
                    className="focus-ring inline-flex size-11 items-center justify-end gap-2 rounded-lg border-0 bg-transparent pe-1 text-sm font-semibold text-slate-900 hover:bg-slate-100 lg:h-10 lg:w-auto lg:justify-center lg:border lg:border-slate-200 lg:bg-white lg:px-3.5 lg:hover:bg-slate-50"
                  >
                    <Heart
                      className="h-5 w-5"
                      fill={props.isSaved ? "currentColor" : "none"}
                      aria-hidden="true"
                    />
                    <span className="hidden lg:inline">{props.saveText}</span>
                  </button>
                  <button
                    type="button"
                    aria-label={props.labels.share}
                    onClick={() => void sharePage()}
                    className="focus-ring inline-flex size-11 items-center justify-start gap-2 rounded-lg border-0 bg-transparent ps-1 text-sm font-semibold text-slate-900 hover:bg-slate-100 lg:h-10 lg:w-auto lg:justify-center lg:border lg:border-slate-200 lg:bg-white lg:px-3.5 lg:hover:bg-slate-50"
                  >
                    <Share2 className="h-5 w-5" aria-hidden="true" />
                    <span className="hidden lg:inline">
                      {shareComplete ? props.labels.shared : props.labels.share}
                    </span>
                  </button>
                </div>
              </div>
            </header>

            <HotelDetailsGallery
              {...props.galleryProps}
              embedded
              layout="mosaic"
            />

            <HotelDetailsSectionNav />

            <HotelPriceComparisonSection
              stayContext={props.staySummary ? `${props.staySummary.dateText} · ${props.staySummary.occupancyText}` : undefined}
              totalPrice={props.totalDisplayPrice}
              nightlyPrice={props.nightlyDisplayPrice}
              perNightText={props.perNightText}
              viewDealText="View deal"
              roomOptionsAvailable={props.roomChoices.length > 0}
              onViewRoomOptions={openRoomOptions}
              amenities={props.amenityItems}
              offers={[]}
            />

            <HotelAboutSection
              description={description}
              amenities={props.amenityItems}
              starRating={props.starRating}
              roomSummary={props.propertyDetails?.roomSummary}
              bedSummary={props.propertyDetails?.bedSummary}
              accessibility={props.propertyDetails?.accessibility}
            />

            <HotelReviewsSection
              score={props.reviewScore}
              label={props.reviewLabel}
              countText={props.reviewCountText}
              source={props.reviewSource}
            />

            {props.propertyDetails ? (
                <HotelLocationSection
                  hotelName={props.hotelName}
                  propertyDetails={props.propertyDetails}
                  locationLabel="Location & stay fit"
                  directionsLabel={props.labels.directions}
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
            ) : <section id="hotel-location" className="scroll-mt-16 border-b border-slate-200 px-4 py-8 lg:px-0 lg:py-10" aria-labelledby="hotel-location-heading"><h2 id="hotel-location-heading" className="text-xl font-extrabold text-slate-950">Location &amp; stay fit</h2><p className="mt-3 text-sm text-slate-600">Verified location details are not available for this property yet.</p></section>}
          </article>
        </div>

        <aside
          className="hidden min-w-0 self-start lg:block"
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
              disabled={!props.roomChoices.length}
              onClick={(event) => openRoomOptions(event.currentTarget)}
              className="focus-ring mt-6 flex h-12 w-full items-center justify-center rounded-lg bg-blue px-4 text-sm font-bold text-white hover:bg-blue-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {props.labels.viewRooms}
            </button>
            <p className="mt-2 text-center text-[11px] leading-4 text-slate-500">
              {props.labels.roomSupport}
            </p>
          </section>
        </aside>
      </div>

      <section
        className="fixed inset-x-0 bottom-0 z-[90] rounded-t-[22px] border-t border-slate-200 bg-white px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-8px_28px_rgba(15,23,42,0.14)] lg:hidden"
        data-mobile-hotel-stay-dock
      >
        <div className="mx-auto grid max-w-3xl grid-cols-[minmax(0,1fr)_minmax(132px,0.9fr)] items-center gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1 text-[11px] font-semibold text-slate-600">
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
                className="text-[11px] text-slate-600"
                title={props.nightlyDisplayPrice.title}
              >
                {props.perNightText.replace(
                  "{{price}}",
                  props.nightlyDisplayPrice.formatted,
                )}
              </p>
            ) : null}
          </div>
          <div className="text-center">
            <button
              type="button"
              disabled={!props.roomChoices.length}
              onClick={(event) => openRoomOptions(event.currentTarget)}
              className="focus-ring min-h-12 w-full rounded-lg bg-blue px-3 text-xs font-bold leading-4 text-white disabled:opacity-50"
            >
              {props.labels.viewRooms}
            </button>
            <p className="mt-1 text-[9px] leading-3 text-slate-500">
              {props.labels.roomSupport}
            </p>
          </div>
        </div>
      </section>

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
