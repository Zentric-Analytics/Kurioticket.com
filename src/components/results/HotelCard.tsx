"use client";

import Image from "next/image";
import { Building2, CheckCircle2, MapPin, ShieldCheck, Sparkles, Star } from "lucide-react";
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

  const topAmenities = hotel.amenities.filter(Boolean).slice(0, 4);
  const primaryReason = hotel.recommendationReasons.find(Boolean);
  const displayRating = Number.isFinite(hotel.rating) && hotel.rating > 0;

  return (
    <Card className="group overflow-hidden border-indigo-100/80 shadow-[0_18px_55px_-34px_rgba(67,56,202,0.55)] transition duration-200 hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-[0_22px_70px_-36px_rgba(67,56,202,0.62)]">
      <div className="grid md:grid-cols-[240px_1fr] xl:grid-cols-[278px_1fr]">
        <div className="relative min-h-[218px] overflow-hidden bg-indigo-50 md:min-h-full">
          {hotel.imageUrl ? (
            <Image
              src={hotel.imageUrl}
              alt={`${hotel.name} stay option${hotel.location ? ` near ${hotel.location}` : ""}`}
              fill
              className="object-cover transition duration-500 group-hover:scale-[1.03]"
              sizes="(min-width: 1280px) 278px, (min-width: 768px) 240px, 100vw"
            />
          ) : (
            <div className="flex h-full min-h-[218px] items-center justify-center bg-gradient-to-br from-indigo-50 to-violet-100 text-violet-700">
              <Building2 size={40} />
            </div>
          )}
          {hotel.badges[0] ? (
            <div className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-indigo-950 shadow-sm backdrop-blur">
              {hotel.badges[0]}
            </div>
          ) : null}
        </div>

        <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_220px] xl:grid-cols-[minmax(0,1fr)_250px]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {displayRating ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-bold text-violet-800">
                  <Star size={13} className="fill-violet-600 text-violet-600" />
                  {hotel.rating.toFixed(1)} rating
                </span>
              ) : null}
              {hotel.provider ? <Badge variant="blue">From {hotel.provider}</Badge> : null}
              {hotel.badges.slice(1, 3).map((badge) => (
                <Badge key={badge} variant={badge.includes("Price") ? "blue" : "teal"}>
                  {badge}
                </Badge>
              ))}
            </div>

            <h2 className="mt-3 text-xl font-extrabold leading-tight tracking-tight text-indigo-950 sm:text-2xl">{hotel.name}</h2>
            <p className="mt-2 flex items-start gap-2 text-sm leading-6 text-slate-600">
              <MapPin size={16} className="mt-0.5 shrink-0 text-violet-600" />
              <span>
                {hotel.location}
                {hotel.distanceFromCenter ? <span className="block text-xs font-semibold text-slate-500">{hotel.distanceFromCenter}</span> : null}
              </span>
            </p>

            {primaryReason ? (
              <p className="mt-4 flex items-start gap-2 rounded-2xl bg-indigo-50/70 px-3 py-2 text-sm leading-6 text-indigo-950">
                <Sparkles size={16} className="mt-0.5 shrink-0 text-violet-600" />
                {primaryReason}
              </p>
            ) : null}

            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Room</div>
                <div className="mt-1 font-semibold text-slate-900">{hotel.roomType || "Room details from provider"}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Policy</div>
                <div className="mt-1 font-semibold text-slate-900">{hotel.cancellationInfo || "Confirm before booking"}</div>
              </div>
            </div>

            {topAmenities.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {topAmenities.map((amenity) => (
                  <span key={amenity} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                    <CheckCircle2 size={13} className="text-violet-600" />
                    {amenity}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-indigo-100 bg-gradient-to-b from-white to-violet-50/60 p-4 lg:text-right">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Total stay estimate</div>
            <div className="mt-1 text-3xl font-extrabold tracking-tight text-indigo-950">{formatCurrency(hotel.totalPrice, hotel.currency)}</div>
            <div className="mt-1 text-sm font-semibold text-slate-600">{formatCurrency(hotel.pricePerNight, hotel.currency)} per night</div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center lg:grid-cols-1">
              <MiniScore label="Value" score={hotel.valueScore} />
              <MiniScore label="Ease" score={hotel.arrivalSuitabilityScore} />
              <MiniScore label="Trust" score={hotel.travelConfidenceScore} />
            </div>
            <Button variant="primary" size="lg" className="mt-4 w-full rounded-xl bg-violet-700 hover:bg-violet-800" onClick={redirectToHotel}>
              View deal
            </Button>
            <p className="mt-3 flex items-start gap-2 text-left text-xs leading-5 text-slate-600 lg:justify-end lg:text-right">
              <ShieldCheck size={14} className="mt-0.5 shrink-0 text-violet-600" />
              <span>Final availability, taxes, fees, and booking terms are confirmed by the provider.</span>
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}

function MiniScore({ label, score }: { label: string; score: number }) {
  const normalized = Math.max(0, Math.min(100, Math.round(score)));

  return (
    <div className="rounded-xl bg-white px-2 py-2 shadow-sm ring-1 ring-indigo-100">
      <div className="text-base font-extrabold text-indigo-950">{normalized}</div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  );
}
