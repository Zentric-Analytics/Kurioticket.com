"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/components/layout/LocaleProvider";
import type { SavedHotelSnapshot } from "@/components/results/hotelSavedStorage";
import { useSavedHotel } from "@/components/results/useSavedHotel";
import { translations as enTranslations } from "@/lib/i18n/en";
import { useCurrencyRates } from "@/components/currency/CurrencyRatesProvider";
import { useRegion } from "@/components/region/RegionProvider";
import { Card } from "@/components/ui/Card";
import type { PublicHotelResult } from "@/lib/types";
import type { HotelRoomOption } from "@/lib/hotels/hotelRoomOptions";
import { formatDisplayPrice } from "@/lib/currency/formatCurrency";
import { getHotelPriceDetails } from "@/lib/hotels/hotelResultAvailability";
import {
  normalizeHotelClassificationStars,
  normalizeHotelReviewScale,
  normalizeHotelReviewScore,
} from "@/lib/hotels/hotelRatingSemantics";
import { normalizeHotelCalendarLocale } from "@/lib/hotelsDateFormatting";
import {
  buildHotelGalleryCandidates,
  getAdjacentHotelGalleryIndex,
  getHotelGalleryPhotoPosition,
  resolveHotelGalleryIndex,
} from "@/components/results/hotelGalleryPresentation";
import { buildHotelAmenityPresentation } from "@/components/results/hotelAmenityPresentation";
import { HotelDetailsBookingPanel } from "@/components/results/hotelDetails/HotelDetailsBookingPanel";
import { HotelDetailsGallery } from "@/components/results/hotelDetails/HotelDetailsGallery";
import { HotelDetailsHeader } from "@/components/results/hotelDetails/HotelDetailsHeader";
import { GuidedHotelRoomCard } from "@/components/results/hotelDetails/GuidedHotelRoomCard";
import { getLowestEstimateRoomId } from "@/components/results/hotelDetails/guidedHotelRoomPresentation";
import {
  HotelDetailsLoadingState,
  HotelDetailsUnavailableState,
} from "@/components/results/hotelDetails/HotelDetailsPageStates";
import { HotelDetailsSections } from "@/components/results/hotelDetails/HotelDetailsSections";
import {
  findGuidedHotelRoom,
  getGuidedHotelRoomState,
  getHotelDetailsTaxesAndFeesIncluded,
} from "@/components/results/hotelDetails/guidedHotelRoomState";
import {
  buildHotelDetailsResultsHref,
  canUseHotelDetailsProviderLink,
  formatHotelDetailsRating,
  getDistinctHotelDetailsLocationParts,
  getHotelDetailsCancellationText,
  getHotelDetailsMealPlan,
  getHotelDetailsNightCount,
  getMeaningfulHotelDistance,
  isSafeHotelDetailsHttpUrl,
  localizeHotelDetailsAmenityItems,
  normalizeHotelDetailsWhitespace,
  parseHotelDetailsSearchCount,
  parseHotelDetailsSearchDate,
  toHotelDetailsTitleCase,
  translateKnownHotelDetailsLabel,
  type HotelDetailsSearchContext,
} from "@/components/results/hotelDetails/hotelDetailsPresentation";
import {
  buildDealsHotelDetailsApiParams,
  buildDealsHotelDetailsSelection,
  isCurrentDealsHotelDetailsResponse,
  type DealsHotelDetailsRequestContext,
} from "@/lib/deals/dealsHotelDetails";
import type { DealsSearch } from "@/lib/deals/dealsSearchParams";
import type { DealsTripPlanHotel } from "@/lib/deals/dealsTripPlan";
import {
  getHotelReviewBand,
  getHotelReviewCount,
  type HotelReviewBand,
} from "@/components/results/hotelReviewPresentation";

export type { HotelDetailsSearchContext };

type HotelDetailsClientProps = {
  id: string;
  searchContext?: HotelDetailsSearchContext;
  mode?: "standalone" | "guided";
  requestContext?: DealsHotelDetailsRequestContext;
  guidedSearch?: DealsSearch;
  confirming?: boolean;
  confirmationError?: string;
  onGuidedSelection?: (selection: DealsTripPlanHotel) => void;
};

