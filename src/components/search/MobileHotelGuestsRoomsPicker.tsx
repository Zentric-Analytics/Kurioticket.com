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
  onAdultsChange: (value: number) => void; onChildrenChange: (value: number) => void; onRoomsChange: (value: number) => void; onPetFriendlyChange: (value: boolean) => void; };

function Counter({ value, min, max, onChange, decreaseLabel, increaseLabel }: { value: number; min: number; max: number; onChange: (value: number) => void; decreaseLabel: string; increaseLabel: string }) {
  return <div className="flex shrink-0 items-center gap-3"><button type="button" aria-label={decreaseLabel} disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))} className="focus-ring flex h-11 w-11 items-center justify-center rounded-full border border-slate-400 bg-white disabled:border-slate-200 disabled:text-slate-300"><Minus aria-hidden="true" className="h-[18px] w-[18px]" /></button>
    <span className="min-w-7 text-center text-[18px] font-bold tabular-nums">{value}</span>
    <button type="button" aria-label={increaseLabel} disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))} className="focus-ring flex h-11 w-11 items-center justify-center rounded-full border border-slate-400 bg-white disabled:border-slate-200 disabled:text-slate-300"><Plus aria-hidden="true" className="h-[18px] w-[18px]" /></button></div>;
}

function Row({ icon, label, description, counter }: { icon: ReactNode; label: string; description: string; counter: ReactNode }) {
  return <div className="flex min-h-[104px] items-center gap-3 px-4"><span className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-800">{icon}</span>
    <span className="min-w-0 flex-1"><span className="block text-[16px] font-bold text-slate-950">{label}</span><span className="mt-1 block text-[13px] font-medium text-slate-600">{description}</span></span>{counter}</div>;
}

export function MobileHotelGuestsRoomsPicker({ adults, children, rooms, petFriendly, strings, onAdultsChange, onChildrenChange, onRoomsChange, onPetFriendlyChange }: Props) {
  return <div className="mx-auto w-full max-w-xl pb-2">
    <section aria-labelledby="mobile-hotel-guests-heading"><h3 id="mobile-hotel-guests-heading" className="mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">{strings.guests}</h3>
      <div className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <Row icon={<UserRound aria-hidden="true" className="h-7 w-7" />} label={strings.adults} description={strings.adultDescription} counter={<Counter value={adults} min={1} max={12 - children} onChange={onAdultsChange} decreaseLabel={strings.decrease(strings.adults)} increaseLabel={strings.increase(strings.adults)} />} />
        <Row icon={<Baby aria-hidden="true" className="h-7 w-7" />} label={strings.children} description={strings.childDescription} counter={<Counter value={children} min={0} max={12 - adults} onChange={onChildrenChange} decreaseLabel={strings.decrease(strings.children)} increaseLabel={strings.increase(strings.children)} />} />
      </div></section>
    <section aria-labelledby="mobile-hotel-rooms-heading" className="mt-7"><h3 id="mobile-hotel-rooms-heading" className="mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">{strings.rooms}</h3>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white"><Row icon={<BedDouble aria-hidden="true" className="h-7 w-7" />} label={strings.rooms} description={strings.roomDescription} counter={<Counter value={rooms} min={1} max={6} onChange={onRoomsChange} decreaseLabel={strings.decrease(strings.rooms)} increaseLabel={strings.increase(strings.rooms)} />} /></div>
    </section>
    <div className="mt-5 flex min-h-[88px] items-center gap-3 rounded-xl border border-slate-200 bg-white px-4"><span className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-slate-100"><PawPrint aria-hidden="true" className="h-[22px] w-[22px] text-slate-700" /></span>
      <span className="min-w-0 flex-1"><span className="block text-[15px] font-bold text-slate-950">{strings.petFriendly}</span><span className="mt-1 block text-[12px] font-medium text-slate-600">{strings.petDescription}</span></span>
      <button type="button" role="switch" aria-checked={petFriendly} aria-label={strings.petFriendly} onClick={() => onPetFriendlyChange(!petFriendly)} className={cn("focus-ring relative h-[30px] w-[52px] shrink-0 rounded-full transition-colors", petFriendly ? "bg-[#075ee8]" : "bg-slate-200")}><span className={cn("absolute top-[3px] h-6 w-6 rounded-full bg-white shadow-sm transition-transform", petFriendly ? "translate-x-[25px] rtl:-translate-x-[25px]" : "translate-x-[3px] rtl:-translate-x-[3px]")} /></button>
    </div>
  </div>;
}
