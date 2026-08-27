import { Award, Bed, Laptop, Sparkles, UtensilsCrossed, Wifi, Wine, type LucideIcon } from "lucide-react";
import type { HotelAmenityPresentationItem } from "@/components/results/hotelAmenityPresentation";

function iconFor(item: HotelAmenityPresentationItem): LucideIcon {
  if (item.iconKey === "wifi") return Wifi;
  if (item.iconKey === "restaurant") return UtensilsCrossed;
  if (item.iconKey === "workspace") return Laptop;
  if (/bar|lounge/i.test(item.label)) return Wine;
  if (/bed|room/i.test(item.label)) return Bed;
  return Sparkles;
}

export function HotelAboutSection({ description, amenities, starRating, roomSummary, bedSummary, accessibility = [] }: { description: string; amenities: HotelAmenityPresentationItem[]; starRating: number | null; roomSummary?: string; bedSummary?: string; accessibility?: string[] }) {
  const highlights = amenities.slice(0, 6);
  const remainingAmenities = amenities.slice(6);
  return (
    <section id="hotel-about" className="scroll-mt-16 border-b border-slate-200 px-4 py-8 lg:px-0 lg:py-10" aria-labelledby="hotel-about-heading" data-hotel-about-section>
      <h2 id="hotel-about-heading" className="text-xl font-extrabold tracking-tight text-slate-950">About this hotel</h2>
      {description ? <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p> : <p className="mt-3 text-sm text-slate-600">A property description is not available yet.</p>}

      <h3 className="mt-7 text-base font-bold text-slate-950">Property highlights</h3>
      {highlights.length ? <div className="mt-3 grid grid-cols-2 gap-2.5 lg:grid-cols-3" data-property-highlights>{highlights.map((item) => { const Icon = iconFor(item); return <div key={item.key} className="flex min-h-14 min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"><Icon className="h-[18px] w-[18px] shrink-0 text-blue" aria-hidden="true" /><span className="text-sm font-semibold text-slate-800">{item.label}</span></div>; })}</div> : <p className="mt-2 text-sm text-slate-600">Property highlights are not available yet.</p>}

      <h3 className="mt-7 text-base font-bold text-slate-950">All amenities</h3>
      {remainingAmenities.length ? <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 text-sm text-slate-700 lg:grid-cols-3">{remainingAmenities.map((item) => <li key={item.key} className="flex items-start gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue" aria-hidden="true" />{item.label}</li>)}</ul> : <p className="mt-2 text-sm text-slate-600">All available amenities are shown in Property highlights.</p>}

      <h3 className="mt-7 text-base font-bold text-slate-950">Room &amp; comfort</h3>
      <div className="mt-3 space-y-3 text-sm text-slate-700">
        {roomSummary ? <p className="flex items-start gap-3"><Bed className="mt-0.5 h-[18px] w-[18px] shrink-0 text-slate-500" aria-hidden="true" /><span>{roomSummary}</span></p> : null}
        {bedSummary ? <p className="flex items-start gap-3"><Bed className="mt-0.5 h-[18px] w-[18px] shrink-0 text-slate-500" aria-hidden="true" /><span>{bedSummary}</span></p> : null}
        {!roomSummary && !bedSummary ? <p>Room details are confirmed when you choose a room.</p> : null}
      </div>

      <h3 className="mt-7 text-base font-bold text-slate-950">Hotel information</h3>
      <p className="mt-3 flex items-center gap-3 text-sm text-slate-700"><Award className="h-[18px] w-[18px] shrink-0 text-slate-500" aria-hidden="true" />{starRating ? `${starRating}-star hotel` : "Hotel classification is not available."}</p>

      <h3 className="mt-7 text-base font-bold text-slate-950">Accessibility</h3>
      {accessibility.length ? <ul className="mt-3 list-disc space-y-2 ps-5 text-sm leading-6 text-slate-700">{accessibility.map((detail) => <li key={detail}>{detail}</li>)}</ul> : <p className="mt-3 text-sm leading-6 text-slate-600">Specific accessibility features should be confirmed before booking.</p>}
    </section>
  );
}
