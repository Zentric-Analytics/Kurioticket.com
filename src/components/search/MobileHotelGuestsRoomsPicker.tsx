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
    const disabled = decreasing ? value <= min : value >= max;
    return <button type="button" aria-label={decreasing ? decreaseLabel : increaseLabel} disabled={disabled} onClick={() => onChange(decreasing ? Math.max(min, value - 1) : Math.min(max, value + 1))} className={cn("focus-ring flex h-11 w-11 items-center justify-center rounded-full disabled:text-slate-300", compact ? "border-0" : "border border-slate-400 bg-white disabled:border-slate-200")}>
      <span className={cn("flex items-center justify-center rounded-full border bg-white", compact ? "h-9 w-9" : "h-full w-full", compact ? (disabled ? "border-slate-200 text-slate-300" : "border-[#075EE8] text-[#075EE8]") : "border-slate-400")}>
        {decreasing ? <Minus aria-hidden="true" className={compact ? "h-4 w-4" : "h-[18px] w-[18px]"} /> : <Plus aria-hidden="true" className={compact ? "h-4 w-4" : "h-[18px] w-[18px]"} />}
      </span>
    </button>;
  };

  return <div className={cn("flex shrink-0 items-center", compact ? "gap-2" : "gap-3")}>
    {control("decrease")}
    <span className={cn("min-w-7 text-center font-bold tabular-nums", compact ? "text-[15px]" : "text-[18px]")}>{value}</span>
    {control("increase")}
  </div>;
}

function Row({ icon, label, description, counter, compact }: { icon: ReactNode; label: string; description: string; counter: ReactNode; compact: boolean }) {
  return <div className={cn("flex items-center", compact ? "min-h-[80px] gap-2.5 px-3.5" : "min-h-[104px] gap-3 px-4")}>
    <span className={cn("flex shrink-0 items-center justify-center rounded-full", compact ? "h-10 w-10 bg-[#075EE8]/[0.06] text-[#075EE8]" : "h-[52px] w-[52px] bg-slate-100 text-slate-800")}>{icon}</span>
    <span className="min-w-0 flex-1">
      <span className={cn("block font-bold text-slate-950", compact ? "text-[14px]" : "text-[16px]")}>{label}</span>
      <span className={cn("block font-medium text-slate-600", compact ? "mt-0.5 text-[12px] leading-[16px]" : "mt-1 text-[13px]")}>{description}</span>
    </span>
    {counter}
  </div>;
}

export function MobileHotelGuestsRoomsPicker({ adults, children, rooms, petFriendly, strings, density = "default", onAdultsChange, onChildrenChange, onRoomsChange, onPetFriendlyChange }: Props) {
  const compact = density === "compact";
  const guestIconClassName = compact ? "h-[22px] w-[22px]" : "h-7 w-7";
  return <div className="mx-auto w-full max-w-xl pb-2">
    <section aria-labelledby="mobile-hotel-guests-heading">
      <h3 id="mobile-hotel-guests-heading" className={cn("text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600", compact ? "mb-3" : "mb-4")}>{strings.guests}</h3>
      <div className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <Row compact={compact} icon={<UserRound aria-hidden="true" className={guestIconClassName} />} label={strings.adults} description={strings.adultDescription} counter={<Counter value={adults} min={1} max={12 - children} onChange={onAdultsChange} decreaseLabel={strings.decrease(strings.adults)} increaseLabel={strings.increase(strings.adults)} compact={compact} />} />
        <Row compact={compact} icon={<Baby aria-hidden="true" className={guestIconClassName} />} label={strings.children} description={strings.childDescription} counter={<Counter value={children} min={0} max={12 - adults} onChange={onChildrenChange} decreaseLabel={strings.decrease(strings.children)} increaseLabel={strings.increase(strings.children)} compact={compact} />} />
      </div>
    </section>
    <section aria-labelledby="mobile-hotel-rooms-heading" className={compact ? "mt-4" : "mt-7"}>
      <h3 id="mobile-hotel-rooms-heading" className={cn("text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600", compact ? "mb-3" : "mb-4")}>{strings.rooms}</h3>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white"><Row compact={compact} icon={<BedDouble aria-hidden="true" className={guestIconClassName} />} label={strings.rooms} description={strings.roomDescription} counter={<Counter value={rooms} min={1} max={6} onChange={onRoomsChange} decreaseLabel={strings.decrease(strings.rooms)} increaseLabel={strings.increase(strings.rooms)} compact={compact} />} /></div>
    </section>
    <div className={cn("flex items-center rounded-xl border border-slate-200 bg-white", compact ? "mt-4 min-h-[70px] gap-2.5 px-3.5" : "mt-5 min-h-[88px] gap-3 px-4")}>
      <span className={cn("flex shrink-0 items-center justify-center rounded-full", compact ? "h-10 w-10 bg-[#075EE8]/[0.06]" : "h-[52px] w-[52px] bg-slate-100")}><PawPrint aria-hidden="true" className={cn(compact ? "h-5 w-5 text-[#075EE8]" : "h-[22px] w-[22px] text-slate-700")} /></span>
      <span className="min-w-0 flex-1"><span className={cn("block font-bold text-slate-950", compact ? "text-[14px]" : "text-[15px]")}>{strings.petFriendly}</span><span className={cn("block text-[12px] font-medium text-slate-600", compact ? "mt-0.5 leading-[16px]" : "mt-1")}>{strings.petDescription}</span></span>
      <button type="button" role="switch" aria-checked={petFriendly} aria-label={strings.petFriendly} onClick={() => onPetFriendlyChange(!petFriendly)} className={cn("focus-ring relative flex h-11 shrink-0 items-center justify-center", compact ? "w-[46px]" : "w-[52px]")}>
        <span className={cn("relative block rounded-full transition-colors", compact ? "h-[26px] w-[46px]" : "h-[30px] w-[52px]", petFriendly ? "bg-[#075EE8]" : "bg-slate-200")}><span className={cn("absolute top-[3px] rounded-full bg-white shadow-sm", compact ? "h-5 w-5" : "h-6 w-6", petFriendly ? "end-[3px]" : "start-[3px]")} /></span>
      </button>
    </div>
  </div>;
}
