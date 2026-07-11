"use client";

import Image from "next/image";
import { useEffect, useId, useMemo, useState } from "react";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Heart,
  MapPin,
} from "lucide-react";
import type { PublicHotelResult } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useLocale } from "@/components/layout/LocaleProvider";
import { translations as enTranslations } from "@/lib/i18n/en";
import { formatCurrency } from "@/lib/utils";
import {
  getHotelReviewBand,
  getHotelReviewCount,
  type HotelReviewBand,
} from "@/components/results/hotelReviewPresentation";
import {
  buildHotelGalleryCandidates,
  getAdjacentHotelGalleryIndex,
  resolveHotelGalleryIndex,
} from "@/components/results/hotelGalleryPresentation";
import {
  isHotelIdSaved,
  parseSavedHotelIds,
  SAVED_HOTEL_IDS_CHANGED_EVENT,
  SAVED_HOTEL_IDS_STORAGE_KEY,
  serializeSavedHotelIds,
  toggleSavedHotelId,
} from "@/components/results/hotelSavedStorage";

function getHotelStarRating(rating: number) {
  if (!Number.isFinite(rating) || rating <= 0) return null;
  return Math.min(Math.max(Math.floor(rating), 1), 5);
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

function isCancellationText(value: string) {
  return /cancellation|cancel|policy|refund|prepayment/i.test(value);
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

function getDistanceDisplay(distanceFromCenter?: string) {
  const distanceText = distanceFromCenter
    ? toSentenceCase(distanceFromCenter)
    : "";

  if (!distanceText) return "";

  if (
    /^(central|transit-friendly area|central or transit-friendly area)$/i.test(
      distanceText,
    )
  ) {
    return "";
  }

  return distanceText;
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
  roomTypeText: string,
  t: (key: string) => string,
) {
  const mealText = [hotel.roomType, ...hotel.amenities]
    .map((value) => toSentenceCase(value || ""))
    .find((value) => value && isMealPlanText(value));

  if (!mealText || toTitleCase(mealText) === roomTypeText) return "";

  return translateKnownHotelLabel(mealText, t);
}

function getCanonicalAmenityTranslationKey(value: string) {
  const normalized = normalizeWhitespace(value)
    .toLocaleLowerCase()
    .replace(/[‐‑‒–—]/g, "-");

  if (/^(free wi-fi|wi-fi|wifi)$/.test(normalized)) {
    return "hotelResults.filter.freeWifi";
  }

  if (/^parking$/.test(normalized)) {
    return "hotelResults.filter.parking";
  }

  if (/^pool$/.test(normalized)) {
    return "hotelResults.filter.pool";
  }

  if (/^airport shuttle$/.test(normalized)) {
    return "hotelResults.filter.airportShuttle";
  }

  if (/^(spa|wellness)$/.test(normalized)) {
    return "hotelResults.filter.spa";
  }

  if (/^(fitness center|fitness|gym)$/.test(normalized)) {
    return "hotelResults.filter.fitnessCenter";
  }

  if (/^(workspace|desk)$/.test(normalized)) {
    return "hotelResults.filter.workspace";
  }

  if (/^(quiet rooms|quiet)$/.test(normalized)) {
    return "hotelResults.filter.quietRooms";
  }

  if (/^(24-hour front desk|front desk)$/.test(normalized)) {
    return "hotelResults.filter.frontDesk24";
  }

  if (/^late check-in$/.test(normalized)) {
    return "hotelResults.filter.lateCheckIn";
  }

  return null;
}

function getAmenityDisplay(
  amenities: string[],
  mealPlanText: string,
  t: (key: string) => string,
  limit = 3,
) {
  const seen = new Set<string>();
  const mealPlanKey = mealPlanText.toLocaleLowerCase();

  return amenities
    .map((amenity) => toSentenceCase(amenity))
    .filter((amenity) => {
      if (
        !amenity ||
        isCancellationText(amenity) ||
        isMealPlanText(amenity) ||
        /verified partner inventory/i.test(amenity) ||
        /^(central|transit-friendly area|central or transit-friendly area)$/i.test(
          amenity,
        )
      ) {
        return false;
      }

      const translationKey = getCanonicalAmenityTranslationKey(amenity);
      const key = translationKey ?? amenity.toLocaleLowerCase();
      if (mealPlanKey && amenity.toLocaleLowerCase() === mealPlanKey) {
        return false;
      }
      if (seen.has(key)) return false;

      seen.add(key);
      return true;
    })
    .map((amenity) => {
      const translationKey = getCanonicalAmenityTranslationKey(amenity);

      return translationKey ? t(translationKey) : amenity;
    })
    .slice(0, limit);
}

const fallbackHotelImages = [
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=90",
  "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1200&q=90",
  "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=90",
  "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1200&q=90",
  "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=90",
  "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&w=1200&q=90",
  "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1200&q=90",
  "https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=1200&q=90",
];

function getDeterministicFallbackImage(hotel: PublicHotelResult) {
  const identity = `${hotel.id || ""}-${hotel.name || ""}-${hotel.location || ""}`;
  let hash = 0;

  for (let index = 0; index < identity.length; index += 1) {
    hash = (hash * 31 + identity.charCodeAt(index)) >>> 0;
  }

  return fallbackHotelImages[hash % fallbackHotelImages.length];
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

type HotelCardProps = {
  hotel: PublicHotelResult;
};

export function HotelCard({ hotel }: HotelCardProps) {
  const { locale, t: dictionary } = useLocale();
  const t = (key: string) => dictionary[key] ?? enTranslations[key] ?? "";
  const detailsRegionId = useId();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [preferredImageIndex, setPreferredImageIndex] = useState(0);
  const starRating = getHotelStarRating(hotel.rating);
  const fallbackImageUrl = useMemo(
    () => getDeterministicFallbackImage(hotel),
    [hotel],
  );
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
    preferredImageIndex,
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
  const displayImageUrl = activeGalleryImageUrl
    ? activeGalleryImageUrl
    : failedImageUrls.has(fallbackImageUrl)
      ? ""
      : fallbackImageUrl;
  const rawRoomTypeText = hotel.roomType ? toTitleCase(hotel.roomType) : "";
  const roomTypeText = rawRoomTypeText
    ? translateKnownHotelLabel(rawRoomTypeText, t)
    : "";
  const distanceText = getDistanceDisplay(hotel.distanceFromCenter);
  const mealPlanText = getMealPlanDisplay(hotel, rawRoomTypeText, t);
  const cancellationDisplay = getCancellationDisplay(hotel.cancellationInfo, t);
  const amenityDisplay = getAmenityDisplay(hotel.amenities, mealPlanText, t);
  const expandedAmenityDisplay = getAmenityDisplay(
    hotel.amenities,
    mealPlanText,
    t,
    8,
  );
  const isDemoHotel = hotel.dataSource === "demo";
  const neighbourhood = hotel.neighbourhood?.trim() || "";
  const reviewScore = hotel.reviewScore;
  const reviewBand = getHotelReviewBand(reviewScore);
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
  const taxesAndFeesText =
    hotel.taxesAndFeesIncluded === true
      ? t("hotelResults.taxesFeesIncluded") || "Includes taxes and fees"
      : hotel.taxesAndFeesIncluded === false
        ? t("hotelResults.taxesFeesNotIncluded") ||
          "Taxes and fees not included"
        : "";
  const savedHotelLabel = (
    isSaved
      ? t("hotelResults.removeSavedHotel") || "Remove {{name}} from saved hotels"
      : t("hotelResults.saveHotel") || "Save {{name}}"
  ).replace("{{name}}", hotel.name);

  useEffect(() => {
    let isActive = true;

    function updateSavedState(rawValue: string | null) {
      if (!isActive) return;

      setIsSaved(isHotelIdSaved(parseSavedHotelIds(rawValue), hotel.id));
    }

    queueMicrotask(() => {
      try {
        updateSavedState(
          window.localStorage.getItem(SAVED_HOTEL_IDS_STORAGE_KEY),
        );
      } catch {
        updateSavedState(null);
      }
    });

    function handleStorage(event: StorageEvent) {
      if (event.key !== SAVED_HOTEL_IDS_STORAGE_KEY) return;

      updateSavedState(event.newValue);
    }

    function handleSavedHotelIdsChanged(event: Event) {
      if (!(event instanceof CustomEvent)) return;
      if (typeof event.detail !== "string") return;

      updateSavedState(event.detail);
    }

    window.addEventListener("storage", handleStorage);
    window.addEventListener(
      SAVED_HOTEL_IDS_CHANGED_EVENT,
      handleSavedHotelIdsChanged,
    );

    return () => {
      isActive = false;
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(
        SAVED_HOTEL_IDS_CHANGED_EVENT,
        handleSavedHotelIdsChanged,
      );
    };
  }, [hotel.id]);

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

  function selectAdjacentImage(direction: -1 | 1) {
    const nextIndex = getAdjacentHotelGalleryIndex(
      explicitGalleryImages,
      failedImageUrls,
      resolvedActiveImageIndex,
      direction,
    );

    if (nextIndex !== -1) setPreferredImageIndex(nextIndex);
  }

  function toggleSavedHotel() {
    try {
      const savedIds = parseSavedHotelIds(
        window.localStorage.getItem(SAVED_HOTEL_IDS_STORAGE_KEY),
      );
      const nextSavedIds = toggleSavedHotelId(savedIds, hotel.id);
      const serializedValue = serializeSavedHotelIds(nextSavedIds);

      window.localStorage.setItem(
        SAVED_HOTEL_IDS_STORAGE_KEY,
        serializedValue,
      );
      setIsSaved(isHotelIdSaved(nextSavedIds, hotel.id));
      window.dispatchEvent(
        new CustomEvent(SAVED_HOTEL_IDS_CHANGED_EVENT, {
          detail: serializedValue,
        }),
      );
    } catch {
      // Keep the previous visual state if browser storage is unavailable.
    }
  }

  async function redirectToHotel() {
    if (isDemoHotel) return;

    const response = await fetch("/api/redirect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: hotel.id,
        type: "hotel",
        sourcePage: "hotel_results",
      }),
    });
    const data = (await response.json()) as { url?: string; error?: string };
    if (data.url) window.location.href = data.url;
    if (data.error) window.alert(t("hotelResults.unableToOpenProvider"));
  }

  return (
    <Card className="mx-auto w-full max-w-[800px] overflow-hidden border-slate-200 bg-white shadow-[0_16px_38px_-26px_rgba(2,28,43,0.22)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_44px_-24px_rgba(2,28,43,0.26)]">
      <div className="grid md:grid-cols-[40%_minmax(0,1fr)]">
        <div className="relative h-[clamp(280px,78vw,340px)] bg-surface-muted md:aspect-auto md:h-auto md:min-h-[230px] lg:min-h-[240px]">
          <button
            type="button"
            aria-label={savedHotelLabel}
            aria-pressed={isSaved}
            title={savedHotelLabel}
            className={
              isSaved
                ? "absolute right-2 top-2 z-20 flex min-h-10 min-w-10 items-center justify-center rounded-full border border-rose-200 bg-white/95 text-rose-600 shadow-lg transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004BB8]"
                : "absolute right-2 top-2 z-20 flex min-h-10 min-w-10 items-center justify-center rounded-full border border-white/80 bg-white/90 text-slate-800 shadow-lg transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004BB8]"
            }
            onClick={toggleSavedHotel}
          >
            <Heart
              size={20}
              aria-hidden="true"
              fill={isSaved ? "currentColor" : "none"}
            />
          </button>
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
                sizes="(min-width: 768px) 40vw, 100vw"
                onError={() => markImageFailed(displayImageUrl)}
              />
              {showGalleryControls ? (
                <>
                  <button
                    type="button"
                    className="absolute left-2 top-1/2 flex min-h-10 min-w-10 -translate-y-1/2 items-center justify-center rounded-full bg-slate-950/75 text-white shadow-lg ring-1 ring-white/40 transition hover:bg-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                    aria-label={
                      t("hotelResults.previousPhoto") || "Previous photo"
                    }
                    onClick={() => selectAdjacentImage(-1)}
                  >
                    <ChevronLeft size={20} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 flex min-h-10 min-w-10 -translate-y-1/2 items-center justify-center rounded-full bg-slate-950/75 text-white shadow-lg ring-1 ring-white/40 transition hover:bg-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                    aria-label={t("hotelResults.nextPhoto") || "Next photo"}
                    onClick={() => selectAdjacentImage(1)}
                  >
                    <ChevronRight size={20} aria-hidden="true" />
                  </button>
                  <div className="absolute bottom-2 right-2 rounded-full bg-slate-950/75 px-2.5 py-1 text-xs font-semibold text-white shadow-lg ring-1 ring-white/30">
                    {photoCounterText}
                  </div>
                </>
              ) : null}
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#004BB8]/8 via-white to-[#5CB6B2]/10 px-5 text-center text-[#004BB8]">
              <Building2 size={36} />
              <span className="max-w-[180px] text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("hotelResults.imageUnavailable")}
              </span>
            </div>
          )}
        </div>
        <div className="flex min-h-[200px] flex-col px-3.5 py-3.5 md:min-h-0 md:px-3 md:py-3">
          <div className="flex flex-1 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div>
                {starRating ? (
                  <div
                    className="mb-1 inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-500 ring-1 ring-amber-100"
                    aria-label={t("hotelResults.starHotelAria").replace(
                      "{{rating}}",
                      formatHotelRating(hotel.rating, locale),
                    )}
                    title={t("hotelResults.starHotelAria").replace(
                      "{{rating}}",
                      formatHotelRating(hotel.rating, locale),
                    )}
                  >
                    <span aria-hidden="true" className="tracking-[0.08em]">
                      {"★".repeat(starRating)}
                    </span>
                  </div>
                ) : null}
                <h2 className="text-base font-bold leading-6 text-slate-950 lg:text-[17px]">
                  {hotel.name}
                </h2>
                <p className="mt-1 flex items-center gap-1.5 text-[13px] font-semibold leading-5 text-[#004BB8] lg:text-sm">
                  <MapPin size={15} className="shrink-0 text-[#004BB8]" />
                  <span>{hotel.location}</span>
                </p>
              </div>
              {reviewBand || neighbourhood || isDemoHotel ? (
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                  {reviewBand ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-2 py-0.5 text-white">
                      <span>{formattedReviewScore}</span>
                      <span>{reviewLabel}</span>
                    </span>
                  ) : null}
                  {reviewCountText ? (
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
                      {reviewCountText}
                    </span>
                  ) : null}
                  {neighbourhood ? (
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
                      {neighbourhood}
                    </span>
                  ) : null}
                  {isDemoHotel ? (
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[#004BB8] ring-1 ring-blue-100">
                      {t("hotelResults.demoListing") || "Demo listing"}
                    </span>
                  ) : null}
                </div>
              ) : null}
              {distanceText ? (
                <p className="mt-1 text-[13px] font-normal leading-5 text-slate-600 lg:text-sm">
                  {distanceText}
                </p>
              ) : null}
              {roomTypeText || mealPlanText || amenityDisplay.length > 0 ? (
                <div className="mt-2 space-y-1">
                  {roomTypeText ? (
                    <p className="text-sm font-medium leading-5 text-slate-800">
                      {roomTypeText}
                    </p>
                  ) : null}
                  {mealPlanText ? (
                    <p className="text-[13px] font-normal leading-5 text-slate-600">
                      {mealPlanText}
                    </p>
                  ) : null}
                  {amenityDisplay.length > 0 ? (
                    <p className="overflow-hidden text-ellipsis whitespace-nowrap text-[13px] font-normal leading-5 text-slate-600">
                      {amenityDisplay.join(" · ")}
                    </p>
                  ) : null}
                </div>
              ) : null}
              {cancellationDisplay ? (
                <p
                  className={
                    cancellationDisplay.positive
                      ? "mt-2 text-[13px] font-medium leading-5 text-emerald-700"
                      : "mt-2 text-[13px] font-medium leading-5 text-slate-600"
                  }
                >
                  {cancellationDisplay.label}
                </p>
              ) : null}
            </div>
            <div className="mt-auto flex flex-col gap-3 min-[380px]:flex-row min-[380px]:items-end min-[380px]:justify-between md:mt-0 lg:w-40 lg:flex-col lg:items-end lg:justify-start lg:text-end">
              <div className="text-start min-[380px]:text-end lg:text-end">
                <div
                  className="text-xl font-bold tracking-[-0.01em] text-slate-950"
                  dir="ltr"
                >
                  {formatCurrency(hotel.totalPrice, hotel.currency, locale)}
                </div>
                <div className="text-xs font-medium leading-4 text-slate-500">
                  {t("hotelResults.estimatedStayTotal")}
                </div>
                <div className="text-xs font-medium leading-4 text-slate-500">
                  {t("hotelResults.pricePerNight").replace(
                    "{{price}}",
                    formatCurrency(hotel.pricePerNight, hotel.currency, locale),
                  )}
                </div>
                {taxesAndFeesText ? (
                  <div className="text-xs font-medium leading-4 text-slate-500">
                    {taxesAndFeesText}
                  </div>
                ) : null}
              </div>
              {isDemoHotel ? (
                <div className="min-[380px]:text-end">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="w-full whitespace-nowrap rounded-lg px-3 text-sm font-semibold min-[380px]:w-auto"
                    aria-expanded={detailsOpen}
                    aria-controls={detailsRegionId}
                    onClick={() => setDetailsOpen((open) => !open)}
                  >
                    {detailsOpen
                      ? t("hotelResults.hideDetails") || "Hide details"
                      : t("hotelResults.viewDetails") || "View details"}
                  </Button>
                </div>
              ) : (
                <div className="min-[380px]:text-end">
                  <Button
                    variant="accent"
                    size="sm"
                    className="w-full whitespace-nowrap rounded-lg border border-[#004BB8] bg-[#004BB8] px-3 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(2,28,43,0.14)] hover:border-[#021C2B] hover:bg-[#021C2B] min-[380px]:w-auto"
                    onClick={redirectToHotel}
                  >
                    {t("hotelResults.viewHotel")}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {isDemoHotel && detailsOpen ? (
        <div
          id={detailsRegionId}
          className="border-t border-slate-200 bg-slate-50/80 px-3.5 py-3.5 md:px-4 md:py-4"
        >
          <h3 className="text-sm font-bold text-slate-950">
            {t("hotelResults.detailsHeading") || "Hotel details"}
          </h3>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            {t("hotelResults.demoDisclaimer") ||
              "Illustrative demo listing. Prices, reviews and property details are not live inventory."}
          </p>
          {showGalleryControls ? (
            <div className="mt-3 min-w-0">
              <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                {t("hotelResults.photos") || "Photos"}
              </h4>
              <div className="mt-2 flex max-w-full gap-2 overflow-x-auto pb-1">
                {availableImageIndices.map((imageIndex, visibleIndex) => {
                  const thumbnailUrl = explicitGalleryImages[imageIndex];
                  return (
                    <button
                      key={thumbnailUrl}
                      type="button"
                      aria-pressed={resolvedActiveImageIndex === imageIndex}
                      aria-label={(
                        t("hotelResults.selectPhoto") || "Show photo {{number}}"
                      ).replace("{{number}}", String(visibleIndex + 1))}
                      className={
                        resolvedActiveImageIndex === imageIndex
                          ? "relative h-16 w-24 shrink-0 overflow-hidden rounded-lg ring-2 ring-[#004BB8] ring-offset-2 ring-offset-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004BB8]"
                          : "relative h-16 w-24 shrink-0 overflow-hidden rounded-lg ring-1 ring-slate-200 transition hover:ring-[#004BB8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004BB8]"
                      }
                      onClick={() => setPreferredImageIndex(imageIndex)}
                    >
                      <Image
                        src={thumbnailUrl}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="96px"
                        onError={() => markImageFailed(thumbnailUrl)}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
          <dl className="mt-3 grid gap-3 text-sm text-slate-700 md:grid-cols-2">
            {roomTypeText ? (
              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  {t("hotelResults.roomDetails") || "Room"}
                </dt>
                <dd className="mt-1">{roomTypeText}</dd>
              </div>
            ) : null}
            {neighbourhood ? (
              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  {t("hotelResults.areaDetails") || "Area"}
                </dt>
                <dd className="mt-1">{neighbourhood}</dd>
              </div>
            ) : null}
            {cancellationDisplay ? (
              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  {t("hotelResults.cancellationDetails") || "Cancellation"}
                </dt>
                <dd className="mt-1">{cancellationDisplay.label}</dd>
              </div>
            ) : null}
            {expandedAmenityDisplay.length > 0 ? (
              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  {t("hotelResults.amenitiesDetails") || "Amenities"}
                </dt>
                <dd className="mt-1">{expandedAmenityDisplay.join(" · ")}</dd>
              </div>
            ) : null}
            {reviewBand ? (
              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  {t("hotelResults.review.score") || "Review score"}
                </dt>
                <dd className="mt-1">
                  {formattedReviewScore} {reviewLabel}
                  {reviewCountText ? ` · ${reviewCountText}` : ""}
                </dd>
              </div>
            ) : null}
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
                {t("hotelResults.priceDetails") || "Price"}
              </dt>
              <dd className="mt-1">
                {formatCurrency(hotel.totalPrice, hotel.currency, locale)} ·{" "}
                {t("hotelResults.pricePerNight").replace(
                  "{{price}}",
                  formatCurrency(hotel.pricePerNight, hotel.currency, locale),
                )}
                {taxesAndFeesText ? ` · ${taxesAndFeesText}` : ""}
              </dd>
            </div>
          </dl>
        </div>
      ) : null}
    </Card>
  );
}
