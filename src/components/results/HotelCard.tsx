"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Building2, MapPin } from "lucide-react";
import type { PublicHotelResult } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
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
  const fallbackImageUrl = useMemo(() => getDeterministicFallbackImage(hotel), [hotel]);
  const supplierImageUrl = hotel.imageUrl?.trim();
  const [failedImageUrls, setFailedImageUrls] = useState<Set<string>>(() => new Set());
  const imageUrl =
    supplierImageUrl && !failedImageUrls.has(supplierImageUrl)
      ? supplierImageUrl
      : failedImageUrls.has(fallbackImageUrl)
        ? ""
        : fallbackImageUrl;

  async function redirectToHotel() {
    const response = await fetch("/api/redirect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: hotel.id, type: "hotel", sourcePage: "hotel_results" }),
    });
    const data = (await response.json()) as { url?: string; error?: string };
    if (data.url) window.location.href = data.url;
    if (data.error) window.alert(data.error);
  }

  return (
    <Card className="overflow-hidden">
      <div className="grid md:grid-cols-[260px_1fr]">
        <div className="relative aspect-[16/10] bg-surface-muted md:aspect-auto md:min-h-[236px]">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={`${hotel.name} stay option${hotel.location ? ` near ${hotel.location}` : ""}`}
              fill
              className="object-cover"
              sizes="(min-width: 768px) 260px, 100vw"
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
        <div className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 space-y-3">
              <div>
                {starRating ? (
                  <div
                    className="mb-1 inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-500 ring-1 ring-amber-100"
                    aria-label={`${formatHotelRating(hotel.rating)}-star hotel`}
                    title={`${formatHotelRating(hotel.rating)}-star hotel`}
                  >
                    <span aria-hidden="true" className="tracking-[0.08em]">
                      {"★".repeat(starRating)}
                    </span>
                  </div>
                ) : null}
                <h2 className="text-xl font-bold leading-snug text-navy">{hotel.name}</h2>
                <p className="mt-1 flex items-center gap-2 text-sm text-muted">
                  <MapPin size={15} className="shrink-0 text-teal" />
                  <span>{hotel.location}</span>
                </p>
              </div>
              {hotel.roomType ? (
                <div className="flex flex-wrap gap-2">
                  <Badge variant="teal">{hotel.roomType}</Badge>
                </div>
              ) : null}
            </div>
            <div className="text-left lg:max-w-[210px] lg:text-right">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted">Estimated stay total</div>
              <div className="text-2xl font-bold text-navy">{formatCurrency(hotel.totalPrice, hotel.currency)}</div>
              <div className="text-sm text-muted">{formatCurrency(hotel.pricePerNight, hotel.currency)} per night</div>
              <p className="mt-1 text-xs font-semibold text-teal">Final price confirmed by provider</p>
              <Button variant="primary" className="mt-3" onClick={redirectToHotel}>
                View Hotel
              </Button>
            </div>
          </div>

          {hotel.amenities.length > 0 ? (
            <div className="mt-5 border-t border-border pt-4">
              <div className="flex flex-wrap gap-2">
                {hotel.amenities.slice(0, 5).map((amenity) => (
                  <span key={amenity} className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-semibold text-muted">
                    {amenity}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