const reviewLabelKeys: Record<HotelReviewBand, string> = {
  exceptional: "hotelResults.review.exceptional",
  veryGood: "hotelResults.review.veryGood",
  good: "hotelResults.review.good",
  pleasant: "hotelResults.review.pleasant",
  reviewScore: "hotelResults.review.score",
};

const reviewLabelFallbacks: Record<HotelReviewBand, string> = {
  exceptional: "Exceptional",
  veryGood: "Very good",
  good: "Good",
  pleasant: "Pleasant",
  reviewScore: "Review score",
};

export function HotelDetailsClient({
  id,
  searchContext,
  mode = "standalone",
  requestContext,
  guidedSearch,
  confirming = false,
  confirmationError = "",
  onGuidedSelection,
}: HotelDetailsClientProps) {
  const { locale, t: dictionary } = useLocale();
  const { selectedOption } = useRegion();
  const currencyRates = useCurrencyRates();
  const t = (key: string) => dictionary[key] ?? enTranslations[key] ?? "";
  const [hotel, setHotel] = useState<PublicHotelResult | null>(null);
  const [roomOptions, setRoomOptions] = useState<HotelRoomOption[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [redirectError, setRedirectError] = useState("");
  const [redirecting, setRedirecting] = useState(false);
  const [preferredImageIndex, setPreferredImageIndex] = useState(0);
  const [failedImageUrls, setFailedImageUrls] = useState<Set<string>>(
    () => new Set(),
  );
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [resultReceivedAt, setResultReceivedAt] = useState<number | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const loadingRef = useRef<HTMLDivElement | null>(null);
  const errorRef = useRef<HTMLHeadingElement | null>(null);
  const retryFocusRef = useRef(false);
  const effectiveRequestContext = requestContext ?? {
    id,
    checkIn: searchContext?.checkIn ?? "",
    checkOut: searchContext?.checkOut ?? "",
    guests: searchContext?.guests ?? "",
    rooms: searchContext?.rooms ?? "",
  };
  const requestId = effectiveRequestContext.id;
  const requestCheckIn = effectiveRequestContext.checkIn;
  const requestCheckOut = effectiveRequestContext.checkOut;
  const requestGuests = effectiveRequestContext.guests;
  const requestRooms = effectiveRequestContext.rooms;

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const unavailableFallback =
      enTranslations["hotelDetails.unavailableBody"] ||
      "This hotel quote is no longer available. Please search again for current prices.";

    queueMicrotask(() => {
      if (!active) return;
      setLoading(true);
      setHotel(null);
      setRoomOptions([]);
      setSelectedRoomId("");
      setLoadError("");
      setRedirectError("");
      setRedirecting(false);
      setResultReceivedAt(null);
      setPreferredImageIndex(0);
      setFailedImageUrls(new Set());
    });

    fetch(
      `/api/hotels/details?${buildDealsHotelDetailsApiParams({ id: requestId, checkIn: requestCheckIn, checkOut: requestCheckOut, guests: requestGuests, rooms: requestRooms }).toString()}`,
      { signal: controller.signal },
    )
      .then(async (response) => {
        const data = (await response.json().catch(() => ({}))) as {
          hotel?: PublicHotelResult;
          roomOptions?: HotelRoomOption[];
          error?: string;
        };
        if (!response.ok || !data.hotel)
          throw new Error(data.error || unavailableFallback);
        if (!isCurrentDealsHotelDetailsResponse(requestId, data.hotel))
          throw new Error(unavailableFallback);
        return {
          hotel: data.hotel,
          roomOptions: Array.isArray(data.roomOptions) ? data.roomOptions : [],
        };
      })
      .then(({ hotel: nextHotel, roomOptions: nextRoomOptions }) => {
        if (!active) return;
        setHotel(nextHotel);
        setRoomOptions(nextRoomOptions);
        setResultReceivedAt(Date.now());
        setLoadError("");
      })
      .catch((error) => {
        if (!active) return;
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        setLoadError(
          error instanceof Error ? error.message : unavailableFallback,
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [
    requestId,
    requestCheckIn,
    requestCheckOut,
    requestGuests,
    requestRooms,
    loadAttempt,
  ]);

  async function continueToProvider() {
    if (!hotel || redirecting || !canUseHotelDetailsProviderLink(hotel)) return;
    setRedirecting(true);
    setRedirectError("");
    try {
      const response = await fetch("/api/redirect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          type: "hotel",
          sourcePage: "hotel_details",
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (!response.ok || !data.url)
        throw new Error(data.error || t("hotelDetails.redirectError"));
      window.location.href = data.url;
    } catch (error) {
      setRedirectError(
        error instanceof Error
          ? error.message
          : t("hotelDetails.redirectError"),
      );
      setRedirecting(false);
      setResultReceivedAt(null);
    }
  }

  const savedHotelId = hotel?.id || id;

  function getHotelDetailsSnapshot(): SavedHotelSnapshot {
    if (!hotel) {
      throw new Error("Hotel details are unavailable.");
    }

    const snapshotPrice = getHotelPriceDetails(hotel);
    if (!snapshotPrice) {
      throw new Error("Cannot save a hotel without a valid live room rate.");
    }

    const parsedCheckIn = parseHotelDetailsSearchDate(searchContext?.checkIn);
    const parsedCheckOut = parseHotelDetailsSearchDate(searchContext?.checkOut);

    const hasValidStay =
      parsedCheckIn !== null &&
      parsedCheckOut !== null &&
      parsedCheckOut.getTime() > parsedCheckIn.getTime();

    const fallbackDate = new Date().toISOString().slice(0, 10);

    const checkIn = hasValidStay
      ? searchContext?.checkIn || fallbackDate
      : fallbackDate;

    const checkOut = hasValidStay
      ? searchContext?.checkOut || checkIn
      : checkIn;

    const contextualDestination = normalizeHotelDetailsWhitespace(
      searchContext?.destination || "",
    );

    const destination =
      contextualDestination && contextualDestination.length <= 120
        ? contextualDestination
        : hotel.location || hotel.neighbourhood || hotel.name;

    const snapshotGallery = buildHotelGalleryCandidates(
      hotel.imageUrls,
      hotel.imageUrl,
    );

    const snapshotImageIndex = resolveHotelGalleryIndex(
      snapshotGallery,
      failedImageUrls,
      preferredImageIndex,
    );

    const image =
      snapshotImageIndex >= 0 ? snapshotGallery[snapshotImageIndex] : undefined;

    const href = `${window.location.pathname}` + `${window.location.search}`;

    return {
      id: savedHotelId,
      provider: hotel.provider || "hotel",
      hotelName: hotel.name,
      destination,
      checkIn: `${checkIn}T00:00:00.000Z`,
      checkOut: `${checkOut}T00:00:00.000Z`,
      totalPrice: snapshotPrice.totalPrice,
      currency: snapshotPrice.currency,
      image,
      imageAlt: hotel.name,
      location: hotel.location,
      rating: hotel.rating,
      href,
      savedAt: new Date().toISOString(),
    };
  }

  const { isSaved, toggleSavedHotel } = useSavedHotel({
    hotelId: savedHotelId,
    getSnapshot: getHotelDetailsSnapshot,
  });

  const resultsHref = buildHotelDetailsResultsHref(searchContext);
  const backToResultsText =
    t("hotelResults.backToResults") || "Back to Hotels results";

  function retryHotelLoad() {
    retryFocusRef.current = mode === "guided";
    setLoadAttempt((attempt) => attempt + 1);
  }

  useEffect(() => {
    if (retryFocusRef.current && loading)
      loadingRef.current?.focus({ preventScroll: true });
  }, [loading]);
  useEffect(() => {
    if (!retryFocusRef.current || loading) return;
    if (hotel && !loadError) headingRef.current?.focus({ preventScroll: true });
    else errorRef.current?.focus({ preventScroll: true });
    retryFocusRef.current = false;
  }, [hotel, loadError, loading]);

  if (loading) {
    return (
      <HotelDetailsLoadingState
        embedded={mode === "guided"}
        statusRef={loadingRef}
        loadingText={
          t("hotelDetails.loading") || enTranslations["hotelDetails.loading"]
        }
      />
    );
  }

  if (loadError || !hotel) {
    return (
      <HotelDetailsUnavailableState
        title={
          t("hotelDetails.unavailableTitle") ||
          enTranslations["hotelDetails.unavailableTitle"]
        }
        body={
          t("hotelDetails.unavailableBody") ||
          enTranslations["hotelDetails.unavailableBody"]
        }
        retryText={t("retry") || "Try again"}
        backToResultsText={backToResultsText}
        resultsHref={resultsHref}
        onRetry={retryHotelLoad}
        embedded={mode === "guided"}
        showBackLink={mode !== "guided"}
        headingLevel={mode === "guided" ? "h2" : "h1"}
        headingRef={errorRef}
      />
    );
  }

  const selectedRoom = findGuidedHotelRoom(roomOptions, selectedRoomId);
  const guidedPriceState =
    mode !== "guided"
      ? null
      : getGuidedHotelRoomState(roomOptions, selectedRoom);
  const propertyPriceDetails = getHotelPriceDetails(hotel);
  const priceDetails =
    mode === "guided"
      ? selectedRoom
        ? {
            pricePerNight: selectedRoom.pricePerNight,
            totalPrice: selectedRoom.totalPrice,
            currency: selectedRoom.currency,
          }
        : null
      : propertyPriceDetails;
  const hasValidPrice = priceDetails !== null;
  const totalDisplayPrice = priceDetails
    ? formatDisplayPrice({
        amount: priceDetails.totalPrice,
        sourceCurrency: priceDetails.currency,
        displayCurrency: selectedOption.currency,
        convertSourceEstimate: true,
        rates: currencyRates.rates,
        isFallbackRate: currencyRates.isFallback,
      })
    : null;
  const nightlyDisplayPrice = priceDetails
    ? formatDisplayPrice({
        amount: priceDetails.pricePerNight,
        sourceCurrency: priceDetails.currency,
        displayCurrency: selectedOption.currency,
        convertSourceEstimate: true,
        rates: currencyRates.rates,
        isFallbackRate: currencyRates.isFallback,
      })
    : null;
  const priceUnavailableText =
    t("hotelResults.priceUnavailable") || "Price unavailable";
  const liveRateUnavailableText =
    t("hotelResults.liveRateUnavailable") ||
    "No live room rate is available for the selected dates.";
  const saveRequiresLiveRateText =
    t("hotelResults.saveRequiresLiveRate") ||
    "Saving is available once a live room rate is provided.";
  const discoveryBookingUnavailableText =
    t("hotelDetails.discoveryBookingUnavailable") ||
    "This property is available for discovery, but a live booking quote is not available yet.";
  const starRating =
    normalizeHotelClassificationStars(hotel.classificationStars) ?? null;
  const galleryCandidates = buildHotelGalleryCandidates(
    hotel.imageUrls,
    hotel.imageUrl,
  );
  const displayCandidates = galleryCandidates;
  const activeIndex = resolveHotelGalleryIndex(
    displayCandidates,
    failedImageUrls,
    preferredImageIndex,
  );
  const usableIndices = displayCandidates.reduce<number[]>(
    (indices, url, index) => {
      if (!failedImageUrls.has(url)) indices.push(index);
      return indices;
    },
    [],
  );
  const activeUrl = activeIndex >= 0 ? displayCandidates[activeIndex] : "";
  const showGalleryControls = usableIndices.length > 1;
  const photoPosition = getHotelGalleryPhotoPosition(
    usableIndices,
    activeIndex,
  );
  const activePosition = photoPosition.current;
  const photoCounter = (
    t("hotelResults.photoCounter") || "{{current}} of {{total}} photos"
  )
    .replace("{{current}}", String(activePosition))
    .replace("{{total}}", String(photoPosition.total));
  const photoPositionAnnouncement = (
    t("hotelDetails.photoPositionAnnouncement") ||
    "Photo {{current}} of {{total}}"
  )
    .replace("{{current}}", String(activePosition))
    .replace("{{total}}", String(photoPosition.total));
  const roomType = hotel.roomType
    ? translateKnownHotelDetailsLabel(
        toHotelDetailsTitleCase(hotel.roomType),
        t,
      )
    : "";
  const mealPlan = getHotelDetailsMealPlan(hotel, roomType, t);
  const cancellationText = getHotelDetailsCancellationText(
    hotel.cancellationInfo,
    t,
  );
  const distanceText = getMeaningfulHotelDistance(hotel.distanceFromCenter);
  const locationParts = getDistinctHotelDetailsLocationParts(
    hotel,
    distanceText,
  );
  const amenityItems = localizeHotelDetailsAmenityItems(
    buildHotelAmenityPresentation(hotel.amenities, hotel.amenities.length),
    t,
  );
  const reviewScale = normalizeHotelReviewScale(hotel.reviewScale);
  const normalizedReviewScore = normalizeHotelReviewScore(
    hotel.reviewScore,
    reviewScale,
  );
  const reviewBand = getHotelReviewBand(normalizedReviewScore, reviewScale);
  const reviewCount = getHotelReviewCount(hotel.reviewCount);
  const reviewLabel = reviewBand
    ? t(reviewLabelKeys[reviewBand]) || reviewLabelFallbacks[reviewBand]
    : "";
  const reviewScore =
    reviewBand && reviewScale
      ? `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(normalizedReviewScore ?? 0)} / ${reviewScale}`
      : "";
  const reviewCountText =
    reviewCount !== null
      ? (reviewCount === 1
          ? t("hotelResults.review.single") || "{{count}} review"
          : t("hotelResults.review.multiple") || "{{count}} reviews"
        ).replace(
          "{{count}}",
          new Intl.NumberFormat(locale).format(reviewCount),
        )
      : "";
  const taxesAndFeesIncluded = getHotelDetailsTaxesAndFeesIncluded(
    mode,
    hotel.taxesAndFeesIncluded,
    selectedRoom,
  );
  const taxesText =
    taxesAndFeesIncluded === true
      ? t("hotelResults.taxesFeesIncluded")
      : taxesAndFeesIncluded === false
        ? t("hotelResults.taxesFeesNotIncluded")
        : "";
  const providerEnabled = canUseHotelDetailsProviderLink(hotel);
  const providerText =
    hotel.provider &&
    hotel.dataSource !== "demo" &&
    hotel.provider !== "Kurioticket static catalogue"
      ? `${t("providedBy")} ${hotel.provider}`
      : "";
  const providerUnavailableText =
    hotel.provider === "Kurioticket static catalogue"
      ? "Prices shown are estimated for trip planning. Live booking availability will be introduced before launch."
      : hotel.dataSource === "demo"
        ? ""
        : hotel.inventoryKind === "discovery" || !hasValidPrice
          ? discoveryBookingUnavailableText
          : !providerEnabled
            ? t("hotelDetails.directLinkUnavailable")
            : "";
  const guidedSelection =
    mode === "guided" && guidedSearch && resultReceivedAt !== null
      ? buildDealsHotelDetailsSelection({
          hotel,
          roomOption: selectedRoom,
          requestedHotelId: requestId,
          search: guidedSearch,
          resultReceivedAt,
        })
      : null;
  const guidedActionLabel =
    guidedSearch?.mode === "hotel-car"
      ? t("deals.guided.hotelDetails.continueCars") ||
        "Continue with this room to cars"
      : t("deals.guided.hotelDetails.continueFlights") ||
        "Continue with this room to flights";
  const guidedUnavailableText =
    guidedPriceState === "selection-required"
      ? t("deals.guided.hotelDetails.selectRoomToContinue")
      : t("deals.guided.hotelDetails.optionsUnavailable");
  const lowestEstimateRoomId = getLowestEstimateRoomId(roomOptions);
  const savedHotelLabel = (
    isSaved
      ? t("hotelResults.removeSavedHotel") ||
        "Remove {{name}} from saved hotels"
      : hasValidPrice
        ? t("hotelResults.saveHotel") || "Save {{name}}"
        : saveRequiresLiveRateText
  ).replace("{{name}}", hotel.name);

  const saveActionText = isSaved ? t("saved") || "Saved" : t("save") || "Save";

  const sourceAttributions = (hotel.sourceAttributions || [])
    .map((attribution) => ({
      provider: attribution.provider.trim(),
      providerUri: attribution.providerUri?.trim(),
    }))
    .filter((attribution) => attribution.provider);

  const staySummary = (() => {
    const checkInDate = parseHotelDetailsSearchDate(searchContext?.checkIn);
    const checkOutDate = parseHotelDetailsSearchDate(searchContext?.checkOut);
    const guestCount = parseHotelDetailsSearchCount(
      searchContext?.guests,
      1,
      12,
    );
    const roomCount = parseHotelDetailsSearchCount(searchContext?.rooms, 1, 6);

    if (
      checkInDate === null ||
      checkOutDate === null ||
      guestCount === null ||
      roomCount === null
    ) {
      return null;
    }

    const nightCount = getHotelDetailsNightCount(checkInDate, checkOutDate);

    if (nightCount === null) {
      return null;
    }

    const dateFormatter = new Intl.DateTimeFormat(
      normalizeHotelCalendarLocale(locale),
      {
        month: "short",
        day: "numeric",
        year: "numeric",
      },
    );

    const numberFormatter = new Intl.NumberFormat(locale);

    const guestLabel =
      guestCount === 1
        ? t("guestSingular") || "guest"
        : t("guestPlural") || "guests";

    const roomLabel =
      roomCount === 1
        ? t("roomSingular") || "room"
        : t("roomPlural") || "rooms";

    const nightLabel =
      nightCount === 1
        ? t("hotelDetails.nightSingular") || "night"
        : t("hotelDetails.nightPlural") || "nights";

    return {
      dateText: `${dateFormatter.format(checkInDate)} – ${dateFormatter.format(checkOutDate)}`,
      occupancyText:
        `${numberFormatter.format(guestCount)} ${guestLabel}, ` +
        `${numberFormatter.format(roomCount)} ${roomLabel}`,
      nightText: `${numberFormatter.format(nightCount)} ${nightLabel}`,
    };
  })();

  function markImageFailed(url: string) {
    setFailedImageUrls((current) => {
      if (current.has(url)) return current;
      const next = new Set(current);
      next.add(url);
      return next;
    });
  }

  function selectAdjacentImage(direction: -1 | 1) {
    const nextIndex = getAdjacentHotelGalleryIndex(
      displayCandidates,
      failedImageUrls,
      activeIndex,
      direction,
    );
    if (nextIndex !== -1) setPreferredImageIndex(nextIndex);
  }

  const guidedRoomSelector =
    mode === "guided" ? (
      <fieldset
        className="min-w-0 border-t border-slate-200 pt-6 sm:pt-8 lg:pt-10"
        data-guided-room-selector
      >
        <legend className="text-xl font-extrabold text-slate-950">
          {t("deals.guided.hotelDetails.chooseRoom")}
        </legend>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
          {t("deals.guided.hotelDetails.planningDisclosure")}
        </p>
        {roomOptions.length ? (
          <div
            className="mt-6 grid min-w-0 grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3"
            data-guided-room-grid
          >
            {roomOptions.map((option) => {
              const checked = selectedRoomId === option.id;
              const nightly = formatDisplayPrice({
                amount: option.pricePerNight,
                sourceCurrency: option.currency,
                displayCurrency: selectedOption.currency,
                convertSourceEstimate: true,
                rates: currencyRates.rates,
                isFallbackRate: currencyRates.isFallback,
              });
              const total = formatDisplayPrice({
                amount: option.totalPrice,
                sourceCurrency: option.currency,
                displayCurrency: selectedOption.currency,
                convertSourceEstimate: true,
                rates: currencyRates.rates,
                isFallbackRate: currencyRates.isFallback,
              });
              return (
                <GuidedHotelRoomCard
                  key={option.id}
                  option={option}
                  nightlyPrice={nightly}
                  totalPrice={total}
                  selected={checked}
                  lowestEstimate={option.id === lowestEstimateRoomId}
                  planningOptionText={t(
                    "deals.guided.hotelDetails.planningOption",
                  )}
                  lowestEstimateText={t(
                    "deals.guided.hotelDetails.lowestEstimate",
                  )}
                  perRoomNightText={t("deals.guided.hotelDetails.perRoomNight")}
                  indicativeTotalText={t(
                    "deals.guided.hotelDetails.indicativeTotal",
                  )}
                  selectRoomText={t("deals.guided.hotelDetails.selectRoom")}
                  selectedText={t("deals.guided.hotelDetails.selected")}
                  onSelect={() => setSelectedRoomId(option.id)}
                />
              );
            })}
          </div>
        ) : (
          <p
            role="status"
            className="mt-5 rounded-xl bg-amber-50 p-4 font-semibold text-amber-950"
          >
            {t("deals.guided.hotelDetails.optionsUnavailable")}
          </p>
        )}
      </fieldset>
    ) : null;

  const detailsContent = (
    <section className="border-b border-border bg-white">
      <div
        className={
          mode === "guided"
            ? "py-6 sm:py-8 lg:py-10"
            : "page-shell py-6 sm:py-8 lg:py-10"
        }
      >
        <div className="space-y-6 sm:space-y-8 lg:space-y-10">
          <HotelDetailsHeader
            resultsHref={resultsHref}
            backToResultsText={backToResultsText}
            badges={hotel.badges}
            name={hotel.name}
            savedHotelLabel={savedHotelLabel}
            isSaved={isSaved}
            hasValidPrice={hasValidPrice}
            saveRequiresLiveRateText={saveRequiresLiveRateText}
            onSave={() => {
              if (isSaved || hasValidPrice) void toggleSavedHotel();
            }}
            saveActionText={saveActionText}
            starRating={starRating}
            starRatingAriaLabel={
              starRating
                ? t("hotelResults.starHotelAria").replace(
                    "{{rating}}",
                    formatHotelDetailsRating(starRating, locale),
                  )
                : ""
            }
            isGoogleMapsProvider={hotel.provider === "Google Maps"}
            locationParts={locationParts}
            reviewBandVisible={Boolean(reviewBand)}
            reviewScore={reviewScore}
            reviewLabel={reviewLabel}
            reviewCountText={reviewCountText}
            sourceAttributions={sourceAttributions}
            isSafeAttributionUrl={isSafeHotelDetailsHttpUrl}
            headingLevel={mode === "guided" ? "h2" : "h1"}
            showBackLink={mode !== "guided"}
            showSave={mode !== "guided"}
            allowExternalAttribution={mode !== "guided"}
            headingRef={mode === "guided" ? headingRef : undefined}
          />

          <div
            className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-8"
            data-hotel-property-booking-layout
          >
            <Card
              variant="flat"
              className="min-w-0 overflow-hidden p-0 shadow-[0_12px_32px_-26px_rgba(2,28,43,0.32)]"
            >
              <HotelDetailsGallery
                embedded
                activeUrl={activeUrl}
                hotelName={hotel.name}
                imageAlt={t("hotelResults.hotelImageAlt")
                  .replace("{{name}}", hotel.name)
                  .replace(
                    "{{location}}",
                    hotel.location
                      ? ` ${t("hotelResults.nearLocation").replace("{{location}}", hotel.location)}`
                      : "",
                  )}
                imageUnavailableText={t("hotelResults.imageUnavailable")}
                showGalleryControls={showGalleryControls}
                onPrevious={() => selectAdjacentImage(-1)}
                onNext={() => selectAdjacentImage(1)}
                previousPhotoLabel={
                  t("hotelResults.previousPhoto") || "Previous photo"
                }
                nextPhotoLabel={t("hotelResults.nextPhoto") || "Next photo"}
                photoCounter={photoCounter}
                photoPositionAnnouncement={photoPositionAnnouncement}
                usableIndices={usableIndices}
                displayCandidates={displayCandidates}
                activeIndex={activeIndex}
                activePosition={activePosition}
                selectPhotoLabel={
                  t("hotelResults.selectPhoto") || "Show photo {{number}}"
                }
                viewAllPhotosLabel={
                  t("hotelDetails.viewAllPhotos") || "View all photos"
                }
                openPhotoViewerLabel={
                  t("hotelDetails.openPhotoViewer") ||
                  "Open photo {{current}} of {{total}} for {{hotelName}}"
                }
                closePhotoViewerLabel={
                  t("hotelDetails.closePhotoViewer") || "Close photo viewer"
                }
                photoViewerTitle={(
                  t("hotelDetails.photoViewerTitle") ||
                  "Photos for {{hotelName}}"
                ).replace("{{hotelName}}", hotel.name)}
                onSelectImage={setPreferredImageIndex}
                onImageError={markImageFailed}
              />

              <HotelDetailsSections
                embedded
                roomTitle={
                  mode === "guided"
                    ? t("deals.guided.hotelDetails.roomInformation") ||
                      "Room information"
                    : t("hotelResults.roomDetails") || "Room"
                }
                roomItems={mode === "guided" ? [] : [roomType, mealPlan]}
                cancellationTitle={
                  t("hotelResults.cancellationDetails") || "Cancellation"
                }
                cancellationItems={mode === "guided" ? [] : [cancellationText]}
                amenitiesTitle={
                  t("hotelResults.amenitiesDetails") || "Amenities"
                }
                amenityItems={amenityItems}
              />
            </Card>

            <HotelDetailsBookingPanel
              priceDetailsAvailable={Boolean(priceDetails)}
              totalDisplayPrice={totalDisplayPrice}
              nightlyDisplayPrice={nightlyDisplayPrice}
              estimatedStayTotalText={t("hotelResults.estimatedStayTotal")}
              pricePerNightText={t("hotelResults.pricePerNight")}
              taxesText={taxesText}
              priceUnavailableText={priceUnavailableText}
              liveRateUnavailableText={liveRateUnavailableText}
              unavailablePresentation={
                guidedPriceState === "selection-required"
                  ? {
                      title: t(
                        "deals.guided.hotelDetails.selectionRequiredTitle",
                      ),
                      body: t(
                        "deals.guided.hotelDetails.selectionRequiredBody",
                      ),
                    }
                  : guidedPriceState === "room-options-unavailable"
                    ? {
                        title: t(
                          "deals.guided.hotelDetails.optionsUnavailable",
                        ),
                        body: t(
                          "deals.guided.hotelDetails.optionsUnavailableBody",
                        ),
                      }
                    : undefined
              }
              staySummary={staySummary}
              changeSearchHref={resultsHref}
              changeSearchText={
                t("hotelDetails.changeDatesGuests") || "Change dates and guests"
              }
              changeSearchAction={
                mode === "guided"
                  ? { kind: "hidden" }
                  : {
                      kind: "link",
                      href: resultsHref,
                      label:
                        t("hotelDetails.changeDatesGuests") ||
                        "Change dates and guests",
                    }
              }
              providerPriceLabel={
                mode === "guided"
                  ? t("deals.guided.hotelDetails.sourceEstimate") ||
                    enTranslations["deals.guided.hotelDetails.sourceEstimate"]
                  : t("hotelDetails.providerPrice") || "Provider price"
              }
              providerText={providerText}
              providerUnavailableText={
                mode === "guided" ? "" : providerUnavailableText
              }
              redirectError={redirectError}
              providerEnabled={providerEnabled}
              redirecting={redirecting}
              continueToProviderText={t("continueToProvider")}
              onContinue={continueToProvider}
              providerDisclaimerText={
                t("hotelDetails.providerDisclaimer") ||
                enTranslations["hotelDetails.providerDisclaimer"]
              }
              primaryAction={
                mode === "guided"
                  ? {
                      kind: "guided-room",
                      enabled: Boolean(guidedSelection) && !confirming,
                      pending: confirming,
                      label: guidedActionLabel,
                      accessibleLabel: `${guidedActionLabel}: ${selectedRoom?.name ?? hotel.name}, ${hotel.name}`,
                      unavailableMessage: guidedSelection
                        ? ""
                        : guidedUnavailableText,
                      error: confirmationError,
                      onActivate: () => {
                        if (guidedSelection)
                          onGuidedSelection?.(guidedSelection);
                      },
                    }
                  : undefined
              }
            />
          </div>
          {guidedRoomSelector}
        </div>
      </div>
    </section>
  );
  return mode === "guided" ? (
    <div data-guided-hotel-details-experience>{detailsContent}</div>
  ) : (
    <main className="flex-1 bg-surface-muted/40">{detailsContent}</main>
  );
}
