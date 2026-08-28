"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import {
  Award,
  Building2,
  Heart,
  MapPin,
  Star,
  Tag,
  type LucideIcon,
} from "lucide-react";
import type { PublicHotelResult } from "@/lib/types";
import { Button, LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useLocale } from "@/components/layout/LocaleProvider";
import { translations as enTranslations } from "@/lib/i18n/en";
import { useCurrencyRates } from "@/components/currency/CurrencyRatesProvider";
import { useRegion } from "@/components/region/RegionProvider";
import { formatDisplayPrice } from "@/lib/currency/formatCurrency";
import { getHotelPriceDetails } from "@/lib/hotels/hotelResultAvailability";
import {
  normalizeHotelClassificationStars,
  normalizeHotelReviewScale,
  normalizeHotelReviewScore,
} from "@/lib/hotels/hotelRatingSemantics";
import {
  getHotelReviewBand,
  getHotelReviewCount,
  type HotelReviewBand,
} from "@/components/results/hotelReviewPresentation";
import {
  buildHotelGalleryCandidates,
  resolveHotelGalleryIndex,
} from "@/components/results/hotelGalleryPresentation";
import type { SavedHotelSnapshot } from "@/components/results/hotelSavedStorage";
import { useSavedHotel } from "@/components/results/useSavedHotel";
import { HotelAmenityList } from "@/components/results/HotelAmenityList";
import { buildHotelAmenityPresentation } from "@/components/results/hotelAmenityPresentation";

function isSafeHttpUrl(value?: string) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function formatHotelRating(rating: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: Number.isInteger(rating) ? 0 : 1,
    minimumFractionDigits: Number.isInteger(rating) ? 0 : 1,
  }).format(rating);
}

