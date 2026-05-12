"use client";

import Image from "next/image";
import { Building2, MapPin, ShieldCheck } from "lucide-react";
import type { PublicHotelResult } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ScoreMeter } from "@/components/ui/ScoreMeter";
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
        <div className="relative aspect-[16/10] bg-surface-muted md:aspect-auto">
          {hotel.imageUrl ? (
            <Image src={hotel.imageUrl} alt="" fill className="object-cover" sizes="(min-width: 768px) 260px, 100vw" />
          ) : (
            <div className="flex h-full items-center justify-center text-teal">
              <Building2 size={36} />
            </div>
          )}
        </div>
        <div className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-navy">{hotel.name}</h2>
              <p className="mt-1 flex items-center gap-2 text-sm text-muted">
                <MapPin size={15} className="text-teal" />
                {hotel.location}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {hotel.badges.map((badge) => (
                  <Badge key={badge} variant={badge.includes("Price") ? "blue" : "teal"}>
                    {badge}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="text-left lg:text-right">
              <div className="text-2xl font-bold text-navy">{formatCurrency(hotel.totalPrice, hotel.currency)}</div>
              <div className="text-sm text-muted">{formatCurrency(hotel.pricePerNight, hotel.currency)} per night</div>
              <Button variant="primary" className="mt-3" onClick={redirectToHotel}>
                View Hotel
              </Button>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_280px]">
            <div>
              <p className="flex items-start gap-2 text-sm text-muted">
                <ShieldCheck size={16} className="mt-0.5 shrink-0 text-teal" />
                {hotel.recommendationReasons[0]}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {hotel.amenities.slice(0, 5).map((amenity) => (
                  <span key={amenity} className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-semibold text-muted">
                    {amenity}
                  </span>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <ScoreMeter label="Value" score={hotel.valueScore} />
              <ScoreMeter label="Arrival Ease" score={hotel.arrivalSuitabilityScore} />
              <ScoreMeter label="Confidence" score={hotel.travelConfidenceScore} />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
