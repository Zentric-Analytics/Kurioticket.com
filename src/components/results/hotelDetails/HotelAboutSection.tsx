"use client";

import { Award, Bed, ChevronDown, ChevronUp, Laptop, Sparkles, UtensilsCrossed, Wifi, Wine, type LucideIcon } from "lucide-react";
import { useState } from "react";
import type { HotelAmenityPresentationItem } from "@/components/results/hotelAmenityPresentation";

function iconFor(item: HotelAmenityPresentationItem): LucideIcon {
  if (item.iconKey === "wifi") return Wifi;
  if (item.iconKey === "restaurant") return UtensilsCrossed;
  if (item.iconKey === "workspace") return Laptop;
  if (/bar|lounge/i.test(item.label)) return Wine;
  if (/bed|room/i.test(item.label)) return Bed;
  return Sparkles;
}

export function HotelAboutSection({ description, amenities, starRating, bedSummary }: { description: string; amenities: HotelAmenityPresentationItem[]; starRating: number | null; bedSummary?: string }) {
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [amenitiesExpanded, setAmenitiesExpanded] = useState(false);
  const canExpandDescription = description.length > 220;
  const facts = amenities.slice(0, amenitiesExpanded ? amenities.length : 5);
  return (
    <section className="mx-4 mt-4 rounded-[18px] border border-slate-200 bg-white p-[18px] lg:mx-0 lg:mt-5 lg:p-5" aria-labelledby="hotel-about-heading" data-hotel-about-section>
      <h2 id="hotel-about-heading" className="text-xl font-extrabold tracking-tight text-slate-950">About this hotel</h2>
      {description ? <><p className={`mt-3 text-sm leading-6 text-slate-600 ${descriptionExpanded ? "" : "line-clamp-4"}`}>{description}</p>{canExpandDescription ? <button type="button" aria-expanded={descriptionExpanded} onClick={() => setDescriptionExpanded((value) => !value)} className="focus-ring mt-1 inline-flex min-h-11 items-center gap-1 text-sm font-bold text-blue">{descriptionExpanded ? "Show less" : "More"}{descriptionExpanded ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}</button> : null}</> : null}
      <h3 className="mt-5 text-base font-bold text-slate-950">At a glance</h3>
      <div className="mt-2 grid grid-cols-2 gap-x-4 lg:grid-cols-3" data-hotel-at-a-glance>
        {facts.map((item) => { const Icon = iconFor(item); return <div key={item.key} className="flex min-h-12 min-w-0 items-center gap-3 border-b border-slate-100 text-sm font-medium text-slate-800"><Icon className="h-[18px] w-[18px] shrink-0 text-slate-600" aria-hidden="true" /><span>{item.label}</span></div>; })}
        {bedSummary ? <div className="flex min-h-12 min-w-0 items-center gap-3 border-b border-slate-100 text-sm font-medium text-slate-800"><Bed className="h-[18px] w-[18px] shrink-0 text-slate-600" aria-hidden="true" /><span>{bedSummary}</span></div> : null}
        {starRating ? <div className="flex min-h-12 min-w-0 items-center gap-3 border-b border-slate-100 text-sm font-medium text-slate-800"><Award className="h-[18px] w-[18px] shrink-0 text-slate-600" aria-hidden="true" /><span>{starRating}-star hotel</span></div> : null}
      </div>
      {amenities.length > 5 ? <button type="button" aria-expanded={amenitiesExpanded} onClick={() => setAmenitiesExpanded((value) => !value)} className="focus-ring mt-3 inline-flex min-h-11 items-center text-sm font-bold text-blue">{amenitiesExpanded ? "Show fewer amenities" : "See all amenities"}</button> : null}
    </section>
  );
}
