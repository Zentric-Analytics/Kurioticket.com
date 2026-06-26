"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Building2, MapPin } from "lucide-react";
import type { PublicHotelResult } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useLocale } from "@/components/layout/LocaleProvider";
import { translations as enTranslations } from "@/lib/i18n/en";
import { formatCurrency } from "@/lib/utils";

function getHotelStarRating(rating: number) {
  if (!Number.isFinite(rating) || rating <= 0) return null;
  return Math.min(Math.max(Math.floor(rating), 1), 5);
}

function formatHotelRating(rating: number) {
  return Number.isInteger(rating) ? String(rating) : rating.toFixed(1);
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

  if (/\bpay (?:at|on) (?:the )?property\b|\bpay later\b/i.test(policyText)) {
    return { label: toSentenceCase(policyText), positive: true };
  }

  if (/\bno prepayment\b/i.test(policyText)) {
    return { label: toSentenceCase(policyText), positive: true };
  }

  if (/\brefundable\b/i.test(policyText)) {
    return { label: toSentenceCase(policyText), positive: true };
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

  if (/^double business$/.test(normalized)) {
    return t("hotelResults.filter.doubleBusiness");
  }

  if (/^bed and breakfast$/.test(normalized)) {
    return t("hotelResults.filter.bedAndBreakfast");
  }

  if (/^(room only|accommodation only)$/.test(normalized)) {
    return t("hotelResults.filter.roomOnly");
  }

  if (/^double room$/.test(normalized)) {
    return t("hotelResults.filter.doubleRoom");
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

function getAmenityDisplay(amenities: string[], mealPlanText: string) {
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

      const key = amenity.toLocaleLowerCase();
      if (mealPlanKey && key === mealPlanKey) return false;
      if (seen.has(key)) return false;

      seen.add(key);
      return true;
    })
    .slice(0, 3);
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

type HotelCardProps = {
  hotel: PublicHotelResult;
};

export function HotelCard({ hotel }: HotelCardProps) {
  const { t: dictionary } = useLocale();
  const t = (key: string) => dictionary[key] ?? enTranslations[key] ?? "";
  const starRating = getHotelStarRating(hotel.rating);
  const fallbackImageUrl = useMemo(
    () => getDeterministicFallbackImage(hotel),
    [hotel],
  );
  const supplierImageUrl = hotel.imageUrl?.trim();
  const [failedImageUrls, setFailedImageUrls] = useState<Set<string>>(
    () => new Set(),
  );
  const imageUrl =
    supplierImageUrl && !failedImageUrls.has(supplierImageUrl)
      ? supplierImageUrl
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
  const amenityDisplay = getAmenityDisplay(hotel.amenities, mealPlanText);

  async function redirectToHotel() {
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
    if (data.error) window.alert(data.error);
  }

  return (
    <Card className="mx-auto w-full max-w-[800px] overflow-hidden border-indigo-100 bg-white shadow-[0_16px_38px_-26px_rgba(30,27,75,0.5)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_44px_-24px_rgba(30,27,75,0.55)]">
      <div className="grid md:grid-cols-[40%_minmax(0,1fr)]">
        <div className="relative h-[clamp(280px,78vw,340px)] bg-surface-muted md:aspect-auto md:h-auto md:min-h-[230px] lg:min-h-[240px]">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={t("hotelResults.hotelImageAlt")
                .replace("{{name}}", hotel.name)
                .replace("{{location}}", hotel.location ? ` ${t("hotelResults.nearLocation").replace("{{location}}", hotel.location)}` : "")}
              fill
              className="object-cover"
              sizes="(min-width: 768px) 40vw, 100vw"
              onError={() => {
                setFailedImageUrls((current) => new Set(current).add(imageUrl));
              }}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-indigo-50 via-white to-violet-50 px-5 text-center text-indigo-700">
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
                      formatHotelRating(hotel.rating),
                    )}
                    title={t("hotelResults.starHotelAria").replace(
                      "{{rating}}",
                      formatHotelRating(hotel.rating),
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
                <p className="mt-1 flex items-center gap-1.5 text-[13px] font-semibold leading-5 text-indigo-700 lg:text-sm">
                  <MapPin size={15} className="shrink-0 text-indigo-700" />
                  <span>{hotel.location}</span>
                </p>
              </div>
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
                <div className="text-xl font-bold tracking-[-0.01em] text-slate-950" dir="ltr">
                  {formatCurrency(hotel.totalPrice, hotel.currency)}
                </div>
                <div className="text-xs font-medium leading-4 text-slate-500">
                  {t("hotelResults.estimatedStayTotal")}
                </div>
                <div className="text-xs font-medium leading-4 text-slate-500">
                  {t("hotelResults.pricePerNight").replace(
                    "{{price}}",
                    formatCurrency(hotel.pricePerNight, hotel.currency),
                  )}
                </div>
              </div>
              <div className="min-[380px]:text-end">
                <Button
                  variant="accent"
                  size="sm"
                  className="w-full whitespace-nowrap rounded-lg border border-indigo-700 bg-indigo-700 px-3 text-sm font-semibold text-white shadow-sm shadow-indigo-700/20 hover:border-indigo-800 hover:bg-indigo-800 min-[380px]:w-auto"
                  onClick={redirectToHotel}
                >
                  {t("hotelResults.viewHotel")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
