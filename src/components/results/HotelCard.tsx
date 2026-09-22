"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Award,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  Heart,
  MapPin,
  Share2,
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
import { MobileHotelPriceText } from "./MobileHotelPriceText";
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
  providerLabel?: string;
  actionAriaLabel?: string;
  unavailableActionLabel?: string;
  unavailableActionAriaLabel?: string;
  allowExternalAttribution?: boolean;
  allowSave?: boolean;
  stayNights?: number;
};

export function HotelCard({
  hotel,
  detailsHref,
  sortBadge,
  actionLabel,
  providerLabel,
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
  const [requestedImageIndex, setRequestedImageIndex] = useState(0);
  const [shareStatus, setShareStatus] = useState<
    "idle" | "shared" | "unavailable"
  >("idle");
  const resolvedActiveImageIndex = resolveHotelGalleryIndex(
    explicitGalleryImages,
    failedImageUrls,
    requestedImageIndex,
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
  const mealPlanText = hotel.catalogueProfile?.mealPlan
    ? toSentenceCase(hotel.catalogueProfile.mealPlan)
    : "";
  const cancellationDisplay = hotel.catalogueProfile?.cancellationPolicy
    ? getCancellationDisplay(hotel.catalogueProfile.cancellationPolicy, t)
    : null;
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

  function renderSaveButton(
    className: string,
    horizontalAlignment = "justify-center",
  ) {
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
        className={`${className} ${horizontalAlignment} z-20 flex min-h-11 min-w-11 shrink-0 items-center rounded-full border border-transparent bg-transparent transition hover:bg-slate-100/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004BB8] ${
          isSaved ? "text-rose-600" : "text-slate-700"
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

  async function shareHotel() {
    if (!resolvedDetailsHref) return;
    const url = new URL(resolvedDetailsHref, window.location.origin).toString();
    try {
      if (navigator.share) {
        await navigator.share({ title: hotel.name, url });
      } else {
        await navigator.clipboard.writeText(url);
      }
      setShareStatus("shared");
      window.setTimeout(() => setShareStatus("idle"), 2400);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setShareStatus("unavailable");
      window.setTimeout(() => setShareStatus("idle"), 2400);
    }
  }

  function moveGallery(direction: -1 | 1) {
    if (availableImageIndices.length < 2) return;
    const currentPosition = Math.max(0, activeGalleryPosition);
    const nextPosition =
      (currentPosition + direction + availableImageIndices.length) %
      availableImageIndices.length;
    setRequestedImageIndex(availableImageIndices[nextPosition]);
  }

  function renderShareButton(
    className: string,
    horizontalAlignment = "justify-center",
  ) {
    if (!resolvedDetailsHref || !allowSave) return null;
    return (
      <button
        type="button"
        aria-label={
          shareStatus === "shared"
            ? `${hotel.name} shared`
            : shareStatus === "unavailable"
              ? `Sharing ${hotel.name} is unavailable`
            : `Share ${hotel.name}`
        }
        className={`${className} ${horizontalAlignment} z-20 flex min-h-11 min-w-11 shrink-0 items-center rounded-full border border-transparent bg-transparent text-slate-700 transition hover:bg-slate-100/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004BB8]`}
        onClick={() => void shareHotel()}
      >
        {shareStatus === "shared" ? (
          <Check size={19} aria-hidden="true" />
        ) : (
          <Share2 size={19} aria-hidden="true" />
        )}
      </button>
    );
  }

  return (
    <Card className="relative mx-auto w-full max-w-[800px] overflow-hidden rounded-[13px] border-[#D8E1EC] bg-white shadow-[0_2px_10px_rgba(24,48,91,0.08)] transition sm:rounded-2xl sm:border-slate-200 sm:bg-white sm:shadow-[0_16px_38px_-26px_rgba(2,28,43,0.22)] sm:hover:-translate-y-0.5 sm:hover:border-slate-300 sm:hover:shadow-[0_22px_50px_-24px_rgba(2,28,43,0.30)] focus-within:border-[#004BB8]/40 focus-within:ring-2 focus-within:ring-[#004BB8]/10 motion-reduce:transform-none motion-reduce:transition-none sm:w-full lg:mx-0 lg:max-w-none">
      {resolvedDetailsHref ? (
        <Link
          href={resolvedDetailsHref}
          aria-hidden="true"
          tabIndex={-1}
          className="absolute inset-0 z-10 sm:hidden"
        />
      ) : null}
      {providerLabel ? <p className="hidden px-4 pt-3 text-xs font-semibold text-amber-800 sm:block">{providerLabel}</p> : null}
      <div
        data-hotel-card-mobile-grid
        className="grid min-h-[calc((100vw-2rem)*0.7)] grid-cols-[38%_minmax(0,1fr)] min-[430px]:min-h-[260px] min-[430px]:grid-cols-[39%_minmax(0,1fr)] sm:min-h-[260px] sm:grid-cols-[39%_minmax(0,1fr)] md:min-h-0 md:grid-cols-[40%_minmax(0,1fr)] lg:grid-cols-[clamp(280px,36%,340px)_minmax(0,1fr)]"
      >
        <div
          data-hotel-card-image
          className="relative h-full min-h-[calc((100vw-2rem)*0.7)] overflow-hidden bg-[#E9EDF3] min-[430px]:min-h-[260px] sm:min-h-[260px] sm:bg-slate-200 md:min-h-[230px] lg:min-h-[240px]"
        >
          <div className="absolute right-2 top-2 z-20 hidden items-center gap-0.5 md:flex lg:hidden">
            {renderSaveButton("flex hover:bg-white/90")}
            {renderShareButton("flex hover:bg-white/90")}
          </div>
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
                className="bg-slate-200 object-cover"
                sizes="(min-width: 768px) 320px, 38vw"
                onError={() => markImageFailed(displayImageUrl)}
              />
              {showGalleryControls ? (
                <>
                  <button
                    type="button"
                    aria-label={`Previous photo of ${hotel.name}`}
                    onClick={() => moveGallery(-1)}
                    className="absolute left-0 top-1/2 z-30 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center bg-transparent text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)] transition hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white motion-reduce:transition-none"
                  >
                    <ChevronLeft className="h-5 w-5 -translate-x-2.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Next photo of ${hotel.name}`}
                    onClick={() => moveGallery(1)}
                    className="absolute right-0 top-1/2 z-30 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center bg-transparent text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)] transition hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white motion-reduce:transition-none"
                  >
                    <ChevronRight className="h-5 w-5 translate-x-2.5" aria-hidden="true" />
                  </button>
                  <div className="absolute bottom-2 left-2 max-w-[calc(100%-1rem)] whitespace-nowrap rounded-full bg-slate-950/75 px-2 py-1 text-[11px] font-semibold text-white shadow-lg ring-1 ring-white/30 sm:text-xs" aria-live="polite">
                    {photoCounterText}
                  </div>
                </>
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
          className="relative flex min-w-0 flex-col bg-white p-2 min-[430px]:p-3 sm:bg-white sm:p-3 md:min-h-0 md:p-3"
        >
          <div className="flex flex-1 flex-col">
            <div className="min-w-0">
              <div>
                <div className="relative min-w-0">
                  <div className="min-w-0 sm:pe-[88px] md:pe-0 lg:pe-[88px]">
                    <h2 className="min-w-0 text-[15px] font-bold leading-5 text-[#071A48] sm:line-clamp-2 sm:text-base sm:font-bold sm:leading-5 lg:line-clamp-2 lg:text-[17px]">
                      <span aria-hidden="true" className="float-end h-9 w-[76px] sm:hidden" />
                      {hotel.name}
                    </h2>
                  </div>
                  <div
                    data-hotel-utility-actions
                    className="absolute -end-2.5 -top-2 flex shrink-0 items-center gap-0 sm:-end-3 md:hidden"
                  >
                    {renderSaveButton("flex pe-1", "justify-end")}
                    {renderShareButton("flex ps-1", "justify-start")}
                  </div>
                  <div
                    data-hotel-desktop-utility-actions
                    className="absolute -end-3 -top-2 hidden shrink-0 items-center gap-0 lg:flex"
                  >
                    {renderSaveButton("flex pe-1", "justify-end")}
                    {renderShareButton("flex ps-1", "justify-start")}
                  </div>
                </div>
                {providerLabel ? (
                  <p data-hotel-provider-label className="mt-1 line-clamp-1 text-[10px] font-normal leading-[14px] text-[#56658E] sm:hidden">
                    {providerLabel}
                  </p>
                ) : null}

                {sortBadgeConfig && SortBadgeIcon ? (
                  <span
                    className={`mt-1 inline-flex max-w-full items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-semibold leading-4 md:px-2 ${sortBadgeConfig.className}`}
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
                      className="text-[14px] leading-5 tracking-[0.06em] text-[#FFB800] sm:text-[14px] sm:leading-5 sm:tracking-[0.08em]"
                    >
                      {"★".repeat(starRating)}
                    </span>
                  </div>
                ) : null}

                <p className="mt-1 flex min-w-0 items-start gap-x-1 text-[12px] font-semibold leading-4 text-[#004BB8] sm:text-[13px] sm:font-semibold sm:leading-4 sm:text-[#004BB8] lg:text-sm">
                  <MapPin
                    size={14}
                    className="mt-px shrink-0 text-[#004BB8]"
                    aria-hidden="true"
                  />
                  <span className="min-w-0 line-clamp-1 sm:line-clamp-none">{hotel.location}</span>
                </p>
              </div>
              {reviewBand || reviewCountText ? (
                <div className="mt-1.5 flex flex-wrap items-center gap-1 text-[11px] font-normal leading-[15px] text-[#071A48] sm:text-[12px] sm:font-semibold sm:leading-4 sm:text-slate-600 md:mt-2 md:gap-1.5">
                  {reviewBand ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#0754F7] px-2 py-0.5 text-white sm:bg-slate-900">
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
                <div className="mt-1.5 hidden flex-wrap items-center gap-1 text-[11px] font-medium leading-4 text-slate-600 sm:flex md:mt-2 md:gap-1.5">
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
                          className="relative z-20 text-[#004BB8] hover:underline"
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
                    <p className="text-[11px] font-normal leading-[15px] text-[#071A48] sm:text-[12px] sm:leading-[18px] sm:text-slate-600 md:text-[13px] md:leading-5">
                      {mealPlanText}
                    </p>
                  ) : null}
                  <HotelAmenityList
                    items={collapsedAmenityItems}
                    t={t}
                    className="grid grid-cols-1 gap-y-[3px] text-[13px] font-normal leading-[19px] text-[#56658E] max-sm:[&>li]:text-[13px] max-sm:[&>li]:font-normal max-sm:[&>li]:leading-[19px] max-sm:[&>li]:text-[#56658E] max-sm:[&>li>svg]:h-[15px] max-sm:[&>li>svg]:w-[15px] max-sm:[&>li>svg]:text-[#1A1A1A] sm:gap-y-1 sm:text-[12px] sm:leading-[18px] md:grid-cols-2 md:gap-x-3 md:gap-y-1.5 md:text-xs md:leading-4"
                  />
                </div>
              ) : null}
              {cancellationDisplay ? (
                <p
                  className={
                    cancellationDisplay.positive
                      ? "mt-1.5 text-[11px] font-normal leading-[15px] text-[#071A48] sm:text-[12px] sm:font-medium sm:leading-[18px] sm:text-emerald-700 md:mt-2 md:text-[13px] md:leading-5"
                      : "mt-1.5 text-[11px] font-normal leading-[15px] text-[#071A48] sm:text-[12px] sm:font-medium sm:leading-[18px] sm:text-slate-600 md:mt-2 md:text-[13px] md:leading-5"
                  }
                >
                  {cancellationDisplay.label}
                </p>
              ) : null}
              {sourceAttributions.length ? (
                <p className="mt-1 line-clamp-1 text-[11px] font-medium leading-4 text-slate-500 sm:hidden">
                  <span>Source: </span>
                  {allowExternalAttribution && isSafeHttpUrl(sourceAttributions[0]?.providerUri) ? (
                    <a
                      href={sourceAttributions[0]?.providerUri}
                      target="_blank"
                      rel="noopener noreferrer"
                      translate="no"
                      className="relative z-20 text-[#004BB8] hover:underline"
                    >
                      {sourceAttributions[0]?.provider}
                    </a>
                  ) : (
                    <span translate="no">{sourceAttributions[0]?.provider}</span>
                  )}
                  {sourceAttributions.length > 1 ? <span>{` +${sourceAttributions.length - 1}`}</span> : null}
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
                        className="block whitespace-nowrap text-[18px] font-bold leading-6 text-[#071A48] tabular-nums sm:text-xl sm:font-bold sm:leading-6 sm:text-slate-950"
                      >
                        <MobileHotelPriceText text={nightlyDisplayPrice.formatted} />
                      </span>
                      <span
                        aria-hidden="true"
                        className="mt-px block text-[12px] font-medium leading-4 text-[#56658E] sm:mt-0.5 sm:text-xs sm:leading-4 sm:text-slate-500"
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
                        <span className="sm:hidden">No live rate</span>
                        <span className="hidden sm:inline">{liveRateUnavailableText}</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div data-hotel-card-action className="mt-1 flex justify-end sm:mt-1.5">
                {resolvedDetailsHref === null ? (
                  <>
                    <span className="min-h-9 text-end text-[13px] font-semibold leading-5 text-slate-500 sm:hidden">
                      {unavailableActionLabel || t("deals.guided.hotelResults.roomsUnavailable")}
                    </span>
                    <Button
                      type="button"
                      disabled
                      aria-label={unavailableActionAriaLabel}
                      variant="secondary"
                      size="sm"
                      className="hidden h-10 min-h-10 w-auto whitespace-normal rounded-lg px-3 text-sm font-semibold sm:inline-flex"
                    >
                      {unavailableActionLabel || t("deals.guided.hotelResults.roomsUnavailable")}
                    </Button>
                  </>
                ) : (
                  <LinkButton
                    href={resolvedDetailsHref}
                    aria-label={actionAriaLabel}
                    variant="accent"
                    size="sm"
                    className="relative z-20 h-9 min-h-9 w-auto whitespace-nowrap rounded-lg border border-transparent bg-transparent px-0 text-[13px] font-semibold leading-4 text-[#0754F7] shadow-none sm:h-10 sm:min-h-10 sm:text-sm sm:leading-5 sm:text-[#004BB8] hover:border-transparent hover:bg-transparent hover:text-[#003B91] focus-visible:ring-2 focus-visible:ring-[#004BB8]/35 sm:h-10 sm:min-h-10 sm:border-[#004BB8] sm:bg-[#004BB8] sm:px-3.5 sm:text-white sm:hover:border-[#003B91] sm:hover:bg-[#003B91] sm:hover:text-white"
                  >
                    {actionLabel || t("hotelResults.viewHotel") || "View hotel"}
                    <ChevronRight className="h-4 w-4 sm:hidden" aria-hidden="true" />
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
