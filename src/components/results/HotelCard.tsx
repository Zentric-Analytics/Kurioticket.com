"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import {
  BadgeCheck,
  BedDouble,
  Building2,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  MapPin,
  ShieldCheck,
  Sparkles,
  Star,
  Utensils,
} from "lucide-react";
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

  const topAmenities = hotel.amenities.filter(Boolean).slice(0, 5);
  const primaryReason = hotel.recommendationReasons.find(Boolean);
  const displayRating = Number.isFinite(hotel.rating) && hotel.rating > 0;
  const hasBreakfast = hasTextMatch([...hotel.amenities, hotel.roomType], /breakfast|meal|board|buffet/i);
  const hasFlexibleCancellation = hasTextMatch([hotel.cancellationInfo, ...hotel.badges], /cancel|flexible|refundable/i);
  const hasPayLater = hasTextMatch([...hotel.amenities, hotel.cancellationInfo], /pay later|reserve now|payment|deposit/i);
  const starCount = displayRating ? Math.max(1, Math.min(5, Math.round(hotel.rating))) : 0;
  const heroBadge = hotel.badges[0] || (hotel.valueScore >= 78 ? "Great value" : "Partner deal");
  const visibleBadges = hotel.badges.filter((badge) => badge !== heroBadge).slice(0, 2);

  return (
    <Card className="group overflow-hidden rounded-[1.75rem] border-indigo-100/80 bg-white shadow-[0_22px_70px_-42px_rgba(67,56,202,0.7)] transition duration-200 hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-[0_28px_86px_-42px_rgba(67,56,202,0.78)]">
      <div className="grid md:grid-cols-[292px_1fr] xl:grid-cols-[330px_1fr]">
        <div className="relative min-h-[258px] overflow-hidden bg-indigo-50 md:min-h-full">
          {hotel.imageUrl ? (
            <Image
              src={hotel.imageUrl}
              alt={`${hotel.name} stay option${hotel.location ? ` near ${hotel.location}` : ""}`}
              fill
              className="object-cover transition duration-500 group-hover:scale-[1.035]"
              sizes="(min-width: 1280px) 330px, (min-width: 768px) 292px, 100vw"
            />
          ) : (
            <div className="flex h-full min-h-[258px] items-center justify-center bg-gradient-to-br from-indigo-50 via-violet-100 to-fuchsia-100 text-violet-700">
              <Building2 size={46} />
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-indigo-950/60 to-transparent" />
          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-3 py-1.5 text-xs font-extrabold text-indigo-950 shadow-sm backdrop-blur">
              <Sparkles size={13} className="text-violet-600" />
              {heroBadge}
            </span>
          </div>
          <div className="absolute bottom-3 left-3 right-3 rounded-2xl bg-indigo-950/75 px-3 py-2 text-sm font-bold text-white shadow-sm backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <span className="truncate">{hotel.location}</span>
              {displayRating ? <span className="shrink-0">{hotel.rating.toFixed(1)} / 5</span> : null}
            </div>
          </div>
        </div>

        <div className="grid min-w-0 gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_242px] xl:grid-cols-[minmax(0,1fr)_270px]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {displayRating ? <StarRating rating={starCount} /> : null}
              {hotel.provider ? <Badge variant="blue">From {hotel.provider}</Badge> : null}
              {visibleBadges.map((badge) => (
                <Badge key={badge} variant={badge.includes("Price") ? "blue" : "teal"}>
                  {badge}
                </Badge>
              ))}
            </div>

            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-2xl font-extrabold leading-tight tracking-tight text-indigo-950 sm:text-[1.7rem]">
                  {hotel.name}
                </h2>
                <p className="mt-2 flex items-start gap-2 text-sm leading-6 text-slate-600">
                  <MapPin size={16} className="mt-0.5 shrink-0 text-violet-600" />
                  <span>
                    {hotel.location}
                    {hotel.distanceFromCenter ? (
                      <span className="block text-xs font-semibold text-slate-500">{hotel.distanceFromCenter}</span>
                    ) : null}
                  </span>
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2 rounded-2xl border border-indigo-100 bg-indigo-50/80 px-3 py-2 shadow-sm sm:max-w-[172px]">
                <div className="rounded-xl bg-violet-700 px-2.5 py-2 text-sm font-extrabold text-white">{Math.round(hotel.travelConfidenceScore)}</div>
                <div>
                  <div className="text-sm font-extrabold text-indigo-950">Stay score</div>
                  <div className="text-xs font-semibold text-slate-500">Kurioticket signal</div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {hasBreakfast ? <HighlightPill icon={<Utensils size={14} />} label="Breakfast option" tone="amber" /> : null}
              {hasFlexibleCancellation ? <HighlightPill icon={<ShieldCheck size={14} />} label="Flexible cancellation" tone="emerald" /> : null}
              {hasPayLater ? <HighlightPill icon={<CircleDollarSign size={14} />} label="Payment info available" tone="blue" /> : null}
              <HighlightPill icon={<BadgeCheck size={14} />} label="Verified provider" tone="violet" />
            </div>

            {primaryReason ? (
              <p className="mt-4 flex items-start gap-2 rounded-2xl bg-gradient-to-r from-indigo-50 to-violet-50 px-3 py-2.5 text-sm font-medium leading-6 text-indigo-950 ring-1 ring-indigo-100/70">
                <Sparkles size={16} className="mt-0.5 shrink-0 text-violet-600" />
                {primaryReason}
              </p>
            ) : null}

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
              <div className="flex items-start gap-2 text-sm text-slate-700">
                <BedDouble size={17} className="mt-0.5 shrink-0 text-violet-600" />
                <div>
                  <div className="font-extrabold text-slate-950">{hotel.roomType || "Room details from provider"}</div>
                  <div className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                    {hotel.cancellationInfo || "Confirm policy before booking"}
                  </div>
                </div>
              </div>
            </div>

            {topAmenities.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {topAmenities.map((amenity) => (
                  <span key={amenity} className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                    <CheckCircle2 size={13} className="text-violet-600" />
                    {amenity}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex flex-col rounded-3xl border border-indigo-100 bg-gradient-to-b from-white via-white to-violet-50/70 p-4 shadow-[0_18px_50px_-36px_rgba(67,56,202,0.75)] lg:text-right">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Total stay estimate</div>
            <div className="mt-1 text-3xl font-black tracking-tight text-indigo-950 sm:text-4xl">
              {formatCurrency(hotel.totalPrice, hotel.currency)}
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-600">
              {formatCurrency(hotel.pricePerNight, hotel.currency)} per night
            </div>
            <div className="mt-3 rounded-2xl bg-emerald-50 px-3 py-2 text-left text-xs font-bold leading-5 text-emerald-700 ring-1 ring-emerald-100">
              Taxes, fees, availability, and booking terms are confirmed by the provider.
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center lg:grid-cols-1">
              <MiniScore label="Value" score={hotel.valueScore} />
              <MiniScore label="Ease" score={hotel.arrivalSuitabilityScore} />
              <MiniScore label="Trust" score={hotel.travelConfidenceScore} />
            </div>
            <Button
              variant="primary"
              size="lg"
              className="mt-4 w-full rounded-2xl bg-violet-700 shadow-lg shadow-violet-700/20 hover:bg-violet-800"
              onClick={redirectToHotel}
            >
              View deal
              <ChevronRight size={18} />
            </Button>
            <p className="mt-3 flex items-start gap-2 text-left text-xs leading-5 text-slate-600 lg:justify-end lg:text-right">
              <ShieldCheck size={14} className="mt-0.5 shrink-0 text-violet-600" />
              <span>Redirects to the provider so you can review final availability and complete booking.</span>
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

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 ring-1 ring-amber-100">
      {Array.from({ length: rating }).map((_, index) => (
        <Star key={index} size={12} className="fill-amber-400 text-amber-400" />
      ))}
      <span className="ml-1">{rating}-star</span>
    </span>
  );
}

function HighlightPill({ icon, label, tone }: { icon: ReactNode; label: string; tone: "amber" | "blue" | "emerald" | "violet" }) {
  const tones = {
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
    blue: "bg-blue/10 text-blue ring-blue/10",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    violet: "bg-violet-50 text-violet-700 ring-violet-100",
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-extrabold ring-1 ${tones[tone]}`}>
      {icon}
      {label}
    </span>
  );
}

function hasTextMatch(values: string[], pattern: RegExp) {
  return values.some((value) => pattern.test(value));
}