function normalizeWhitespace(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function toTitleCase(value: string) {
  const normalized = normalizeWhitespace(value);

  if (!normalized) return "";

  const shouldNormalizeCase =
    normalized === normalized.toLocaleUpperCase() ||
    normalized === normalized.toLocaleLowerCase();
  const title = shouldNormalizeCase
    ? normalized.toLocaleLowerCase()
    : normalized;

  return title.replace(
    /(^|[\s/-])([\p{L}\p{N}])/gu,
    (_match, separator: string, character: string) =>
      `${separator}${character.toLocaleUpperCase()}`,
  );
}

function toSentenceCase(value: string) {
  const normalized = normalizeWhitespace(value);

  if (!normalized) return "";

  const shouldNormalizeCase =
    normalized === normalized.toLocaleUpperCase() ||
    normalized === normalized.toLocaleLowerCase();
  const sentence = shouldNormalizeCase
    ? normalized.toLocaleLowerCase()
    : normalized;

  return `${sentence.charAt(0).toLocaleUpperCase()}${sentence.slice(1)}`;
}

function isMealPlanText(value: string) {
  return /breakfast|room only|accommodation only|half board|full board|all[-\s]?inclusive/i.test(
    value,
  );
}

function getCancellationDisplay(
  cancellationInfo: string,
  t: (key: string) => string,
) {
  const policyText = normalizeWhitespace(cancellationInfo || "");

  if (!policyText) return null;

  if (/\bnon[-\s]?refundable\b|\bno refunds?\b/i.test(policyText)) {
    return { label: t("hotelResults.nonRefundable"), positive: false };
  }

  if (/\bfree cancellation\b/i.test(policyText)) {
    return { label: t("hotelResults.filter.freeCancellation"), positive: true };
  }

  if (/\bpay (?:at|on) (?:the )?property\b/i.test(policyText)) {
    return { label: t("hotelResults.payAtProperty"), positive: true };
  }

  if (/\bpay later\b/i.test(policyText)) {
    return { label: t("hotelResults.payLater"), positive: true };
  }

  if (/\bno prepayment\b/i.test(policyText)) {
    return { label: t("hotelResults.noPrepayment"), positive: true };
  }

  if (/\brefundable\b/i.test(policyText)) {
    return { label: t("hotelResults.refundable"), positive: true };
  }

  return null;
}

function translateKnownHotelLabel(value: string, t: (key: string) => string) {
  const normalized = normalizeWhitespace(value).toLocaleLowerCase();

  if (/^half board$/.test(normalized)) {
    return t("hotelResults.filter.halfBoard");
  }

  if (/^full board$/.test(normalized)) {
    return t("hotelResults.filter.fullBoard");
  }

  if (/^all[-\s]?inclusive$/.test(normalized)) {
    return t("hotelResults.filter.allInclusive");
  }

  if (/^double business$/.test(normalized)) {
    return t("hotelResults.filter.doubleBusiness");
  }

  if (/^bed and breakfast$/.test(normalized)) {
    return t("hotelResults.filter.bedAndBreakfast");
  }

  if (/^breakfast$/.test(normalized)) {
    return t("hotelResults.filter.breakfastIncludedAvailable");
  }

  if (/^(room only|accommodation only)$/.test(normalized)) {
    return t("hotelResults.filter.roomOnly");
  }

  if (/^double room$/.test(normalized)) {
    return t("hotelResults.filter.doubleRoom");
  }

  if (/^king bed$/.test(normalized)) {
    return t("hotelResults.filter.kingBed");
  }

  if (/^deluxe king room$/.test(normalized)) {
    return t("hotelResults.filter.deluxeKingRoom");
  }

  if (/^classic room$/.test(normalized)) {
    return t("hotelResults.filter.classicRoom");
  }

  if (/^luxury king$/.test(normalized)) {
    return t("hotelResults.filter.luxuryKing");
  }

  if (/^single standard$/.test(normalized)) {
    return t("hotelResults.filter.singleStandard");
  }

  if (/^superior room$/.test(normalized)) {
    return t("hotelResults.filter.superiorRoom");
  }

  if (/^superior double room$/.test(normalized)) {
    return t("hotelResults.filter.superiorDoubleRoom");
  }

  return value;
}

function getMealPlanDisplay(
  hotel: PublicHotelResult,
  normalizedRoomType: string,
  t: (key: string) => string,
) {
  const mealText = [hotel.roomType, ...hotel.amenities]
    .map((value) => toSentenceCase(value || ""))
    .find((value) => value && isMealPlanText(value));

  if (!mealText || toTitleCase(mealText) === normalizedRoomType) return "";

  return translateKnownHotelLabel(mealText, t);
}

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

type HotelSortBadge = "cheapest" | "bestValue" | "topRated";

type HotelCardProps = {
  hotel: PublicHotelResult;
  detailsHref?: string | null;
  sortBadge?: HotelSortBadge;
  actionLabel?: string;
  actionAriaLabel?: string;
  unavailableActionLabel?: string;
  unavailableActionAriaLabel?: string;
  allowExternalAttribution?: boolean;
  allowSave?: boolean;
};

export function HotelCard({
  hotel,
  detailsHref,
  sortBadge,
  actionLabel,
  actionAriaLabel,
  unavailableActionLabel,
  unavailableActionAriaLabel,
  allowExternalAttribution = true,
  allowSave = true,
}: HotelCardProps) {
  const { locale, t: dictionary } = useLocale();
  const { selectedOption } = useRegion();
  const currencyRates = useCurrencyRates();
  const t = (key: string) => dictionary[key] ?? enTranslations[key] ?? "";
  const starRating = normalizeHotelClassificationStars(
    hotel.classificationStars,
  );
  const resolvedDetailsHref =
    detailsHref === undefined
      ? `/hotels/details/${encodeURIComponent(hotel.id)}`
      : detailsHref;
  const explicitGalleryImages = useMemo(
    () => buildHotelGalleryCandidates(hotel.imageUrls, hotel.imageUrl),
    [hotel.imageUrl, hotel.imageUrls],
  );
  const [failedImageUrls, setFailedImageUrls] = useState<Set<string>>(
    () => new Set(),
  );
  const resolvedActiveImageIndex = resolveHotelGalleryIndex(
    explicitGalleryImages,
    failedImageUrls,
    0,
  );
  const availableImageIndices = explicitGalleryImages.reduce<number[]>(
    (indices, url, index) => {
      if (!failedImageUrls.has(url)) indices.push(index);
      return indices;
    },
    [],
  );
  const activeGalleryImageUrl =
    resolvedActiveImageIndex >= 0
      ? explicitGalleryImages[resolvedActiveImageIndex]
      : "";
  const displayImageUrl = activeGalleryImageUrl;
  const rawRoomTypeText = hotel.roomType ? toTitleCase(hotel.roomType) : "";
  const mealPlanText = getMealPlanDisplay(hotel, rawRoomTypeText, t);
  const cancellationDisplay = getCancellationDisplay(hotel.cancellationInfo, t);
  const expandedAmenityItems = buildHotelAmenityPresentation(
    hotel.amenities,
    8,
  );
  const collapsedAmenityItems = expandedAmenityItems.slice(0, 4);
  const hasBreakfastAmenity = expandedAmenityItems.some(
    (item) => item.iconKey === "breakfast",
  );
  const shouldShowMealPlanText =
    Boolean(mealPlanText) &&
    (!hasBreakfastAmenity || !/^breakfast/i.test(mealPlanText));
  const reviewScale = normalizeHotelReviewScale(hotel.reviewScale);
  const reviewScore = normalizeHotelReviewScore(hotel.reviewScore, reviewScale);
  const reviewBand = getHotelReviewBand(reviewScore, reviewScale);
  const reviewCount = getHotelReviewCount(hotel.reviewCount);
  const reviewLabel = reviewBand
    ? t(reviewLabelKeys[reviewBand]) || reviewLabelFallbacks[reviewBand]
    : "";
  const formattedReviewScore = reviewBand
    ? new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(
        typeof reviewScore === "number" ? reviewScore : 0,
      )
    : "";
  const formattedReviewCount =
    reviewCount !== null
      ? new Intl.NumberFormat(locale).format(reviewCount)
      : "";
  const reviewCountText =
    reviewCount !== null
      ? (reviewCount === 1
          ? t("hotelResults.review.single") || "{{count}} review"
          : t("hotelResults.review.multiple") || "{{count}} reviews"
        ).replace("{{count}}", formattedReviewCount)
      : "";
  const priceDetails = getHotelPriceDetails(hotel);
  const hasValidPrice = priceDetails !== null;
  const priceUnavailableText =
    t("hotelResults.priceUnavailable") || "Price unavailable";
  const liveRateUnavailableText =
    t("hotelResults.liveRateUnavailable") ||
    "No live room rate is available for the selected dates.";
  const saveRequiresLiveRateText =
    t("hotelResults.saveRequiresLiveRate") ||
    "Saving is available once a live room rate is provided.";
  const sortBadgeConfig =
    sortBadge &&
    ((sortBadge !== "cheapest" && sortBadge !== "bestValue") || hasValidPrice)
      ? (
          {
            cheapest: {
              label: t("hotelResults.cheapest") || "Cheapest",
              Icon: Tag,
              className: "border-emerald-100 bg-emerald-50 text-emerald-700",
            },
            bestValue: {
              label: t("hotelResults.bestValue") || "Best value",
              Icon: Award,
              className: "border-blue-100 bg-blue-50 text-[#004BB8]",
            },
            topRated: {
              label: t("hotelResults.topRated") || "Top rated",
              Icon: Star,
              className: "border-amber-100 bg-amber-50 text-amber-700",
            },
          } satisfies Record<
            HotelSortBadge,
            {
              label: string;
              Icon: LucideIcon;
              className: string;
            }
          >
        )[sortBadge]
      : null;
  const SortBadgeIcon = sortBadgeConfig?.Icon;
  const sourceAttributions = (hotel.sourceAttributions || [])
    .map((attribution) => ({
      provider: attribution.provider.trim(),
      providerUri: attribution.providerUri?.trim(),
    }))
    .filter((attribution) => attribution.provider);
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
  const pricePerNightTemplate = t("hotelResults.pricePerNight");
  const perNightLabel = pricePerNightTemplate
    .replace(/\{\{\s*price\s*\}\}/g, "")
    .trim();

  function getHotelSnapshot(): SavedHotelSnapshot {
    if (resolvedDetailsHref === null) {
      throw new Error("Unavailable Hotel actions cannot be saved.");
    }

    const snapshotPrice = getHotelPriceDetails(hotel);
    if (!snapshotPrice) {
      throw new Error("Cannot save a hotel without a valid live room rate.");
    }

    const params = new URLSearchParams(window.location.search);
    const checkIn =
      params.get("checkIn") || new Date().toISOString().slice(0, 10);
    const checkOut = params.get("checkOut") || checkIn;
    const image = displayImageUrl || undefined;

    return {
      id: hotel.id,
      provider: hotel.provider || "hotel",
      hotelName: hotel.name,
      destination: hotel.location || hotel.neighbourhood || hotel.name,
      checkIn: `${checkIn}T00:00:00.000Z`,
      checkOut: `${checkOut}T00:00:00.000Z`,
      totalPrice: snapshotPrice.totalPrice,
      currency: snapshotPrice.currency,
      image,
      imageAlt: hotel.name,
      location: hotel.location,
      rating: hotel.rating,
      href: resolvedDetailsHref,
      savedAt: new Date().toISOString(),
    };
  }

  const { isSaved, toggleSavedHotel } = useSavedHotel({
    hotelId: hotel.id,
    getSnapshot: getHotelSnapshot,
  });

  const savedHotelLabel = (
    isSaved
      ? t("hotelResults.removeSavedHotel") ||
        "Remove {{name}} from saved hotels"
      : hasValidPrice
        ? t("hotelResults.saveHotel") || "Save {{name}}"
        : saveRequiresLiveRateText
  ).replace("{{name}}", hotel.name);

  function markImageFailed(url: string) {
    if (!url) return;

    setFailedImageUrls((current) => {
      if (current.has(url)) return current;
      const next = new Set(current);
      next.add(url);
      return next;
    });
  }

  const showGalleryControls = availableImageIndices.length > 1;
  const activeGalleryPosition = availableImageIndices.indexOf(
    resolvedActiveImageIndex,
  );
  const photoCounterText = (
    t("hotelResults.photoCounter") || "{{current}} of {{total}} photos"
  )
    .replace("{{current}}", String(activeGalleryPosition + 1))
    .replace("{{total}}", String(availableImageIndices.length));

  function renderSaveButton(className: string) {
    if (!allowSave) return null;

    return (
      <button
        type="button"
        aria-label={savedHotelLabel}
        aria-pressed={isSaved}
        title={
          isSaved || hasValidPrice ? savedHotelLabel : saveRequiresLiveRateText
        }
        disabled={!isSaved && !hasValidPrice}
        className={`${className} z-20 flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full border border-transparent bg-transparent transition hover:bg-slate-100/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004BB8] ${
          isSaved
            ? "text-rose-600"
            : "text-slate-700"
        }`}
        onClick={() => {
          if (isSaved || hasValidPrice) void toggleSavedHotel();
        }}
      >
        <Heart
          size={20}
          aria-hidden="true"
          fill={isSaved ? "currentColor" : "none"}
        />
      </button>
    );
  }

  return (
    <Card className="mx-auto w-[calc(100%+0.5rem)] max-w-[800px] overflow-hidden rounded-xl border-slate-200 bg-white shadow-[0_16px_38px_-26px_rgba(2,28,43,0.22)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_44px_-24px_rgba(2,28,43,0.26)] sm:w-full">
      <div
        data-hotel-card-mobile-grid
        className="grid min-h-[260px] grid-cols-[41%_minmax(0,1fr)] md:min-h-0 md:grid-cols-[40%_minmax(0,1fr)]"
      >
        <div
          data-hotel-card-image
          className="relative h-full min-h-[260px] bg-surface-muted md:min-h-[230px] lg:min-h-[240px]"
        >
          {renderSaveButton(
            "absolute right-2 top-2 hidden shadow-lg hover:bg-white md:flex",
          )}
          {displayImageUrl ? (
            <>
              <Image
                src={displayImageUrl}
                alt={t("hotelResults.hotelImageAlt")
                  .replace("{{name}}", hotel.name)
                  .replace(
                    "{{location}}",
                    hotel.location
                      ? ` ${t("hotelResults.nearLocation").replace("{{location}}", hotel.location)}`
                      : "",
                  )}
                fill
                className="object-cover"
                sizes="(min-width: 768px) 320px, 41vw"
                onError={() => markImageFailed(displayImageUrl)}
              />
              {showGalleryControls ? (
                <div className="absolute bottom-2 left-2 max-w-[calc(100%-1rem)] whitespace-nowrap rounded-full bg-slate-950/75 px-2 py-1 text-[10px] font-semibold text-white shadow-lg ring-1 ring-white/30 sm:text-xs">
                  {photoCounterText}
                </div>
              ) : null}
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-blue/10 via-surface to-surface-subtle px-5 text-center">
              <Building2 size={36} className="text-blue" aria-hidden="true" />
              <span className="max-w-[180px] text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("hotelResults.imageUnavailable")}
              </span>
            </div>
          )}
        </div>
        <div
          data-hotel-card-details
          className="flex min-w-0 flex-col px-3 py-3 md:min-h-0 md:px-3 md:py-3"
        >
          <div className="flex flex-1 flex-col">
            <div className="min-w-0">
              <div>
                <div className="flex min-w-0 items-start justify-between gap-1.5 md:gap-3">
                  <div className="min-w-0 flex-1">
                    <h2 className="min-w-0 text-[15px] font-bold leading-5 text-slate-950 sm:text-base lg:text-[17px]">
                      {hotel.name}
                    </h2>
                  </div>
                  {renderSaveButton("flex -me-1.5 -mt-1.5 md:hidden")}
                </div>

                {sortBadgeConfig && SortBadgeIcon ? (
                  <span
                    className={`mt-1 inline-flex max-w-full items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold leading-4 md:px-2 md:text-[11px] ${sortBadgeConfig.className}`}
                  >
                    <SortBadgeIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    {sortBadgeConfig.label}
                  </span>
                ) : null}

                {starRating ? (
                  <div
                    className="mt-1 flex items-center"
                    aria-label={t("hotelResults.starHotelAria").replace(
                      "{{rating}}",
                      formatHotelRating(starRating, locale),
                    )}
                    title={t("hotelResults.starHotelAria").replace(
                      "{{rating}}",
                      formatHotelRating(starRating, locale),
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className="text-[14px] leading-5 tracking-[0.08em] text-amber-500"
                    >
                      {"★".repeat(starRating)}
                    </span>
                  </div>
                ) : null}

                <p className="mt-1 flex min-w-0 items-start gap-x-1 text-[12px] font-semibold leading-4 text-[#004BB8] sm:text-[13px] lg:text-sm">
                  <MapPin
                    size={14}
                    className="mt-px shrink-0 text-[#004BB8]"
                    aria-hidden="true"
                  />
                  <span className="min-w-0">{hotel.location}</span>
                </p>
              </div>
              {reviewBand || reviewCountText ? (
                <div className="mt-1.5 flex flex-wrap items-center gap-1 text-[10px] font-semibold text-slate-600 md:mt-2 md:gap-1.5 md:text-[11px]">
                  {reviewBand ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-2 py-0.5 text-white">
                      <span>
                        {formattedReviewScore} / {reviewScale}
                      </span>
                      <span>{reviewLabel}</span>
                    </span>
                  ) : null}
                  {reviewCountText ? (
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
                      {reviewCountText}
                    </span>
                  ) : null}
                </div>
              ) : null}
              {sourceAttributions.length ? (
                <div className="mt-1.5 flex flex-wrap items-center gap-1 text-[10px] font-medium text-slate-600 md:mt-2 md:gap-1.5 md:text-[11px]">
                  {sourceAttributions.map((attribution, index) => (
                    <span
                      key={`${attribution.provider}-${index}`}
                      className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5"
                    >
                      <span>Data:</span>
                      {allowExternalAttribution &&
                      isSafeHttpUrl(attribution.providerUri) ? (
                        <a
                          href={attribution.providerUri}
                          target="_blank"
                          rel="noopener noreferrer"
                          translate="no"
                          className="text-[#004BB8] hover:underline"
                        >
                          {attribution.provider}
                        </a>
                      ) : (
                        <span translate="no">{attribution.provider}</span>
                      )}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
            <div data-hotel-card-amenities className="mt-2 min-w-0 md:mt-3">
              {shouldShowMealPlanText || collapsedAmenityItems.length > 0 ? (
                <div className="space-y-1.5">
                  {shouldShowMealPlanText ? (
                    <p className="text-[11px] font-normal leading-4 text-slate-600 md:text-[13px] md:leading-5">
                      {mealPlanText}
                    </p>
                  ) : null}
                  <HotelAmenityList
                    items={collapsedAmenityItems}
                    t={t}
                    className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] leading-4 md:gap-x-3 md:gap-y-1.5 md:text-xs"
                  />
                </div>
              ) : null}
              {cancellationDisplay ? (
                <p
                  className={
                    cancellationDisplay.positive
                      ? "mt-1.5 text-[11px] font-medium leading-4 text-emerald-700 md:mt-2 md:text-[13px] md:leading-5"
                      : "mt-1.5 text-[11px] font-medium leading-4 text-slate-600 md:mt-2 md:text-[13px] md:leading-5"
                  }
                >
                  {cancellationDisplay.label}
                </p>
              ) : null}
            </div>
            <div className="mt-auto pt-2 md:pt-3">
              <div data-hotel-card-price className="min-w-0 text-end">
                <div className="min-w-0 text-end">
                  {priceDetails && nightlyDisplayPrice ? (
                    <div
                      className="min-w-0"
                      title={nightlyDisplayPrice.title}
                      aria-label={nightlyDisplayPrice.ariaLabel}
                    >
                      <span
                        aria-hidden="true"
                        className="block whitespace-nowrap text-lg font-bold leading-6 text-slate-950 tabular-nums sm:text-xl"
                      >
                        {nightlyDisplayPrice.formatted}
                      </span>
                      <span
                        aria-hidden="true"
                        className="mt-0.5 block text-xs font-medium leading-4 text-slate-500"
                      >
                        {perNightLabel}
                      </span>
                    </div>
                  ) : (
                    <div className="min-w-0 space-y-1">
                      <p className="text-lg font-bold leading-6 text-slate-950">
                        {priceUnavailableText}
                      </p>
                      <p className="text-xs font-medium leading-5 text-slate-500">
                        {liveRateUnavailableText}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div data-hotel-card-action className="mt-1.5 flex justify-end">
                {resolvedDetailsHref === null ? (
                  <Button
                    type="button"
                    disabled
                    aria-label={unavailableActionAriaLabel}
                    variant="secondary"
                    size="sm"
                    className="h-10 min-h-10 w-auto whitespace-normal rounded-lg px-3 text-sm font-semibold"
                  >
                    {unavailableActionLabel ||
                      t("deals.guided.hotelResults.roomsUnavailable")}
                  </Button>
                ) : (
                  <LinkButton
                    href={resolvedDetailsHref}
                    aria-label={actionAriaLabel}
                    variant="accent"
                    size="sm"
                    className="h-10 min-h-10 w-auto whitespace-nowrap rounded-lg border border-[#004BB8] bg-[#004BB8] px-3.5 text-sm font-semibold text-white shadow-none hover:border-[#003B91] hover:bg-[#003B91] focus-visible:ring-2 focus-visible:ring-[#004BB8]/35"
                  >
                    {actionLabel || t("hotelResults.viewHotel") || "View hotel"}
                  </LinkButton>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
