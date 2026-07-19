"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/components/layout/LocaleProvider";
import type {
  SavedHotelSnapshot,
} from "@/components/results/hotelSavedStorage";
import {
  useSavedHotel,
} from "@/components/results/useSavedHotel";
import { translations as enTranslations } from "@/lib/i18n/en";
import { useCurrencyRates } from "@/components/currency/CurrencyRatesProvider";
import { useRegion } from "@/components/region/RegionProvider";
import type { PublicHotelResult } from "@/lib/types";
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
import {
  buildHotelAmenityPresentation,
} from "@/components/results/hotelAmenityPresentation";
import { HotelDetailsBookingPanel } from "@/components/results/hotelDetails/HotelDetailsBookingPanel";
import { HotelDetailsGallery } from "@/components/results/hotelDetails/HotelDetailsGallery";
import { HotelDetailsHeader } from "@/components/results/hotelDetails/HotelDetailsHeader";
import {
  HotelDetailsLoadingState,
  HotelDetailsUnavailableState,
} from "@/components/results/hotelDetails/HotelDetailsPageStates";
import { HotelDetailsSections } from "@/components/results/hotelDetails/HotelDetailsSections";
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
  getHotelReviewBand,
  getHotelReviewCount,
  type HotelReviewBand,
} from "@/components/results/hotelReviewPresentation";


export type { HotelDetailsSearchContext };

type HotelDetailsClientProps = {
  id: string;
  searchContext?: HotelDetailsSearchContext;
};

