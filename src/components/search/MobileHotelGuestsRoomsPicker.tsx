"use client";

import { type ReactNode } from "react";
import { Baby, BedDouble, Minus, PawPrint, Plus, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

export type MobileHotelGuestsRoomsStrings = {
  guests: string; adults: string; adultDescription: string; children: string; childDescription: string;
  rooms: string; roomDescription: string; petFriendly: string; petDescription: string;
  decrease: (label: string) => string; increase: (label: string) => string;
};

type Props = { adults: number; children: number; rooms: number; petFriendly: boolean; strings: MobileHotelGuestsRoomsStrings;
  density?: "default" | "compact";
  onAdultsChange: (value: number) => void; onChildrenChange: (value: number) => void; onRoomsChange: (value: number) => void; onPetFriendlyChange: (value: boolean) => void; };

function Counter({ value, min, max, onChange, decreaseLabel, increaseLabel, compact }: { value: number; min: number; max: number; onChange: (value: number) => void; decreaseLabel: string; increaseLabel: string; compact: boolean }) {
  const control = (kind: "decrease" | "increase") => {
    const decreasing = kind === "decrease";
    return <button type="button" aria-label={decreasing ? decreaseLabel : increaseLabel} disabled={decreasing ? value <= min : value >= max} onClick={() => onChange(decreasing ? Math.max(min, value - 1) : Math.min(max, value + 1))} className={cn("focus-ring flex h-11 w-11 items-center justify-center rounded-full disabled:text-slate-300", compact ? "border-0" : "border border-slate-400 bg-white disabled:border-slate-200")}>
      <span className={cn("flex items-center justify-center rounded-full border border-slate-400 bg-white disabled:border-slate-200", compact ? "h-[38px] w-[38px]" : "h-full w-full")}>
        {decreasing ? <Minus aria-hidden="true" className={compact ? "h-4 w-4" : "h-[18px] w-[18px]"} /> : <Plus aria-hidden="true" className={compact ? "h-4 w-4" : "h-[18px] w-[18px]"} />}
      </span>
    </button>;
  };

  return <div className={cn("flex shrink-0 items-center", compact ? "gap-2" : "gap-3")}>
    {control("decrease")}
    <span className={cn("min-w-7 text-center font-bold tabular-nums", compact ? "text-[16px]" : "text-[18px]")}>{value}</span>
    {control("increase")}
  </div>;
}

function Row({ icon, label, description, counter, compact }: { icon: ReactNode; label: string; description: string; counter: ReactNode; compact: boolean }) {
  return <div className={cn("flex items-center", compact ? "min-h-[86px] gap-2.5 px-3.5" : "min-h-[104px] gap-3 px-4")}>
    <span className={cn("flex shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-800", compact ? "h-11 w-11" : "h-[52px] w-[52px]")}>{icon}</span>
    <span className="min-w-0 flex-1">
      <span className={cn("block font-bold text-slate-950", compact ? "text-[15px]" : "text-[16px]")}>{label}</span>
      <span className={cn("block font-medium text-slate-600", compact ? "mt-0.5 text-[12px] leading-[16px]" : "mt-1 text-[13px]")}>{description}</span>
    </span>
    {counter}
  </div>;
}

export function MobileHotelGuestsRoomsPicker({ adults, children, rooms, petFriendly, strings, density = "default", onAdultsChange, onChildrenChange, onRoomsChange, onPetFriendlyChange }: Props) {
  const compact = density === "compact";
  const guestIconClassName = compact ? "h-6 w-6" : "h-7 w-7";
  return <div className="mx-auto w-full max-w-xl pb-2">
    <section aria-labelledby="mobile-hotel-guests-heading">
      <h3 id="mobile-hotel-guests-heading" className={cn("text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600", compact ? "mb-3" : "mb-4")}>{strings.guests}</h3>
      <div className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <Row compact={compact} icon={<UserRound aria-hidden="true" className={guestIconClassName} />} label={strings.adults} description={strings.adultDescription} counter={<Counter value={adults} min={1} max={12 - children} onChange={onAdultsChange} decreaseLabel={strings.decrease(strings.adults)} increaseLabel={strings.increase(strings.adults)} compact={compact} />} />
        <Row compact={compact} icon={<Baby aria-hidden="true" className={guestIconClassName} />} label={strings.children} description={strings.childDescription} counter={<Counter value={children} min={0} max={12 - adults} onChange={onChildrenChange} decreaseLabel={strings.decrease(strings.children)} increaseLabel={strings.increase(strings.children)} compact={compact} />} />
      </div>
    </section>
    <section aria-labelledby="mobile-hotel-rooms-heading" className={compact ? "mt-5" : "mt-7"}>
      <h3 id="mobile-hotel-rooms-heading" className={cn("text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600", compact ? "mb-3" : "mb-4")}>{strings.rooms}</h3>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white"><Row compact={compact} icon={<BedDouble aria-hidden="true" className={guestIconClassName} />} label={strings.rooms} description={strings.roomDescription} counter={<Counter value={rooms} min={1} max={6} onChange={onRoomsChange} decreaseLabel={strings.decrease(strings.rooms)} increaseLabel={strings.increase(strings.rooms)} compact={compact} />} /></div>
    </section>
    <div className={cn("flex items-center rounded-xl border border-slate-200 bg-white", compact ? "mt-4 min-h-[74px] gap-2.5 px-3.5" : "mt-5 min-h-[88px] gap-3 px-4")}>
      <span className={cn("flex shrink-0 items-center justify-center rounded-full bg-slate-100", compact ? "h-11 w-11" : "h-[52px] w-[52px]")}><PawPrint aria-hidden="true" className={cn("text-slate-700", compact ? "h-5 w-5" : "h-[22px] w-[22px]")} /></span>
      <span className="min-w-0 flex-1"><span className={cn("block font-bold text-slate-950", compact ? "text-[14px]" : "text-[15px]")}>{strings.petFriendly}</span><span className={cn("block text-[12px] font-medium text-slate-600", compact ? "mt-0.5 leading-[16px]" : "mt-1")}>{strings.petDescription}</span></span>
      <button type="button" role="switch" aria-checked={petFriendly} aria-label={strings.petFriendly} onClick={() => onPetFriendlyChange(!petFriendly)} className={cn("focus-ring relative flex shrink-0 items-center justify-center", compact ? "h-11 w-[46px]" : "h-[30px] w-[52px]")}>
        <span className={cn("relative block rounded-full transition-colors", compact ? "h-[26px] w-[46px]" : "h-[30px] w-[52px]", petFriendly ? "bg-[#075ee8]" : "bg-slate-200")}><span className={cn("absolute rounded-full bg-white shadow-sm transition-transform", compact ? "top-[3px] h-5 w-5" : "top-[3px] h-6 w-6", petFriendly ? (compact ? "translate-x-[23px] rtl:-translate-x-[23px]" : "translate-x-[25px] rtl:-translate-x-[25px]") : "translate-x-[3px] rtl:-translate-x-[3px]")} /></span>
      </button>
    </div>
  </div>;
}
