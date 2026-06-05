"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Building2, MapPin } from "lucide-react";
import type { PublicHotelResult } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
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

function getCancellationDisplay(cancellationInfo: string) {
  const policyText = normalizeWhitespace(cancellationInfo || "");

  if (!policyText) return null;

  if (/\bnon[-\s]?refundable\b|\bno refunds?\b/i.test(policyText)) {
    return { label: "Non-refundable", positive: false };
  }

  if (/\bfree cancellation\b/i.test(policyText)) {
    return { label: "Free cancellation", positive: true };
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

function getMealPlanDisplay(hotel: PublicHotelResult, roomTypeText: string) {
  const mealText = [hotel.roomType, ...hotel.amenities]
    .map((value) => toSentenceCase(value || ""))
    .find((value) => value && isMealPlanText(value));

  return mealText && toTitleCase(mealText) !== roomTypeText ? mealText : "";
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
  const roomTypeText = hotel.roomType ? toTitleCase(hotel.roomType) : "";
  const distanceText = getDistanceDisplay(hotel.distanceFromCenter);
  const mealPlanText = getMealPlanDisplay(hotel, roomTypeText);
  const cancellationDisplay = getCancellationDisplay(hotel.cancellationInfo);
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
    <Card className="mx-auto w-full max-w-[800px] overflow-hidden border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="grid md:grid-cols-[40%_minmax(0,1fr)]">
        <div className="relative aspect-[4/3] bg-surface-muted md:aspect-auto md:min-h-[230px] lg:min-h-[240px]">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={`${hotel.name} stay option${hotel.location ? ` near ${hotel.location}` : ""}`}
              fill
              className="object-cover"
              sizes="(min-width: 768px) 40vw, 100vw"
              onError={() => {
                setFailedImageUrls((current) => new Set(current).add(imageUrl));
              }}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-indigo-50 via-white to-teal/10 px-5 text-center text-teal">
              <Building2 size={36} />
              <span className="max-w-[180px] text-xs font-semibold uppercase tracking-wide text-slate-500">
                Image unavailable
              </span>
            </div>
          )}
        </div>
        <div className="px-3 py-3">
          <div className="flex flex-col gap-2.5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div>
                {starRating ? (
                  <div
                    className="mb-1 inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-500 ring-1 ring-amber-100"
                    aria-label={`${formatHotelRating(hotel.rating)}-star hotel`}
                    title={`${formatHotelRating(hotel.rating)}-star hotel`}
                  >
                    <span aria-hidden="true" className="tracking-[0.08em]">
                      {"★".repeat(starRating)}
                    </span>
                  </div>
                ) : null}
                <h2 className="text-[17px] font-semibold leading-6 text-slate-900 lg:text-lg">
                  {hotel.name}
                </h2>
                <p className="mt-1 flex items-center gap-1.5 text-[13px] font-normal leading-5 text-teal lg:text-sm">
                  <MapPin size={15} className="shrink-0 text-teal" />
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
            <div className="flex items-center justify-between gap-2 lg:w-40 lg:flex-col lg:items-end lg:justify-start lg:text-right">
              <div className="text-right">
                <div className="text-[21px] font-bold tracking-[-0.01em] text-slate-950">
                  {formatCurrency(hotel.totalPrice, hotel.currency)}
                </div>
                <div className="text-xs font-medium leading-4 text-slate-500">
                  estimated stay total
                </div>
                <div className="text-xs font-medium leading-4 text-slate-500">
                  {formatCurrency(hotel.pricePerNight, hotel.currency)} per
                  night
                </div>
              </div>
              <div className="text-right">
                <Button
                  variant="accent"
                  size="sm"
                  className="whitespace-nowrap border border-teal px-2.5 text-sm font-semibold hover:border-teal-dark"
                  onClick={redirectToHotel}
                >
                  View Hotel
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