type HotelShareStatus =
  | "idle"
  | "shared"
  | "copied"
  | "error";

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
}: HotelDetailsClientProps) {
  const { locale, t: dictionary } = useLocale();
  const { selectedOption } = useRegion();
  const currencyRates = useCurrencyRates();
  const t = (key: string) => dictionary[key] ?? enTranslations[key] ?? "";
  const [hotel, setHotel] = useState<PublicHotelResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [redirectError, setRedirectError] = useState("");
  const [redirecting, setRedirecting] = useState(false);
  const [preferredImageIndex, setPreferredImageIndex] = useState(0);
  const [failedImageUrls, setFailedImageUrls] = useState<Set<string>>(() => new Set());
  const [shareStatus, setShareStatus] =
    useState<HotelShareStatus>("idle");
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    const unavailableFallback =
      enTranslations["hotelDetails.unavailableBody"] ||
      "This hotel quote is no longer available. Please search again for current prices.";

    queueMicrotask(() => {
      if (!active) return;
      setLoading(true);
      setHotel(null);
      setLoadError("");
      setRedirectError("");
      setRedirecting(false);
      setShareStatus("idle");
      setPreferredImageIndex(0);
      setFailedImageUrls(new Set());
    });

    fetch(`/api/hotels/details?id=${encodeURIComponent(id)}`)
      .then(async (response) => {
        const data = (await response.json().catch(() => ({}))) as { hotel?: PublicHotelResult; error?: string };
        if (!response.ok || !data.hotel) throw new Error(data.error || unavailableFallback);
        return data.hotel;
      })
      .then((nextHotel) => {
        if (!active) return;
        setHotel(nextHotel);
        setLoadError("");
      })
      .catch((error) => {
        if (!active) return;
        setLoadError(error instanceof Error ? error.message : unavailableFallback);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id, loadAttempt]);

  async function continueToProvider() {
    if (!hotel || redirecting || !canUseHotelDetailsProviderLink(hotel)) return;
    setRedirecting(true);
    setRedirectError("");
    try {
      const response = await fetch("/api/redirect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, type: "hotel", sourcePage: "hotel_details" }),
      });
      const data = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!response.ok || !data.url) throw new Error(data.error || t("hotelDetails.redirectError"));
      window.location.href = data.url;
    } catch (error) {
      setRedirectError(error instanceof Error ? error.message : t("hotelDetails.redirectError"));
      setRedirecting(false);
    }
  }

  const savedHotelId = hotel?.id || id;

  function getHotelDetailsSnapshot(): SavedHotelSnapshot {
    if (!hotel) {
      throw new Error(
        "Hotel details are unavailable.",
      );
    }

    const snapshotPrice = getHotelPriceDetails(hotel);
    if (!snapshotPrice) {
      throw new Error("Cannot save a hotel without a valid live room rate.");
    }

    const parsedCheckIn = parseHotelDetailsSearchDate(
      searchContext?.checkIn,
    );
    const parsedCheckOut = parseHotelDetailsSearchDate(
      searchContext?.checkOut,
    );

    const hasValidStay =
      parsedCheckIn !== null &&
      parsedCheckOut !== null &&
      parsedCheckOut.getTime() >
        parsedCheckIn.getTime();

    const fallbackDate = new Date()
      .toISOString()
      .slice(0, 10);

    const checkIn = hasValidStay
      ? searchContext?.checkIn || fallbackDate
      : fallbackDate;

    const checkOut = hasValidStay
      ? searchContext?.checkOut || checkIn
      : checkIn;

    const contextualDestination =
      normalizeHotelDetailsWhitespace(
        searchContext?.destination || "",
      );

    const destination =
      contextualDestination &&
      contextualDestination.length <= 120
        ? contextualDestination
        : hotel.location ||
          hotel.neighbourhood ||
          hotel.name;

    const snapshotGallery =
      buildHotelGalleryCandidates(
        hotel.imageUrls,
        hotel.imageUrl,
      );

    const snapshotImageIndex =
      resolveHotelGalleryIndex(
        snapshotGallery,
        failedImageUrls,
        preferredImageIndex,
      );

    const image =
      snapshotImageIndex >= 0
        ? snapshotGallery[snapshotImageIndex]
        : undefined;

    const href =
      `${window.location.pathname}` +
      `${window.location.search}`;

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

  const {
    isSaved,
    toggleSavedHotel,
  } = useSavedHotel({
    hotelId: savedHotelId,
    getSnapshot: getHotelDetailsSnapshot,
  });

  async function shareHotel() {
    if (!hotel) return;

    setShareStatus("idle");

    const url = window.location.href;
    const text = hotel.location
      ? `${hotel.name} — ${hotel.location}`
      : hotel.name;

    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: hotel.name,
          text,
          url,
        });

        setShareStatus("shared");
        return;
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        // Continue to the clipboard fallback.
      }
    }

    try {
      if (
        !navigator.clipboard ||
        typeof navigator.clipboard.writeText !==
          "function"
      ) {
        throw new Error(
          "Clipboard access is unavailable.",
        );
      }

      await navigator.clipboard.writeText(url);
      setShareStatus("copied");
    } catch {
      setShareStatus("error");
    }
  }

  const resultsHref = buildHotelDetailsResultsHref(searchContext);
  const backToResultsText =
    t("hotelResults.backToResults") || t("back") || "Back to results";

  function retryHotelLoad() {
    setLoadAttempt((attempt) => attempt + 1);
  }

  if (loading) {
    return (
      <HotelDetailsLoadingState
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
      />
    );
  }

  const priceDetails = getHotelPriceDetails(hotel);
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
  const priceUnavailableText = t("hotelResults.priceUnavailable") || "Price unavailable";
  const liveRateUnavailableText =
    t("hotelResults.liveRateUnavailable") ||
    "No live room rate is available for the selected dates.";
  const saveRequiresLiveRateText =
    t("hotelResults.saveRequiresLiveRate") ||
    "Saving is available once a live room rate is provided.";
  const discoveryBookingUnavailableText =
    t("hotelDetails.discoveryBookingUnavailable") ||
    "This property is available for discovery, but a live booking quote is not available yet.";
  const starRating = normalizeHotelClassificationStars(hotel.classificationStars) ?? null;
  const galleryCandidates = buildHotelGalleryCandidates(hotel.imageUrls, hotel.imageUrl);
  const displayCandidates = galleryCandidates;
  const activeIndex = resolveHotelGalleryIndex(displayCandidates, failedImageUrls, preferredImageIndex);
  const usableIndices = displayCandidates.reduce<number[]>((indices, url, index) => {
    if (!failedImageUrls.has(url)) indices.push(index);
    return indices;
  }, []);
  const activeUrl = activeIndex >= 0 ? displayCandidates[activeIndex] : "";
  const showGalleryControls = usableIndices.length > 1;
  const photoPosition = getHotelGalleryPhotoPosition(usableIndices, activeIndex);
  const activePosition = photoPosition.current;
  const photoCounter = (t("hotelResults.photoCounter") || "{{current}} of {{total}} photos")
    .replace("{{current}}", String(activePosition))
    .replace("{{total}}", String(photoPosition.total));
  const photoPositionAnnouncement = (t("hotelDetails.photoPositionAnnouncement") || "Photo {{current}} of {{total}}")
    .replace("{{current}}", String(activePosition))
    .replace("{{total}}", String(photoPosition.total));
  const roomType = hotel.roomType ? translateKnownHotelDetailsLabel(toHotelDetailsTitleCase(hotel.roomType), t) : "";
  const mealPlan = getHotelDetailsMealPlan(hotel, roomType, t);
  const cancellationText = getHotelDetailsCancellationText(hotel.cancellationInfo, t);
  const distanceText = getMeaningfulHotelDistance(hotel.distanceFromCenter);
  const locationParts = getDistinctHotelDetailsLocationParts(hotel, distanceText);
  const amenityItems = localizeHotelDetailsAmenityItems(buildHotelAmenityPresentation(hotel.amenities, hotel.amenities.length), t);
  const reviewScale = normalizeHotelReviewScale(hotel.reviewScale);
  const normalizedReviewScore = normalizeHotelReviewScore(hotel.reviewScore, reviewScale);
  const reviewBand = getHotelReviewBand(normalizedReviewScore, reviewScale);
  const reviewCount = getHotelReviewCount(hotel.reviewCount);
  const reviewLabel = reviewBand ? t(reviewLabelKeys[reviewBand]) || reviewLabelFallbacks[reviewBand] : "";
  const reviewScore = reviewBand && reviewScale ? `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(normalizedReviewScore ?? 0)} / ${reviewScale}` : "";
  const reviewCountText = reviewCount !== null ? (reviewCount === 1 ? t("hotelResults.review.single") || "{{count}} review" : t("hotelResults.review.multiple") || "{{count}} reviews").replace("{{count}}", new Intl.NumberFormat(locale).format(reviewCount)) : "";
  const taxesText = hotel.taxesAndFeesIncluded === true ? t("hotelResults.taxesFeesIncluded") : hotel.taxesAndFeesIncluded === false ? t("hotelResults.taxesFeesNotIncluded") : "";
  const providerEnabled = canUseHotelDetailsProviderLink(hotel);
  const providerUnavailableText = hotel.dataSource === "demo"
    ? ""
    : hotel.inventoryKind === "discovery" || !hasValidPrice
      ? discoveryBookingUnavailableText
      : !providerEnabled
        ? t("hotelDetails.directLinkUnavailable")
        : "";
  const savedHotelLabel = (
    isSaved
      ? t("hotelResults.removeSavedHotel") ||
        "Remove {{name}} from saved hotels"
      : hasValidPrice
        ? t("hotelResults.saveHotel") ||
          "Save {{name}}"
        : saveRequiresLiveRateText
  ).replace("{{name}}", hotel.name);

  const saveActionText = isSaved
    ? t("saved") || "Saved"
    : t("save") || "Save";

  const shareHotelLabel = (
    t("hotelDetails.shareHotel") ||
    "Share {{name}}"
  ).replace("{{name}}", hotel.name);

  const shareActionText =
    t("share") || "Share";

  const normalizedHotelLocation =
    normalizeHotelDetailsWhitespace(hotel.location || "");

  const normalizedNeighbourhood =
    normalizeHotelDetailsWhitespace(
      hotel.neighbourhood || "",
    );

  const mapLocation =
    normalizedHotelLocation &&
    normalizedHotelLocation.length <= 240
      ? normalizedHotelLocation
      : normalizedNeighbourhood &&
          normalizedNeighbourhood.length <= 240
        ? normalizedNeighbourhood
        : "";

  const hasMapLocation =
    Boolean(mapLocation);

  const mapQuery = hasMapLocation
    ? normalizeHotelDetailsWhitespace(
        `${hotel.name}, ${mapLocation}`,
      )
    : "";

  const mapSearchParams = hasMapLocation
    ? new URLSearchParams({
        api: "1",
        query: mapQuery,
      })
    : null;

  const mapHref = isSafeHotelDetailsHttpUrl(hotel.sourceUrl)
    ? hotel.sourceUrl || ""
    : mapSearchParams
      ? `https://www.google.com/maps/search/?${mapSearchParams.toString()}`
      : "";
  const sourceAttributions = (hotel.sourceAttributions || [])
    .map((attribution) => ({
      provider: attribution.provider.trim(),
      providerUri: attribution.providerUri?.trim(),
    }))
    .filter((attribution) => attribution.provider);

  const mapActionText =
    t("hotelDetails.viewMap") ||
    t("viewMap") ||
    "View map";

  const mapHotelLabel = (
    t("hotelDetails.viewHotelOnMap") ||
    "View {{name}} on map"
  ).replace("{{name}}", hotel.name);

  const shareFeedbackText =
    shareStatus === "shared"
      ? t("hotelDetails.shared") ||
        "Hotel shared"
      : shareStatus === "copied"
        ? t("hotelDetails.linkCopied") ||
          "Link copied"
        : shareStatus === "error"
          ? t("hotelDetails.shareError") ||
            "Unable to share this hotel"
          : "";

  const staySummary = (() => {
    const checkInDate = parseHotelDetailsSearchDate(searchContext?.checkIn);
    const checkOutDate = parseHotelDetailsSearchDate(searchContext?.checkOut);
    const guestCount = parseHotelDetailsSearchCount(
      searchContext?.guests,
      1,
      12,
    );
    const roomCount = parseHotelDetailsSearchCount(
      searchContext?.rooms,
      1,
      6,
    );

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
      dateText:
        `${dateFormatter.format(checkInDate)} – ${dateFormatter.format(checkOutDate)}`,
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
    const nextIndex = getAdjacentHotelGalleryIndex(displayCandidates, failedImageUrls, activeIndex, direction);
    if (nextIndex !== -1) setPreferredImageIndex(nextIndex);
  }

  return (
    <main className="flex-1 bg-surface-muted/40">
      <section className="page-shell py-6 sm:py-8 lg:py-10">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-8">
          <HotelDetailsHeader
            resultsHref={resultsHref}
            backToResultsText={backToResultsText}
            badges={hotel.badges}
            name={hotel.name}
            savedHotelLabel={savedHotelLabel}
            isSaved={isSaved}
            hasValidPrice={hasValidPrice}
            saveRequiresLiveRateText={saveRequiresLiveRateText}
            onSave={() => { if (isSaved || hasValidPrice) void toggleSavedHotel(); }}
            saveActionText={saveActionText}
            shareHotelLabel={shareHotelLabel}
            onShare={() => { void shareHotel(); }}
            shareActionText={shareActionText}
            mapHref={mapHref}
            mapHotelLabel={mapHotelLabel}
            mapActionText={mapActionText}
            shareStatus={shareStatus}
            shareFeedbackText={shareFeedbackText}
            starRating={starRating}
            starRatingAriaLabel={starRating ? t("hotelResults.starHotelAria").replace("{{rating}}", formatHotelDetailsRating(starRating, locale)) : ""}
            isGoogleMapsProvider={hotel.provider === "Google Maps"}
            locationParts={locationParts}
            reviewBandVisible={Boolean(reviewBand)}
            reviewScore={reviewScore}
            reviewLabel={reviewLabel}
            reviewCountText={reviewCountText}
            sourceAttributions={sourceAttributions}
            isSafeAttributionUrl={isSafeHotelDetailsHttpUrl}
          />

          <HotelDetailsGallery
            activeUrl={activeUrl}
            hotelName={hotel.name}
            imageAlt={t("hotelResults.hotelImageAlt").replace("{{name}}", hotel.name).replace("{{location}}", hotel.location ? ` ${t("hotelResults.nearLocation").replace("{{location}}", hotel.location)}` : "")}
            imageUnavailableText={t("hotelResults.imageUnavailable")}
            showGalleryControls={showGalleryControls}
            onPrevious={() => selectAdjacentImage(-1)}
            onNext={() => selectAdjacentImage(1)}
            previousPhotoLabel={t("hotelResults.previousPhoto") || "Previous photo"}
            nextPhotoLabel={t("hotelResults.nextPhoto") || "Next photo"}
            photoCounter={photoCounter}
            photoPositionAnnouncement={photoPositionAnnouncement}
            usableIndices={usableIndices}
            displayCandidates={displayCandidates}
            activeIndex={activeIndex}
            activePosition={activePosition}
            selectPhotoLabel={t("hotelResults.selectPhoto") || "Show photo {{number}}"}
            viewAllPhotosLabel={t("hotelDetails.viewAllPhotos") || "View all photos"}
            openPhotoViewerLabel={t("hotelDetails.openPhotoViewer") || "Open photo {{current}} of {{total}} for {{hotelName}}"}
            closePhotoViewerLabel={t("hotelDetails.closePhotoViewer") || "Close photo viewer"}
            photoViewerTitle={(t("hotelDetails.photoViewerTitle") || "Photos for {{hotelName}}").replace("{{hotelName}}", hotel.name)}
            onSelectImage={setPreferredImageIndex}
            onImageError={markImageFailed}
          />

          <HotelDetailsBookingPanel
            priceDetailsAvailable={Boolean(priceDetails)}
            totalDisplayPrice={totalDisplayPrice}
            nightlyDisplayPrice={nightlyDisplayPrice}
            estimatedStayTotalText={t("hotelResults.estimatedStayTotal")}
            pricePerNightText={t("hotelResults.pricePerNight")}
            taxesText={taxesText}
            priceUnavailableText={priceUnavailableText}
            liveRateUnavailableText={liveRateUnavailableText}
            staySummary={staySummary}
            changeSearchHref={resultsHref}
            changeSearchText={
              t("hotelDetails.changeDatesGuests") ||
              "Change dates and guests"
            }
            providerPriceLabel={
              t("hotelDetails.providerPrice") || "Provider price"
            }
            providerText={hotel.provider && hotel.dataSource !== "demo" ? `${t("providedBy")} ${hotel.provider}` : ""}
            providerUnavailableText={providerUnavailableText}
            redirectError={redirectError}
            providerEnabled={providerEnabled}
            redirecting={redirecting}
            continueToProviderText={t("continueToProvider")}
            onContinue={continueToProvider}
            providerDisclaimerText={t("hotelDetails.providerDisclaimer") || enTranslations["hotelDetails.providerDisclaimer"]}
          />

          <HotelDetailsSections
            roomTitle={t("hotelResults.roomDetails") || "Room"}
            roomItems={[roomType, mealPlan]}
            cancellationTitle={t("hotelResults.cancellationDetails") || "Cancellation"}
            cancellationItems={[cancellationText]}
            amenitiesTitle={t("hotelResults.amenitiesDetails") || "Amenities"}
            amenityItems={amenityItems}
          />
        </div>
      </section>
    </main>
  );
}
