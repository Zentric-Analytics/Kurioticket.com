"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  AirVent,
  Armchair,
  Bike,
  Building2,
  BusFront,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  CircleParking,
  Clock3,
  Coffee,
  ConciergeBell,
  CookingPot,
  Dumbbell,
  Flower2,
  Heart,
  Laptop,
  MapPin,
  Trees,
  UtensilsCrossed,
  VolumeX,
  Waves,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import type { PublicHotelResult } from "@/lib/types";
import { LinkButton } from "@/components/ui/Button";
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
import {
  buildHotelAmenityPresentation,
  type HotelAmenityIconKey,
  type HotelAmenityPresentationItem,
} from "@/components/results/hotelAmenityPresentation";

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

const hotelAmenityIcons: Record<HotelAmenityIconKey, LucideIcon> = {
  wifi: Wifi,
  breakfast: Coffee,
  pool: Waves,
  spa: Flower2,
  airportShuttle: BusFront,
  parking: CircleParking,
  fitness: Dumbbell,
  workspace: Laptop,
  quietRooms: VolumeX,
  frontDesk: ConciergeBell,
  lateCheckIn: Clock3,
  kitchenette: CookingPot,
  bikeStorage: Bike,
  courtyard: Trees,
  lounge: Armchair,
  restaurant: UtensilsCrossed,
  airConditioning: AirVent,
  generic: CircleDot,
};

function resolveAmenityLabels(
  items: HotelAmenityPresentationItem[],
  t: (key: string) => string,
) {
  return items.map((item) => {
    const translatedLabel = item.translationKey ? t(item.translationKey) : "";

    return {
      ...item,
      label: translatedLabel.trim() || item.label,
    };
  });
}

function HotelAmenityList({
  items,
  expanded = false,
}: {
  items: HotelAmenityPresentationItem[];
  expanded?: boolean;
}) {
  if (items.length === 0) return null;

  return (
    <ul
      role="list"
      className={
        expanded
          ? "mt-2 grid grid-cols-1 gap-x-4 gap-y-1.5 min-[380px]:grid-cols-2"
          : "mt-2 grid grid-cols-1 gap-x-4 gap-y-1.5 min-[380px]:grid-cols-2"
      }
    >
      {items.map((item) => {
        const Icon = hotelAmenityIcons[item.iconKey];

        return (
          <li
            key={item.key}
            className="flex min-w-0 items-start gap-1.5 text-[12px] font-medium leading-4 text-slate-600"
          >
            <Icon
              className="h-4 w-4 shrink-0 text-slate-500"
              strokeWidth={1.8}
              aria-hidden="true"
            />
            <span className="min-w-0">{item.label}</span>
          </li>
        );
      })}
    </ul>
  );
}

type HotelCardProps = {
  hotel: PublicHotelResult;
};

export function HotelCard({ hotel }: HotelCardProps) {
  const { locale, t: dictionary } = useLocale();
  const t = (key: string) => dictionary[key] ?? enTranslations[key] ?? "";
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
      ? t("hotelResults.removeSavedHotel") ||
        "Remove {{name}} from saved hotels"
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

      window.localStorage.setItem(SAVED_HOTEL_IDS_STORAGE_KEY, serializedValue);
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
                <h2 className="text-base font-bold leading-6 text-slate-950 lg:text-[17px]">
                  {hotel.name}
                </h2>

                {starRating ? (
                  <div
                    className="mt-1 flex items-center"
                    aria-label={t("hotelResults.starHotelAria").replace(
                      "{{rating}}",
                      formatHotelRating(hotel.rating, locale),
                    )}
                    title={t("hotelResults.starHotelAria").replace(
                      "{{rating}}",
                      formatHotelRating(hotel.rating, locale),
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

                <p className="mt-1 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[13px] font-semibold leading-5 text-[#004BB8] lg:text-sm">
                  <MapPin size={15} className="shrink-0 text-[#004BB8]" />
                  <span className="min-w-0">{hotel.location}</span>
                  {distanceText ? (
                    <>
                      <span
                        aria-hidden="true"
                        className="shrink-0 font-normal text-slate-400"
                      >
                        ·
                      </span>
                      <span className="font-normal text-slate-600">
                        {distanceText}
                      </span>
                    </>
                  ) : null}
                </p>
              </div>
              {reviewBand || reviewCountText ? (
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
                </div>
              ) : null}
              {roomTypeText ||
              shouldShowMealPlanText ||
              collapsedAmenityItems.length > 0 ? (
                <div className="mt-2 space-y-1">
                  {roomTypeText ? (
                    <p className="text-sm font-medium leading-5 text-slate-800">
                      {roomTypeText}
                    </p>
                  ) : null}
                  {shouldShowMealPlanText ? (
                    <p className="text-[13px] font-normal leading-5 text-slate-600">
                      {mealPlanText}
                    </p>
                  ) : null}
                  <HotelAmenityList
                    items={resolveAmenityLabels(collapsedAmenityItems, t)}
                  />
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

                <div className="mt-0.5 text-xs font-medium leading-4 text-slate-500">
                  {t("hotelResults.estimatedStayTotal")}
                </div>

                <div className="mt-2.5 space-y-1">
                  <div className="text-[13px] font-semibold leading-5 text-slate-700">
                    {t("hotelResults.pricePerNight").replace(
                      "{{price}}",
                      formatCurrency(hotel.pricePerNight, hotel.currency, locale),
                    )}
                  </div>

                  {taxesAndFeesText ? (
                    <div className="text-[11px] font-medium leading-4 text-slate-500">
                      {taxesAndFeesText}
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="min-[380px]:text-end">
                <LinkButton
                  href={`/hotels/details/${encodeURIComponent(hotel.id)}`}
                  variant="accent"
                  size="sm"
                  className="w-full whitespace-nowrap rounded-lg border border-[#004BB8] bg-[#004BB8] px-3 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(2,28,43,0.14)] hover:border-[#021C2B] hover:bg-[#021C2B] min-[380px]:w-auto"
                >
                  {t("hotelResults.viewHotel") || "View hotel"}
                </LinkButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
