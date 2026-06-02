"use client";

import Image from "next/image";
import { Building2, MapPin } from "lucide-react";
import type { PublicHotelResult } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/utils";

export function HotelCard({ hotel }: { hotel: PublicHotelResult }) {
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
          {hotel.imageUrl ? (
            <Image
              src={hotel.imageUrl}
              alt={`${hotel.name} stay option${hotel.location ? ` near ${hotel.location}` : ""}`}
              fill
              className="object-cover"
              sizes="(min-width: 768px) 260px, 100vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-teal">
              <Building2 size={36} />
            </div>
          )}
        </div>
        <div className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 space-y-3">
              <div>
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
