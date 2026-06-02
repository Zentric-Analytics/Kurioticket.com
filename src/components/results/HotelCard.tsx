"use client";

import Image from "next/image";
import { CheckCircle2, MapPin, ShieldCheck, Sparkles, Star } from "lucide-react";
import type { PublicHotelResult } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/utils";

const hotelFallbackImages = [
  "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1200&q=88",
  "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1200&q=88",
  "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1200&q=88",
  "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=88",
  "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=88",
];

const genericHotelFallbackSources = new Set([
  "photo-1566073771259-6a8506099945",
  "photo-1551882547-ff40c63fe5fa",
  "photo-1582719508461-905c673771fd",
  "photo-1590490360182-c33d57733427",
  "photo-1520250497591-112f2f40a3f4",
  "photo-1578683010236-d716f9a3f461",
]);

type HotelImageFields = PublicHotelResult & {
  image?: string;
  thumbnail?: string;
  photos?: Array<{ url?: string }>;
};

function getHotelImage(hotel: PublicHotelResult, index: number) {
  const hotelWithImageFields = hotel as HotelImageFields;
  const candidates = [
    hotelWithImageFields.image,
    hotelWithImageFields.imageUrl,
    hotelWithImageFields.thumbnail,
    hotelWithImageFields.photos?.[0]?.url,
  ];
  const hotelSpecificImage = candidates.find(
    (candidate) => typeof candidate === "string" && candidate.trim() && !isGenericHotelFallback(candidate),
  );

  return hotelSpecificImage || hotelFallbackImages[index % hotelFallbackImages.length];
}

function isGenericHotelFallback(imageUrl: string) {
  return Array.from(genericHotelFallbackSources).some((sourceId) => imageUrl.includes(sourceId));
}

export function HotelCard({ hotel, index }: { hotel: PublicHotelResult; index: number }) {
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
  const imageUrl = getHotelImage(hotel, index);

  return (
    <Card className="group overflow-hidden rounded-[1.4rem] border-indigo-100/80 bg-white shadow-[0_22px_70px_-42px_rgba(49,46,129,0.7)] transition duration-200 hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-[0_28px_80px_-42px_rgba(67,56,202,0.75)]">
      <div className="grid lg:grid-cols-[258px_minmax(0,1fr)] xl:grid-cols-[270px_minmax(0,1fr)]">
        <div className="p-3 pb-0 lg:pb-3 lg:pr-0">
          <div className="relative aspect-[16/10] min-h-[230px] overflow-hidden rounded-[1.15rem] bg-indigo-50 lg:h-[216px] lg:min-h-0">
            <Image
              src={imageUrl}
              alt={`${hotel.name} stay option${hotel.location ? ` near ${hotel.location}` : ""}`}
              fill
              className="object-cover transition duration-500 group-hover:scale-[1.035]"
              sizes="(min-width: 1280px) 240px, (min-width: 1024px) 28vw, 100vw"
            />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-indigo-950/35 to-transparent" />
            {hotel.badges[0] ? (
              <div className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-indigo-950 shadow-sm backdrop-blur">
                {hotel.badges[0]}
              </div>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 p-4 sm:p-5 xl:grid-cols-[minmax(0,1fr)_204px]">
          <div className="min-w-0 py-0.5">
            <div className="flex flex-wrap items-center gap-1.5">
              {displayRating ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-[12px] font-bold leading-none text-violet-800">
                  <Star size={12} className="fill-violet-600 text-violet-600" />
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

            <h2 className="mt-2.5 break-words text-[21px] font-extrabold leading-[1.18] tracking-tight text-indigo-950 sm:text-[22px]">{hotel.name}</h2>
            <p className="mt-1.5 flex items-start gap-1.5 text-[14px] font-medium leading-5 text-slate-600">
              <MapPin size={15} className="mt-0.5 shrink-0 text-violet-600" />
              <span>
                {hotel.location}
                {hotel.distanceFromCenter ? <span className="block text-[12px] font-semibold leading-5 text-slate-500">{hotel.distanceFromCenter}</span> : null}
              </span>
            </p>

            {primaryReason ? (
              <p className="mt-3 flex items-start gap-2 rounded-xl border border-indigo-100 bg-indigo-50/70 px-3 py-2 text-[14px] font-medium leading-5 text-indigo-950">
                <Sparkles size={15} className="mt-0.5 shrink-0 text-violet-600" />
                {primaryReason}
              </p>
            ) : null}

            <div className="mt-3 grid gap-2 text-[13px] leading-5 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                <div className="text-[11px] font-bold uppercase leading-none tracking-[0.08em] text-slate-500">Room</div>
                <div className="mt-1.5 font-semibold text-slate-900">{hotel.roomType || "Room details from provider"}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                <div className="text-[11px] font-bold uppercase leading-none tracking-[0.08em] text-slate-500">Policy</div>
                <div className="mt-1.5 font-semibold text-slate-900">{hotel.cancellationInfo || "Confirm before booking"}</div>
              </div>
            </div>

            {topAmenities.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {topAmenities.map((amenity) => (
                  <span key={amenity} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[12px] font-semibold leading-4 text-slate-700">
                    <CheckCircle2 size={12} className="text-violet-600" />
                    {amenity}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex flex-col rounded-xl border border-indigo-100 bg-gradient-to-b from-white via-white to-violet-50/70 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] xl:text-right">
            <div className="text-[11px] font-bold uppercase leading-none tracking-[0.08em] text-slate-500">Total stay</div>
            <div className="mt-1.5 text-[32px] font-black leading-none tracking-tight text-indigo-950 xl:text-[34px]">{formatCurrency(hotel.totalPrice, hotel.currency)}</div>
            <div className="mt-1.5 text-[13px] font-bold leading-5 text-violet-700">{formatCurrency(hotel.pricePerNight, hotel.currency)} per night</div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center xl:grid-cols-1">
              <MiniScore label="Value" score={hotel.valueScore} />
              <MiniScore label="Ease" score={hotel.arrivalSuitabilityScore} />
              <MiniScore label="Trust" score={hotel.travelConfidenceScore} />
            </div>
            <Button variant="primary" size="lg" className="mt-4 min-h-11 w-full rounded-xl bg-violet-700 text-[15px] font-extrabold shadow-[0_16px_35px_-18px_rgba(109,40,217,0.9)] hover:bg-violet-800" onClick={redirectToHotel}>
              View deal
            </Button>
            <p className="mt-3 flex items-start gap-2 text-left text-[12px] leading-5 text-slate-600 xl:justify-end xl:text-right">
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
      <div className="text-[15px] font-extrabold leading-5 text-indigo-950">{normalized}</div>
      <div className="text-[10px] font-semibold uppercase leading-4 tracking-wide text-slate-500">{label}</div>
    </div>
  );
}
